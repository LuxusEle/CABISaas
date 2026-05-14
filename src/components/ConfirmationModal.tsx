import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, Info, Trash2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  imageUrl?: string;
  isLoading?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  imageUrl,
  isLoading = false
}) => {
  const Icon = type === 'danger' ? Trash2 : type === 'warning' ? AlertCircle : Info;
  const accentColor = type === 'danger' ? 'rose' : type === 'warning' ? 'amber' : 'blue';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800"
          >
            <div className="p-8 text-center">
              <div className={`w-20 h-20 bg-${accentColor}-100 dark:bg-${accentColor}-500/10 rounded-full flex items-center justify-center mx-auto mb-6`}>
                <Icon size={32} className={`text-${accentColor}-500`} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">{title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8 px-4">
                {message}
              </p>
              
              {imageUrl && (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden mb-8 border border-slate-100 dark:border-slate-800 shadow-inner">
                  <img src={imageUrl} className="w-full h-full object-cover" alt="Preview" />
                  <div className={`absolute inset-0 bg-${accentColor}-500/10 mix-blend-overlay`} />
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={onClose}
                  disabled={isLoading}
                  className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest text-[10px] rounded-2xl transition-all disabled:opacity-50"
                >
                  {cancelText}
                </button>
                <button
                  onClick={onConfirm}
                  disabled={isLoading}
                  className={`flex-1 py-4 bg-${accentColor}-500 hover:bg-${accentColor}-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-${accentColor}-500/20 transition-all flex items-center justify-center disabled:opacity-50`}
                >
                  {isLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    confirmText
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
