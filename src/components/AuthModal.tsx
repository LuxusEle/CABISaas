import React, { useState } from 'react';
import { X, Mail, Lock, Loader, LogOut, User as UserIcon, Sparkles, Building2, Phone, ArrowRight, CheckCircle2, Upload } from 'lucide-react';
import { authService } from '../services/authService';
import type { User } from '@supabase/supabase-js';
import { track } from '@vercel/analytics';

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
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showOtp, setShowOtp] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [resending, setResending] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
        if (mode === 'signup' && result.user) {
          let uploadedLogoUrl = '';
          if (logoFile) {
            const { logoService } = await import('../services/logoService');
            const uploadResult = await logoService.uploadLogo(logoFile, result.user.id);
            if (uploadResult) {
              uploadedLogoUrl = uploadResult.url;
            }
          }

          const { profileService } = await import('../services/profileService');
          await profileService.updateProfile(result.user.id, {
            company_name: companyName,
            phone: phone,
            logo_url: uploadedLogoUrl || undefined
          });
        }

        // If signup but no session, it means OTP is required
        if (mode === 'signup' && !result.session) {
          setShowOtp(true);
        } else {
          if (mode === 'signup') {
            track('registration_completed', { method: 'password' });
          }
          onSuccess();
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.verifyOtp(email, otpToken, 'signup');
      if (result.error) {
        setError(result.error.message);
      } else {
        track('registration_confirmed', { method: 'otp' });
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError('');
    try {
      const { error } = await authService.resendOtp(email, 'signup');
      if (error) setError(error.message);
      else alert('A new code has been sent to your email.');
    } finally {
      setResending(false);
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
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl max-w-md w-full p-10 relative animate-modal-pop overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-all"
          >
            <X size={20} />
          </button>

          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-500/20 rotate-3">
              <UserIcon size={48} className="text-white -rotate-3" />
            </div>
            <h2 className="text-4xl font-black text-white mb-2 italic tracking-tighter uppercase">Profile</h2>
            <p className="text-slate-400 mb-10 font-medium">{user.email}</p>

            <button
              onClick={handleLogout}
              className="w-full bg-slate-800 hover:bg-red-500 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs group"
            >
              <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <style>{`
        @keyframes modalPop {
          0% { opacity: 0; transform: scale(0.95) translateY(30px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-modal-pop { animation: modalPop 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      <div className="bg-slate-950 rounded-[3rem] shadow-[0_0_80px_rgba(0,0,0,0.5)] max-w-5xl w-full flex overflow-hidden animate-modal-pop border border-slate-900 relative">
        <button
          onClick={onClose}
          className="absolute top-8 right-8 text-slate-500 hover:text-white p-2 rounded-full hover:bg-slate-900 transition-all z-20"
        >
          <X size={20} />
        </button>

        {/* LEFT PANEL: Branding & Features */}
        <div className="hidden lg:flex w-2/5 bg-slate-900 p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-500 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500 rounded-full blur-[120px]" />
          </div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-16">
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-amber-500/30">
                <Sparkles size={24} />
              </div>
              <span className="text-xl font-black text-white italic tracking-tighter uppercase">
                CAB<span className="text-amber-500">ENGINE</span>
              </span>
            </div>

            <h1 className="text-5xl font-black text-white mb-6 italic leading-[0.95] uppercase">
              Precision <br />
              <span className="text-amber-500">Engineering</span> <br />
              Simplified.
            </h1>
            <p className="text-slate-400 font-medium max-w-xs leading-relaxed">
              The professional standard for automated cabinetry design and manufacturing.
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4 group">
              <div className="w-6 h-6 rounded-full border-2 border-amber-500 flex items-center justify-center">
                <CheckCircle2 size={12} className="text-amber-500" />
              </div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-amber-500 transition-colors">Automated Cut Lists & Nesting</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-6 h-6 rounded-full border-2 border-amber-500 flex items-center justify-center">
                <CheckCircle2 size={12} className="text-amber-500" />
              </div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-amber-500 transition-colors">Instant 3D Visualization</span>
            </div>
            <div className="flex items-center gap-4 group">
              <div className="w-6 h-6 rounded-full border-2 border-amber-500 flex items-center justify-center">
                <CheckCircle2 size={12} className="text-amber-500" />
              </div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest group-hover:text-amber-500 transition-colors">Direct Manufacturing DXF Output</span>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: Form */}
        <div className="flex-1 p-12 lg:p-20 flex flex-col justify-center bg-[#0a0c10]">
          <div className="max-w-md w-full mx-auto">
            {showOtp ? (
              <div className="animate-fade-in">
                <div className="mb-8">
                  <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-2">
                    Verify <span className="text-amber-500">Identity</span>
                  </h2>
                  <p className="text-slate-500 font-medium text-sm">
                    We've sent a 6-digit code to <span className="text-white">{email}</span>. Please enter it below to confirm your account.
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-6">
                  <div className="relative group">
                    <input
                      type="text"
                      value={otpToken}
                      onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      placeholder="Enter 6-digit code"
                      className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-5 px-6 text-center text-3xl font-black tracking-[0.5em] text-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-800 placeholder:tracking-normal placeholder:text-sm"
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || otpToken.length < 6}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-white font-black py-5 rounded-2xl transition-all disabled:opacity-30 flex items-center justify-center gap-3 uppercase tracking-widest text-xs shadow-xl shadow-amber-500/20 active:scale-[0.98]"
                  >
                    {loading ? <Loader className="animate-spin" size={20} /> : (
                      <>
                        Verify & Complete
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resending}
                      className="text-[10px] font-black text-slate-500 hover:text-amber-500 uppercase tracking-widest transition-all"
                    >
                      {resending ? 'Sending...' : "Didn't receive a code? Resend"}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <>
                <div className="mb-12">
                  <h2 className="text-5xl font-black text-white italic tracking-tighter uppercase mb-2">
                    {mode === 'login' ? 'Welcome' : 'Get'} <span className="text-amber-500">{mode === 'login' ? 'Back' : 'Started'}</span>
                  </h2>
                  <p className="text-slate-500 font-medium">
                    {mode === 'login' ? 'Sign in to access your projects.' : 'Create your pro account today.'}
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-4">
                    {mode === 'signup' ? (
                      <>
                        {/* 1. Company Name */}
                        <div className="relative group">
                          <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors" size={20} />
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            required
                            placeholder="Company Name"
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                          />
                        </div>

                        {/* 2. Email Address */}
                        <div className="relative group">
                          <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors" size={20} />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Email Address"
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                          />
                        </div>

                        {/* 3. Phone */}
                        <div className="relative group">
                          <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors" size={20} />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            placeholder="Phone Number"
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                          />
                        </div>

                        {/* 4. Logo Upload */}
                        <div className="relative group">
                          <input 
                            type="file" 
                            ref={fileInputRef}
                            className="hidden" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                setLogoFile(file);
                                setLogoPreview(URL.createObjectURL(file));
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 px-6 flex items-center justify-between text-slate-400 font-medium hover:border-amber-500 transition-all group"
                          >
                            <div className="flex items-center gap-4">
                              <Upload size={20} className="text-slate-600 group-hover:text-amber-500 transition-colors" />
                              <span>{logoFile ? logoFile.name : 'Company Logo'}</span>
                            </div>
                            {logoPreview && (
                              <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-700">
                                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </button>
                        </div>

                        {/* 5. Password & Confirm */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="relative group">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors" size={20} />
                            <input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              minLength={6}
                              placeholder="Password"
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                            />
                          </div>
                          <div className="relative group">
                            <input
                              type="password"
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                              minLength={6}
                              placeholder="Confirm"
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 px-6 text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                            />
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Login Mode */}
                        <div className="relative group">
                          <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors" size={20} />
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            placeholder="Email Address"
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                          />
                        </div>
                        <div className="relative group">
                          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors" size={20} />
                          <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Password"
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                          />
                        </div>
                      </>
                    )}

                    {/* Terms (Signup Only) */}
                    {mode === 'signup' && (
                      <div className="flex items-center gap-4 bg-slate-900/30 p-4 rounded-2xl border border-slate-800/50">
                        <input
                          type="checkbox"
                          id="terms-check"
                          checked={agreedToTerms}
                          onChange={(e) => setAgreedToTerms(e.target.checked)}
                          className="w-5 h-5 rounded-lg accent-amber-500"
                        />
                        <label htmlFor="terms-check" className="text-[11px] font-medium text-slate-500">
                          I agree to the <button type="button" onClick={onNavigateToPolicy} className="text-amber-500 font-bold hover:underline">TERMS & CONDITIONS</button> and privacy policy.
                        </label>
                      </div>
                    )}
                  </div>

                  {error && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || (mode === 'signup' && !agreedToTerms)}
                    className="w-full bg-slate-200 hover:bg-white text-slate-900 font-black py-5 rounded-2xl transition-all disabled:opacity-30 flex items-center justify-center gap-3 uppercase tracking-widest text-xs shadow-xl active:scale-[0.98]"
                  >
                    {loading ? <Loader className="animate-spin" size={20} /> : (
                      <>
                        {mode === 'login' ? 'Sign In' : 'Create Account'}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <div className="mt-12 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMode(mode === 'login' ? 'signup' : 'login');
                        setError('');
                      }}
                      className="text-[11px] font-black text-slate-500 hover:text-amber-500 uppercase tracking-[0.2em] transition-colors"
                    >
                      {mode === 'login' ? 'Need an account? Sign Up' : 'Back to Sign In'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
