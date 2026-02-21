import React, { useState } from 'react';
import { X, Mail, Lock, Loader, LogOut, User as UserIcon, Sparkles } from 'lucide-react';
import { authService } from '../services/authService';
import type { User } from '@supabase/supabase-js';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onLogout?: () => void;
  user?: User | null;
  initialMode?: 'login' | 'signup';
  onNavigateToPolicy?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess, onLogout, user, initialMode = 'login', onNavigateToPolicy }) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (mode === 'signup' && !agreedToTerms) {
      setError('You must agree to the Terms and Conditions');
      return;
    }

    setLoading(true);

    try {
      const result = mode === 'login'
        ? await authService.signIn(email, password)
        : await authService.signUp(email, password);

      if (result.error) {
        setError(result.error.message);
      } else {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await authService.signOut();
    if (onLogout) {
      onLogout();
    } else {
      onSuccess();
    }
  };

  // If user is logged in, show profile view
  if (user) {
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes modalPop {
            0% { opacity: 0; transform: scale(0.9) translateY(20px); }
            70% { transform: scale(1.02) translateY(-5px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
          .animate-modal-pop { animation: modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
          .animate-glow {
            animation: glow 2s ease-in-out infinite;
          }
          @keyframes glow {
            0%, 100% { box-shadow: 0 0 20px rgba(245, 158, 11, 0.3); }
            50% { box-shadow: 0 0 40px rgba(245, 158, 11, 0.6), 0 0 60px rgba(245, 158, 11, 0.3); }
          }
        `}</style>
        <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-modal-pop border border-slate-200 dark:border-slate-700">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
          >
            <X size={20} />
          </button>

          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/30">
              <UserIcon size={48} className="text-white" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">Profile</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 font-medium">{user.email}</p>

            <button
              onClick={handleLogout}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Otherwise show login/signup form
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalPop {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          70% { transform: scale(1.02) translateY(-5px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.3s ease-out forwards; }
        .animate-modal-pop { animation: modalPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .input-focus:focus {
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.2);
        }
      `}</style>
      <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-modal-pop border border-slate-200 dark:border-slate-700">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
        >
          <X size={20} />
        </button>

        {/* Header with icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
            {mode === 'login' ? (
              <Mail size={36} className="text-white" />
            ) : (
              <Sparkles size={36} className="text-white" />
            )}
          </div>
          <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {mode === 'login' 
              ? 'Sign in to continue building' 
              : 'Join CABENGINE to start designing'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={20} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 dark:text-white input-focus transition-all outline-none"
                placeholder="you@example.com"
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={20} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 dark:text-white input-focus transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Confirm Password field (signup only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={20} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 dark:text-white input-focus transition-all outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {/* Terms and Conditions checkbox (signup only) */}
          {mode === 'signup' && (
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-1 w-4 h-4 text-amber-500 border-slate-300 dark:border-slate-600 rounded focus:ring-amber-500"
              />
              <label htmlFor="terms" className="text-sm text-slate-600 dark:text-slate-400">
                I agree to the{' '}
                <button
                  type="button"
                  onClick={onNavigateToPolicy}
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium underline"
                >
                  Terms and Conditions
                </button>
              </label>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading || (mode === 'signup' && !agreedToTerms)}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
          >
            {loading && <Loader className="animate-spin" size={18} />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle mode button */}
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {mode === 'login' ? "Don't have an account?" : "Already have an account?"}
          </p>
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError('');
            }}
            className="mt-2 text-amber-600 dark:text-amber-400 font-bold hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
          >
            {mode === 'login' ? 'Sign up for free' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};
