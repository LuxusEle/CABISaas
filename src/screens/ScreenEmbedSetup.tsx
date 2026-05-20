import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { FileText, MapPin, Phone, Sparkles, Layout, Layers, Cpu, ArrowRight, CheckCircle2, AlertCircle, Wand2, X, Box } from 'lucide-react';
import { Project } from '../types';
import { Button } from '../components/Button';
import { WallEditModal } from '../components/WallEditModal';
import { WallLimitsModal } from '../components/WallLimitsModal';
import { createNewProject } from '../services/bomService';
import { supabase } from '../services/supabaseClient';

interface ScreenEmbedSetupProps {
  isDark: boolean;
}

const ScreenEmbedSetup = ({ isDark }: ScreenEmbedSetupProps) => {
  const location = useLocation();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [project, setProject] = useState<Project>(() => createNewProject(undefined, '$'));
  const [activeModal, setActiveModal] = useState<'project' | 'walls' | 'limits' | 'preferences' | 'success' | null>('project');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);

  const wallEditRef = useRef<any>(null);
  const wallLimitsRef = useRef<any>(null);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const wizardSteps = ['project', 'walls', 'limits', 'preferences'];

  // Parse query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const key = params.get('apiKey');
    setApiKey(key);
    if (!key) {
      setErrorMessage('Missing API Key. Please verify your widget embed code.');
    }
  }, [location.search]);

  // Step validation
  const isIdentityDone = project.name.trim().length > 0;
  const isWallsDone = project.zones.length > 0 && project.zones.some(z => z.totalLength > 0);
  const isLimitsDone = isWallsDone && project.zones.every(z => (z.startLimit !== undefined && z.endLimit !== undefined) || (z.startLimit === 0 && z.endLimit === z.totalLength));
  const isPreferencesDone = !!project.settings.layoutPreferences;

  const isReadyToSubmit = isIdentityDone && isWallsDone && isLimitsDone;

  const handleNextStep = () => {
    if (!activeModal) return;

    if (activeModal === 'walls' && wallEditRef.current) {
      wallEditRef.current.triggerSave();
      return;
    }
    if (activeModal === 'limits' && wallLimitsRef.current) {
      wallLimitsRef.current.triggerSave();
      return;
    }

    const currentIndex = wizardSteps.indexOf(activeModal);
    if (currentIndex !== -1 && currentIndex < wizardSteps.length - 1) {
      setDirection('forward');
      setActiveModal(wizardSteps[currentIndex + 1] as any);
    } else {
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    if (!activeModal) return;
    const currentIndex = wizardSteps.indexOf(activeModal);
    if (currentIndex > 0) {
      setDirection('backward');
      setActiveModal(wizardSteps[currentIndex - 1] as any);
    }
  };

  const handleSubmit = async () => {
    if (!apiKey) {
      setErrorMessage('Cannot save: API Key is missing.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // Invoke Supabase Edge Function securely
      const { data, error } = await supabase.functions.invoke('create-embed-project', {
        body: {
          apiKey,
          projectData: project
        }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to save project.');
      }

      setSavedProjectId(data.projectId);
      setActiveModal('success');

      // Post success message to parent website
      if (window.parent) {
        window.parent.postMessage({
          type: 'SETUP_COMPLETED',
          projectId: data.projectId
        }, '*');
      }
    } catch (err: any) {
      console.error('Error submitting embedded project:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const StepSidebarItem = ({ step, index, isActive, isDone, isRequired }: { step: string, index: number, isActive: boolean, isDone: boolean, isRequired: boolean }) => {
    const getIcon = () => {
      if (isDone) return <CheckCircle2 className="text-green-500" size={18} />;
      if (isActive) return <ArrowRight className="text-amber-500 animate-pulse" size={18} />;
      if (isRequired) return <AlertCircle className="text-amber-200" size={18} />;
      return <div className="w-4 h-4 rounded-full border-2 border-slate-200 dark:border-slate-800" />;
    };

    const getLabel = () => {
      switch (step) {
        case 'project': return 'Identity';
        case 'walls': return 'Room Layout';
        case 'limits': return 'Wall Limits';
        case 'preferences': return 'Special Units';
        default: return step;
      }
    };

    return (
      <button
        onClick={() => {
          const newIndex = wizardSteps.indexOf(step);
          const currentIndex = wizardSteps.indexOf(activeModal || 'project');
          setDirection(newIndex > currentIndex ? 'forward' : 'backward');
          setActiveModal(step as any);
        }}
        className={`w-full flex items-center gap-4 rounded-2xl p-4 transition-all border-2 text-left relative ${
          isActive 
            ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400 shadow-xl' 
            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
        }`}
      >
        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isActive ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
        }`}>
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[9px] font-black uppercase tracking-wider ${isActive ? 'text-amber-600' : 'text-slate-500'}`}>
            Step {index + 1}
          </p>
          <h4 className={`text-xs font-bold uppercase truncate ${isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
            {getLabel()}
          </h4>
        </div>
      </button>
    );
  };

  if (errorMessage && activeModal !== 'success') {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-950 p-6">
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-red-500/20 p-10 max-w-md w-full text-center shadow-xl">
          <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 mx-auto mb-6">
            <AlertCircle size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Integration Error</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 italic mb-6">{errorMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white dark:bg-slate-900 shadow-2xl relative">
          <div className="flex-1 relative bg-slate-100 dark:bg-slate-950 overflow-hidden p-4">
            <div className="h-full w-full max-w-none transition-all duration-500 relative">
              <AnimatePresence initial={false} custom={direction}>
                {activeModal === 'success' ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 h-full w-full flex items-center justify-center"
                  >
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border-2 border-emerald-500/20 p-10 max-w-md w-full text-center shadow-2xl">
                      <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mx-auto mb-6">
                        <CheckCircle2 size={40} className="animate-bounce" />
                      </div>
                      <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic mb-3">Setup Complete!</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 font-medium italic mb-6">Your kitchen specifications have been successfully sent to the designer's account.</p>
                      <button 
                        onClick={() => {
                          if (window.parent) {
                            window.parent.postMessage({ type: 'SETUP_COMPLETED' }, '*');
                          }
                        }}
                        className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                      >
                        Close Setup
                      </button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key={activeModal}
                    custom={direction}
                    variants={{
                      enter: (dir: string) => ({ x: dir === 'forward' ? '100%' : '-100%', opacity: 0 }),
                      center: { x: 0, opacity: 1 },
                      exit: (dir: string) => ({ x: dir === 'forward' ? '-100%' : '100%', opacity: 0 })
                    }}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ x: { type: "spring", stiffness: 300, damping: 35 }, opacity: { duration: 0.2 } }}
                    className="absolute inset-0 h-full w-full"
                  >
                    <div className={`h-full w-full flex flex-col overflow-hidden bg-white dark:bg-slate-900 rounded-[2rem] border-2 border-slate-200/60 dark:border-slate-800 shadow-xl ${['walls', 'limits'].includes(activeModal as string) ? '' : 'p-4 sm:p-10 overflow-y-auto'}`}>
                      <div className={`${['walls', 'limits'].includes(activeModal as string) ? 'h-full w-full px-4' : 'max-w-5xl mx-auto w-full'}`}>
                        
                        {activeModal === 'project' && (
                          <div className="h-full flex flex-col justify-center py-10">
                            <div className="max-w-4xl mx-auto w-full px-6">
                              <div className="text-center mb-10 relative">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] pointer-events-none" />
                                <h2 className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter uppercase mb-2 leading-tight">
                                  Kitchen <span className="text-amber-500">Configurator</span>
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium italic max-w-md mx-auto">
                                  Let's design your standard setup. Fill in your project specifications to begin.
                                </p>
                              </div>

                              <div className="space-y-6 relative">
                                <div className="grid md:grid-cols-2 gap-6">
                                  <div className="group relative">
                                    <label className="text-[9px] font-black uppercase text-amber-500 tracking-[0.2em] mb-1.5 block ml-2 italic">Customer Name</label>
                                    <div className="relative">
                                      <FileText className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={18} />
                                      <input 
                                        className="w-full p-4 pl-14 bg-white dark:bg-slate-800/40 rounded-[1.25rem] border-2 border-slate-100 dark:border-slate-800 focus:border-amber-500 outline-none dark:text-white font-bold text-sm shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none transition-all" 
                                        placeholder="John Doe" 
                                        value={project.name} 
                                        onChange={e => setProject({ ...project, name: e.target.value })} 
                                      />
                                    </div>
                                  </div>

                                  <div className="group relative">
                                    <label className="text-[9px] font-black uppercase text-emerald-500 tracking-[0.2em] mb-1.5 block ml-2 italic">Contact Number</label>
                                    <div className="relative">
                                      <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                      <input 
                                        type="tel"
                                        className="w-full p-4 pl-14 bg-white dark:bg-slate-800/40 rounded-[1.25rem] border-2 border-slate-100 dark:border-slate-800 focus:border-emerald-500 outline-none dark:text-white font-bold text-sm shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none transition-all" 
                                        placeholder="+1 234 567 890" 
                                        value={project.customerPhone || ''} 
                                        onChange={e => setProject({ ...project, customerPhone: e.target.value })} 
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="group relative">
                                  <label className="text-[9px] font-black uppercase text-blue-500 tracking-[0.2em] mb-1.5 block ml-2 italic">Site Address</label>
                                  <div className="relative">
                                    <MapPin className="absolute left-5 top-6 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                                    <textarea 
                                      rows={3}
                                      className="w-full p-4 pl-14 bg-white dark:bg-slate-800/40 rounded-[1.25rem] border-2 border-slate-100 dark:border-slate-800 focus:border-blue-500 outline-none dark:text-white font-bold text-sm shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none transition-all resize-none" 
                                      placeholder="Full delivery/installation address" 
                                      value={project.customerAddress || ''} 
                                      onChange={e => setProject({ ...project, customerAddress: e.target.value })} 
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {activeModal === 'walls' && (
                          <WallEditModal
                            ref={wallEditRef}
                            isOpen={true}
                            onClose={() => {}}
                            project={project}
                            isDark={isDark}
                            isInline={true}
                            hideCabinets={true}
                            readOnly={false}
                            onSave={(newZones) => {
                              const projectWithZones = { ...project, zones: newZones };
                              setProject(projectWithZones);
                              setActiveModal('limits');
                            }}
                          />
                        )}

                        {activeModal === 'limits' && (
                          <WallLimitsModal
                            ref={wallLimitsRef}
                            isOpen={true}
                            onClose={() => {}}
                            project={project}
                            isDark={isDark}
                            isInline={true}
                            onSave={(newZones) => {
                              const projectWithZones = { ...project, zones: newZones };
                              setProject(projectWithZones);
                              setActiveModal('preferences');
                            }}
                          />
                        )}

                        {activeModal === 'preferences' && (
                          <div className="space-y-6 py-6">
                            <div className="bg-amber-50/50 dark:bg-amber-900/10 p-6 rounded-[2rem] border-2 border-amber-500/10">
                              <h4 className="text-base font-black text-amber-900 dark:text-amber-400 uppercase tracking-widest mb-1 italic">Cabinet Selection</h4>
                              <p className="text-xs text-amber-700/70 dark:text-amber-500/50 font-medium italic">Choose which types of specialized units to include in your kitchen design.</p>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                              {[
                                { id: 'includeTall', label: 'Tall Units', desc: 'Floor-to-ceiling storage and appliances', icon: <Box size={20} /> },
                                { id: 'includeSink', label: 'Sink Base', desc: 'Plumbing-ready units for wet areas', icon: <Box size={20} /> },
                                { id: 'includeCooker', label: 'Cooking Hub', desc: 'Specialized oven and hob cabinets', icon: <Box size={20} /> },
                                { id: 'includeDrawers', label: 'Drawer Stacks', desc: 'Smooth-glide multi-tier storage', icon: <Box size={20} /> },
                              ].map((item) => (
                                <label 
                                  key={item.id}
                                  className={`flex items-start gap-4 p-5 rounded-[2rem] border-2 transition-all cursor-pointer group relative ${
                                    (project.settings.layoutPreferences?.[item.id as keyof typeof project.settings.layoutPreferences] ?? true)
                                      ? 'border-amber-500 bg-amber-500/5 shadow-md shadow-amber-500/10' 
                                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700'
                                  }`}
                                >
                                  <div className="pt-1">
                                    <input 
                                      type="checkbox" 
                                      className="w-5 h-5 rounded-lg border-2 border-slate-200 dark:border-slate-700 text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                                      checked={project.settings.layoutPreferences?.[item.id as keyof typeof project.settings.layoutPreferences] ?? true}
                                      onChange={(e) => {
                                        const currentPrefs = project.settings.layoutPreferences || { includeTall: true, includeSink: true, includeCooker: true, includeDrawers: true };
                                        setProject({
                                          ...project,
                                          settings: {
                                            ...project.settings,
                                            layoutPreferences: {
                                              ...currentPrefs,
                                              [item.id]: e.target.checked
                                            }
                                          }
                                        });
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <h5 className="font-black uppercase tracking-tight text-xs mb-0.5">{item.label}</h5>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">{item.desc}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Fixed Footer Navigation */}
          {activeModal && activeModal !== 'success' && (
            <div className="px-8 py-4 border-t dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl flex justify-between items-center shrink-0 z-30 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
              <Button 
                variant="secondary" 
                onClick={handlePrevStep}
                disabled={wizardSteps.indexOf(activeModal) === 0 || isSubmitting}
                className="text-[10px] font-black uppercase tracking-[0.2em] px-5 h-10 rounded-xl border-2"
              >
                Previous
              </Button>

              <div className="flex gap-4">
                {wizardSteps.indexOf(activeModal) === wizardSteps.length - 1 ? (
                  <Button 
                    onClick={handleSubmit} 
                    disabled={!isReadyToSubmit || isSubmitting}
                    className="px-8 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-amber-500/30 text-[10px] transition-all flex items-center gap-2 h-12"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Save & Submit <Wand2 size={16} />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleNextStep} 
                    disabled={activeModal === 'project' && !isIdentityDone}
                    className="px-8 py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black uppercase tracking-[0.15em] rounded-2xl shadow-xl shadow-amber-500/30 text-[10px] transition-all flex items-center gap-2 h-12"
                  >
                    Next Step <ArrowRight size={16} />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Journey Map */}
        {activeModal && activeModal !== 'success' && (
          <aside className="hidden md:flex w-56 border-l dark:border-slate-800 bg-white dark:bg-slate-900 flex-col shrink-0 overflow-hidden relative z-10">
            <div className="p-6 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 italic mb-2">Setup Steps</h3>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 transition-all duration-500" 
                  style={{ width: `${((wizardSteps.indexOf(activeModal) + 1) / wizardSteps.length) * 100}%` }} 
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {wizardSteps.map((step, index) => {
                let isDone = false;
                if (step === 'project') isDone = isIdentityDone;
                if (step === 'walls') isDone = isWallsDone;
                if (step === 'limits') isDone = isLimitsDone;
                if (step === 'preferences') isDone = isPreferencesDone;

                return (
                  <StepSidebarItem 
                    key={step}
                    step={step}
                    index={index}
                    isActive={activeModal === step}
                    isDone={isDone}
                    isRequired={true}
                  />
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default ScreenEmbedSetup;
