import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, X, Send, MessageSquare, Bug, Lightbulb, AlertCircle, HelpCircleIcon, Camera, Trash2, Undo, Check, ArrowRight, Paperclip, FileText, Image, XCircle } from 'lucide-react';
import { feedbackService } from '../services/feedbackService';
import html2canvas from 'html2canvas';

const ROTATING_PHRASES = [
  "Need a new feature?",
  "Give us your suggestions",
  "Have an idea?",
  "Report an issue",
  "We're listening",
  "Help us improve"
];

const FEEDBACK_TYPES = [
  { id: 'suggestion', label: 'Suggestion', icon: Lightbulb, color: 'text-amber-500' },
  { id: 'feature_request', label: 'Feature Request', icon: MessageSquare, color: 'text-blue-500' },
  { id: 'bug_report', label: 'Bug Report', icon: Bug, color: 'text-red-500' },
  { id: 'complaint', label: 'Complaint', icon: AlertCircle, color: 'text-orange-500' },
  { id: 'other', label: 'Other', icon: HelpCircleIcon, color: 'text-slate-500' },
];

interface Annotation {
  x: number;
  y: number;
  type: 'circle' | 'rectangle' | 'arrow' | 'text';
  text?: string;
  endX?: number;
  endY?: number;
}

export const HelpButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // File attachment state
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rotating phrases state
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [showPhrase, setShowPhrase] = useState(false);

  // Rotate phrases every 6 seconds
  useEffect(() => {
    const showTimer = setInterval(() => {
      setShowPhrase(true);
      // Hide after 5 seconds
      setTimeout(() => {
        setShowPhrase(false);
        // Move to next phrase after hiding (1 second transition)
        setTimeout(() => {
          setCurrentPhraseIndex((prev) => (prev + 1) % ROTATING_PHRASES.length);
        }, 1000);
      }, 3000);
    }, 4000);

    // Show first phrase after 3 seconds
    const initialTimer = setTimeout(() => {
      setShowPhrase(true);
      setTimeout(() => setShowPhrase(false), 5000);
    }, 3000);

    return () => {
      clearInterval(showTimer);
      clearTimeout(initialTimer);
    };
  }, []);

  // Screenshot state
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [finalScreenshot, setFinalScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [currentTool, setCurrentTool] = useState<'circle' | 'rectangle' | 'arrow' | 'text'>('rectangle');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [annotationText, setAnnotationText] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const captureScreenshot = async () => {
    setIsCapturing(true);
    try {
      // Hide the help buttons during capture
      const helpButtons = document.querySelectorAll('.help-button-container');
      helpButtons.forEach(el => (el as HTMLElement).style.display = 'none');

      const canvas = await html2canvas(document.body, {
        ignoreElements: (element) => {
          return element.classList.contains('help-button-container') ||
            element.classList.contains('feedback-modal');
        },
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      const dataUrl = canvas.toDataURL('image/png');
      setScreenshot(dataUrl);
      setIsAnnotating(true);
      setIsOpen(true);

      // Restore help buttons
      helpButtons.forEach(el => (el as HTMLElement).style.display = '');
    } catch (error) {
      console.error('Error capturing screenshot:', error);
      alert('Failed to capture screenshot. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    const { x, y } = getCanvasCoordinates(e);

    if (currentTool === 'text') {
      setTextPosition({ x, y });
      setShowTextInput(true);
      return;
    }

    setIsDrawing(true);
    setStartPos({ x, y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !canvasRef.current) return;

    const { x, y } = getCanvasCoordinates(e);

    drawAnnotations();

    // Draw preview in RED
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;

    if (currentTool === 'circle') {
      const radius = Math.sqrt(Math.pow(x - startPos.x, 2) + Math.pow(y - startPos.y, 2));
      ctx.beginPath();
      ctx.arc(startPos.x, startPos.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    } else if (currentTool === 'rectangle') {
      const width = x - startPos.x;
      const height = y - startPos.y;
      ctx.beginPath();
      ctx.rect(startPos.x, startPos.y, width, height);
      ctx.stroke();
    } else if (currentTool === 'arrow') {
      drawArrow(ctx, startPos.x, startPos.y, x, y);
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPos || !canvasRef.current) return;

    const { x, y } = getCanvasCoordinates(e);

    const newAnnotation: Annotation = {
      x: startPos.x,
      y: startPos.y,
      type: currentTool,
    };

    if (currentTool === 'circle') {
      newAnnotation.x = x;
      newAnnotation.y = y;
    } else if (currentTool === 'rectangle') {
      newAnnotation.endX = x;
      newAnnotation.endY = y;
    }

    setAnnotations([...annotations, newAnnotation]);
    setIsDrawing(false);
    setStartPos(null);
    drawAnnotations();
  };

  const drawArrow = (ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) => {
    const headlen = 15;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fillStyle = '#ef4444';
    ctx.fill();
  };

  const drawAnnotations = () => {
    if (!canvasRef.current || !imageRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clear and redraw image
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.drawImage(imageRef.current, 0, 0);

    // Draw all annotations in RED
    ctx.strokeStyle = '#ef4444';
    ctx.fillStyle = '#ef4444';
    ctx.lineWidth = 4;

    annotations.forEach((ann) => {
      if (ann.type === 'circle') {
        ctx.beginPath();
        ctx.arc(ann.x, ann.y, 40, 0, 2 * Math.PI);
        ctx.stroke();
      } else if (ann.type === 'rectangle' && ann.endX !== undefined && ann.endY !== undefined) {
        const width = ann.endX - ann.x;
        const height = ann.endY - ann.y;
        ctx.beginPath();
        ctx.rect(ann.x, ann.y, width, height);
        ctx.stroke();
      } else if (ann.type === 'arrow' && ann.x && ann.y) {
        // For stored arrows, we'd need end coordinates. 
        // Simplified: draw circle for now
        ctx.beginPath();
        ctx.arc(ann.x, ann.y, 5, 0, 2 * Math.PI);
        ctx.fill();
      } else if (ann.type === 'text' && ann.text) {
        ctx.font = 'bold 28px sans-serif';
        ctx.fillStyle = '#ef4444';
        ctx.fillText(ann.text, ann.x, ann.y);
      }
    });
  };

  const addTextAnnotation = () => {
    if (!textPosition || !annotationText.trim()) return;

    const newAnnotation: Annotation = {
      x: textPosition.x,
      y: textPosition.y,
      type: 'text',
      text: annotationText.trim(),
    };

    setAnnotations([...annotations, newAnnotation]);
    setAnnotationText('');
    setShowTextInput(false);
    setTextPosition(null);
    drawAnnotations();
  };

  const clearAnnotations = () => {
    setAnnotations([]);
    drawAnnotations();
  };

  const undoLastAnnotation = () => {
    setAnnotations(annotations.slice(0, -1));
    drawAnnotations();
  };

  // Finalize the screenshot from the canvas before it unmounts
  const finalizeScreenshot = () => {
    if (canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setFinalScreenshot(dataUrl);
      console.log('Screenshot finalized from canvas, data URL length:', dataUrl.length);
    } else {
      // Fallback to the original screenshot if canvas is gone
      setFinalScreenshot(screenshot);
      console.log('Canvas not available, using original screenshot');
    }
    setIsAnnotating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim() && !screenshot) return;

    setIsSubmitting(true);

    // Convert the finalized screenshot to a blob for upload
    let screenshotBlob: Blob | undefined;
    const screenshotDataUrl = finalScreenshot || screenshot;
    if (screenshotDataUrl) {
      try {
        console.log('Converting screenshot data URL to blob, length:', screenshotDataUrl.length);
        const response = await fetch(screenshotDataUrl);
        screenshotBlob = await response.blob();
        console.log('Blob created, size:', screenshotBlob.size, 'type:', screenshotBlob.type);
      } catch (err) {
        console.error('Error converting screenshot to blob:', err);
        alert('Failed to process screenshot. Please try again.');
        setIsSubmitting(false);
        return;
      }
    }

    const result = await feedbackService.submitFeedback(
      {
        type: selectedType as any,
        message: message.trim() || 'Screenshot attached',
        email: email.trim() || undefined,
      },
      screenshotBlob,
      attachedFile || undefined
    );

    setIsSubmitting(false);

    if (result.success) {
      setIsSuccess(true);
      setMessage('');
      setEmail('');
      setScreenshot(null);
      setFinalScreenshot(null);
      setAnnotations([]);
      setIsAnnotating(false);
      setAttachedFile(null);
      setTimeout(() => {
        setIsSuccess(false);
        setIsOpen(false);
      }, 2000);
    } else {
      alert(`Failed to submit feedback: ${result.error}`);
    }
  };

  useEffect(() => {
    if (isAnnotating && screenshot && canvasRef.current && imageRef.current) {
      imageRef.current.onload = () => {
        if (canvasRef.current && imageRef.current) {
          canvasRef.current.width = imageRef.current.width;
          canvasRef.current.height = imageRef.current.height;
          drawAnnotations();
        }
      };
      imageRef.current.src = screenshot;
    }
  }, [isAnnotating, screenshot]);

  useEffect(() => {
    drawAnnotations();
  }, [annotations]);

  return (
    <>
      {/* Camera Button */}
      <div className="help-button-container">
        <button
          onClick={captureScreenshot}
          disabled={isCapturing}
          className="fixed bottom-24 right-6 z-50 w-12 h-12 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-500 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group print:hidden"
          aria-label="Take Screenshot"
          title="Report an issue with screenshot"
        >
          {isCapturing ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>

      {/* Help Button with Rotating Phrase */}
      <div className="help-button-container">
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 print:hidden">
          {/* Rotating Phrase - Expands from right to left */}
          <div
            className={`overflow-hidden transition-all duration-1000 ease-out ${
              showPhrase ? 'max-w-[320px] opacity-100 translate-x-0' : 'max-w-0 opacity-0 translate-x-4'
            }`}
          >
            <div className="bg-white dark:bg-slate-800 pl-3 pr-4 py-2.5 rounded-full shadow-xl border-l-4 border-amber-500 whitespace-nowrap flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse flex-shrink-0"></span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {ROTATING_PHRASES[currentPhraseIndex]}
              </span>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium ml-1">→</span>
            </div>
          </div>
          <button
            onClick={() => {
              setIsAnnotating(false);
              setScreenshot(null);
              setFinalScreenshot(null);
              setAnnotations([]);
              setIsOpen(true);
            }}
            className="w-14 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
            aria-label="Help & Feedback"
          >
            <HelpCircle className="w-7 h-7 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden feedback-modal">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Content */}
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {isAnnotating ? 'Annotate Screenshot' : 'Help & Feedback'}
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {isAnnotating ? 'Draw on the screenshot to highlight issues' : "We'd love to hear from you!"}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            {/* Success Message */}
            {isSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Send className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                  Thank You!
                </h3>
                <p className="text-slate-600 dark:text-slate-400">
                  Your feedback has been submitted successfully.
                </p>
              </div>
            ) : isAnnotating && screenshot ? (
              <div className="p-6 space-y-4">
                {/* Annotation Toolbar */}
                <div className="flex items-center gap-2 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 mr-2">
                    Tools:
                  </span>
                  <button
                    onClick={() => setCurrentTool('rectangle')}
                    className={`p-2 rounded-lg transition-colors ${currentTool === 'rectangle'
                      ? 'bg-amber-500 text-white'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    title="Rectangle"
                  >
                    <div className="w-4 h-4 border-2 border-current" />
                  </button>
                  <button
                    onClick={() => setCurrentTool('text')}
                    className={`p-2 rounded-lg transition-colors ${currentTool === 'text'
                      ? 'bg-amber-500 text-white'
                      : 'hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    title="Add Text"
                  >
                    <span className="text-sm font-bold">T</span>
                  </button>
                  <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-2" />
                  <button
                    onClick={undoLastAnnotation}
                    disabled={annotations.length === 0}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors"
                    title="Undo"
                  >
                    <Undo className="w-4 h-4" />
                  </button>
                  <button
                    onClick={clearAnnotations}
                    disabled={annotations.length === 0}
                    className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 rounded-lg transition-colors text-red-500"
                    title="Clear All"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => {
                      finalizeScreenshot();
                      setAnnotations([]);
                    }}
                    className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    Skip Annotation
                  </button>
                </div>

                {/* Canvas with Screenshot */}
                <div className="relative overflow-auto max-h-[60vh] border border-slate-200 dark:border-slate-700 rounded-lg">
                  <canvas
                    ref={canvasRef}
                    onMouseDown={handleCanvasMouseDown}
                    onMouseMove={handleCanvasMouseMove}
                    onMouseUp={handleCanvasMouseUp}
                    onMouseLeave={handleCanvasMouseUp}
                    className="cursor-crosshair max-w-full"
                  />
                  <img
                    ref={imageRef}
                    src={screenshot}
                    alt="Screenshot"
                    className="hidden"
                    crossOrigin="anonymous"
                  />
                </div>

                {/* Text Input for Annotations */}
                {showTextInput && textPosition && (
                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <input
                      type="text"
                      value={annotationText}
                      onChange={(e) => setAnnotationText(e.target.value)}
                      placeholder="Enter annotation text..."
                      className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addTextAnnotation();
                        if (e.key === 'Escape') {
                          setShowTextInput(false);
                          setTextPosition(null);
                        }
                      }}
                    />
                    <button
                      onClick={addTextAnnotation}
                      className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Continue to Feedback Form */}
                <div className="flex justify-end">
                  <button
                    onClick={() => finalizeScreenshot()}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg flex items-center gap-2"
                  >
                    Continue to Feedback
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Feedback Type Selection */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">
                    What would you like to share?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {FEEDBACK_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setSelectedType(type.id)}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${selectedType === type.id
                            ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                            }`}
                        >
                          <Icon className={`w-5 h-5 ${type.color}`} />
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 text-center">
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Screenshot Preview */}
                {screenshot && (
                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Screenshot Attached
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAnnotating(true)}
                        className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                      >
                        Edit Annotation
                      </button>
                    </div>
                    <img
                      src={screenshot}
                      alt="Attached screenshot"
                      className="w-full h-32 object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                    />
                  </div>
                )}

                {/* File Attachment */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Attach File <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  
                  {attachedFile ? (
                    <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                      <div className="p-2 bg-amber-100 dark:bg-amber-800/50 rounded-lg">
                        {attachedFile.type.startsWith('image/') ? (
                          <Image className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <FileText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                          {attachedFile.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {(attachedFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAttachedFile(null)}
                        className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all duration-200"
                    >
                      <Paperclip className="w-5 h-5 text-slate-400" />
                      <span className="text-sm text-slate-600 dark:text-slate-400">
                        Click to attach file
                      </span>
                    </button>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && file.size <= 5 * 1024 * 1024) { // 5MB limit
                        setAttachedFile(file);
                      } else if (file) {
                        alert('File size must be less than 5MB');
                      }
                    }}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    className="hidden"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Max file size: 5MB (Images, PDF, Word, Text)
                  </p>
                </div>

                {/* Message Input */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Your Message <span className="text-slate-400 font-normal">{(screenshot || attachedFile) ? '(optional)' : '(required)'}</span>
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Tell us what's on your mind..."
                    required={!screenshot && !attachedFile}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none resize-none"
                  />
                </div>

                {/* Email Input (optional) */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Email <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    We'll only use this to follow up on your feedback
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || (!message.trim() && !screenshot && !attachedFile)}
                  className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Feedback
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};


