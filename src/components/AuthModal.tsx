import React, { useState } from 'react';
import { X, Mail, Lock, Loader, LogOut, User as UserIcon, Sparkles, Building2, Phone, ArrowRight, CheckCircle2, Upload, Eye, EyeOff } from 'lucide-react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { authService } from '../services/authService';
import type { User } from '@supabase/supabase-js';
import { track } from '@vercel/analytics';
import { getVisitorCountry } from '../utils/geoUtils';

const CustomPhoneInput = React.forwardRef((props: any, ref) => (
  <input
    {...props}
    ref={ref}
    className="w-full bg-transparent border-none text-white font-medium outline-none placeholder:text-slate-600 py-4 px-2"
  />
));

// Helper is now imported from ../utils/geoUtils

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onLogout?: () => void;
  user?: User | null;
  initialMode?: 'login' | 'signup';
  onNavigateToPolicy?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess, onLogout, user, initialMode = 'login', onNavigateToPolicy }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password' | 'update-password'>(initialMode as any);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [resending, setResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if ((mode === 'signup' || mode === 'update-password') && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (mode !== 'forgot-password' && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (mode === 'signup' && phone && !isValidPhoneNumber(phone)) {
      setError('Please enter a valid international phone number');
      return;
    }

    if (mode === 'signup' && !agreedToTerms) {
      setError('You must agree to the Terms and Conditions');
      return;
    }

    setLoading(true);

    try {
      if (mode === 'forgot-password') {
        const { error } = await authService.resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Password reset link has been sent to your email.');
        }
      } else if (mode === 'update-password') {
        // Double check session before update
        const { user: currentUser } = await authService.getCurrentUser();
        if (!currentUser) {
          setError('Auth session missing or expired. Please try requesting a new reset link.');
          setLoading(false);
          return;
        }

        const { error } = await authService.updatePassword(password);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Password updated successfully! Redirecting to login...');
          // Sign out and redirect to home with a login flag to clear the recovery hash
          authService.signOut().then(() => {
            setTimeout(() => {
              window.location.href = '/?mode=login';
            }, 2000);
          });
        }
      } else {
        const result = mode === 'login'
          ? await authService.signIn(email, password)
          : await authService.signUp(email, password);

        if (result.error) {
          setError(result.error.message);
        } else {
          // If signup but no session, it means OTP is required
          if (mode === 'signup' && !result.session) {
            setShowOtp(true);
          } else {
            if (mode === 'signup' && result.user) {
              track('registration_completed', { method: 'password' });
              // If OTP is disabled in Supabase, we save the profile immediately
              await saveProfile(result.user);
            }
            onSuccess();
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (user: User) => {
    try {
      const { profileService } = await import('../services/profileService');
      await profileService.updateProfile(user.id, {
        email: email,
        company_name: companyName || email.split('@')[0],
        phone: phone || undefined
      });
    } catch (profileErr) {
      console.error("Profile update failed:", profileErr);
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
      } else if (result.user) {
        // Save the profile details after verification
        await saveProfile(result.user);
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

  // If user is logged in, show profile view (unless we are in the middle of a password update)
  if (user && mode !== 'update-password') {
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
    <>
      {/* Custom Styles for Phone Input to force Dark Theme */}
      <style>{`
        .phone-input-container .PhoneInput {
          --PhoneInputCountryFlag-borderColor: transparent;
          --PhoneInputCountrySelectArrow-color: #64748b;
          --PhoneInputCountrySelectArrow-opacity: 0.7;
        }
        
        .phone-input-container input.PhoneInputInput {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: white !important;
          outline: none !important;
        }

        .phone-input-container .PhoneInputCountry {
          background: transparent !important;
          margin-right: 8px;
        }

        /* Target the native select dropdown */
        .phone-input-container select.PhoneInputCountrySelect {
          background-color: #0f172a !important;
          color: white !important;
          cursor: pointer;
        }

        /* Ensure the native options are styled (limited browser support but helps) */
        .phone-input-container select.PhoneInputCountrySelect option {
          background-color: #0f172a !important;
          color: white !important;
        }
      `}</style>
      
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
                    {mode === 'signup' && (
                      <>
                        {/* 1. Email Address */}
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
 
                        {/* 2. Phone (Optional) */}
                        <div className="relative group phone-input-container flex items-center bg-slate-900/50 border border-slate-800 rounded-2xl focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:border-amber-500 transition-all px-4">
                          <PhoneInput
                            international
                            defaultCountry={getVisitorCountry() as any}
                            value={phone}
                            onChange={(value) => setPhone(value || '')}
                            placeholder="Phone Number (Optional)"
                            inputComponent={CustomPhoneInput}
                            className="flex-1 flex items-center"
                          />
                        </div>

                        {/* 5. Password & Confirm */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="relative group">
                            <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors" size={20} />
                            <input
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              required
                              minLength={6}
                              placeholder="Password"
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-12 text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-amber-500 transition-colors"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                          <div className="relative group">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              required
                              minLength={6}
                              placeholder="Confirm"
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 px-12 text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-amber-500 transition-colors"
                            >
                              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                          </div>
                        </div>
                      </>
                    )}

                    {mode === 'login' && (
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
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Password"
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-12 text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-amber-500 transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        <div className="text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setMode('forgot-password');
                              setError('');
                              setMessage('');
                            }}
                            className="text-[10px] font-black text-slate-500 hover:text-amber-500 uppercase tracking-widest transition-all"
                          >
                            Forgot Password?
                          </button>
                        </div>
                      </>
                    )}

                    {mode === 'forgot-password' && (
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
                    )}

                    {mode === 'update-password' && (
                      <>
                        <div className="relative group">
                          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors" size={20} />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="New Password"
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-12 text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-amber-500 transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                        <div className="relative group">
                          <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-500 transition-colors" size={20} />
                          <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            minLength={6}
                            placeholder="Confirm New Password"
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl py-4 pl-14 pr-12 text-white font-medium focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-amber-500 transition-colors"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
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

                  {message && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-500 text-xs font-bold flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {message}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || (mode === 'signup' && !agreedToTerms) || (mode === 'forgot-password' && !email)}
                    className="w-full bg-slate-200 hover:bg-white text-slate-900 font-black py-5 rounded-2xl transition-all disabled:opacity-30 flex items-center justify-center gap-3 uppercase tracking-widest text-xs shadow-xl active:scale-[0.98]"
                  >
                    {loading ? <Loader className="animate-spin" size={20} /> : (
                      <>
                        {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : mode === 'forgot-password' ? 'Send Reset Link' : 'Update Password'}
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  <div className="mt-12 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (mode === 'forgot-password' || mode === 'update-password') setMode('login');
                        else setMode(mode === 'login' ? 'signup' : 'login');
                        setError('');
                        setMessage('');
                      }}
                      className="text-[11px] font-black text-slate-500 hover:text-amber-500 uppercase tracking-[0.2em] transition-colors"
                    >
                      {mode === 'login' ? 'Need an account? Sign Up' : mode === 'signup' ? 'Back to Sign In' : 'Back to Login'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
          </div>
        </div>
      </div>
    </>
  );
};
