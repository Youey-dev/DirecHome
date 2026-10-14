import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  X, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Turnstile, isTurnstileEnabled } from './Turnstile';
import { TERMS_VERSION } from '../lib/db';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  title?: string;
  subtitle?: string;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  title,
  subtitle,
  onSuccess
}) => {
  const { signIn, signUp, resetPassword, loading, error, clearError } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>(initialMode);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setLocalError(null);
      setSuccessMsg(null);
      clearError();
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const resetCaptcha = () => {
    setCaptchaToken(null);
    setCaptchaKey((k) => k + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (mode === 'signup' && !termsAccepted) {
      setLocalError('Please accept the Terms of Use and Privacy Policy to create an account.');
      return;
    }
    if (isTurnstileEnabled && !captchaToken) {
      setLocalError('Please complete the verification check below.');
      return;
    }
    const token = captchaToken ?? undefined;

    if (mode === 'signin') {
      const res = await signIn(email, password, token);
      if (res.success) {
        setSuccessMsg('Signed in successfully!');
        setTimeout(() => {
          onClose();
          onSuccess?.();
        }, 600);
      } else {
        resetCaptcha();
      }
    } else if (mode === 'signup') {
      const res = await signUp(email, fullName, phone, password, token);
      if (res.success) {
        if (res.needsEmailConfirmation) {
          setSuccessMsg('Check your email');
        } else {
          setSuccessMsg('Welcome to DirectHome BC! Your account is ready.');
          setTimeout(() => {
            onClose();
            onSuccess?.();
          }, 800);
        }
      } else {
        resetCaptcha();
      }
    } else {
      const res = await resetPassword(email, token);
      if (res.success) setSuccessMsg('Check your email');
      else resetCaptcha();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-base leading-none block">
                DirectHome<span className="text-emerald-700">BC</span>
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Fraser Valley & Lower Mainland</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Context Header (If triggered with specific intent) */}
        {(title || subtitle) && (
          <div className="bg-emerald-50/70 border-b border-emerald-100/60 px-6 py-3">
            {title && <h3 className="text-xs font-bold text-emerald-950">{title}</h3>}
            {subtitle && <p className="text-[11px] text-emerald-800 mt-0.5 leading-snug">{subtitle}</p>}
          </div>
        )}

        {/* Tab switch between Sign In and Sign Up */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => { setMode('signin'); clearError(); setLocalError(null); }}
            className={`flex-1 py-3 text-center transition-all cursor-pointer min-h-[44px] ${
              mode === 'signin'
                ? 'bg-white text-slate-900 border-b-2 border-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); clearError(); setLocalError(null); }}
            className={`flex-1 py-3 text-center transition-all cursor-pointer min-h-[44px] ${
              mode === 'signup'
                ? 'bg-white text-slate-900 border-b-2 border-emerald-700 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {successMsg ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900">{successMsg}</h4>
              {successMsg === 'Check your email' ? (
                <p className="text-xs text-slate-600 leading-relaxed">
                  {mode === 'reset'
                    ? 'If an account exists for that address, we have sent a link to reset your password.'
                    : 'We sent a confirmation link to your email address. Click it to activate your account, then sign in. Check your spam folder if you do not see it within a few minutes.'}
                </p>
              ) : (
                <p className="text-xs text-slate-500">One moment…</p>
              )}
              {successMsg === 'Check your email' && (
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-2 text-xs font-semibold text-emerald-800 underline cursor-pointer"
                >
                  Close
                </button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'reset' && (
                <p className="text-xs text-slate-600 leading-relaxed">
                  Enter the email you signed up with and we will send you a link to choose a new password.
                </p>
              )}
              
              {/* One account for everything */}
              {mode === 'signup' && (
                <p className="text-xs text-slate-600 bg-emerald-50 border border-emerald-100 rounded-xl p-3 leading-relaxed">
                  One free account lets you browse homes, message owners, book viewings <strong>and</strong> list your own home.
                </p>
              )}

              {/* Full Name for Sign Up */}
              {mode === 'signup' && (
                <div>
                  <label htmlFor="auth-fullname" className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      id="auth-fullname"
                      type="text"
                      required
                      placeholder="e.g. Jordan Smith"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label htmlFor="auth-email" className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <input
                    id="auth-email"
                    type="email"
                    required
                    placeholder="name@example.ca"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Phone (Optional for Sign Up) */}
              {mode === 'signup' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="auth-phone" className="text-xs font-semibold text-slate-700">
                      Phone Number (Optional)
                    </label>
                    <span className="text-[10px] text-slate-400">BC Local</span>
                  </div>
                  <div className="relative">
                    <input
                      id="auth-phone"
                      type="tel"
                      placeholder="604-555-0199"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              )}

              {/* Password */}
              {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="auth-password" className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  {mode === 'signup' && <span className="text-[10px] text-slate-400">At least 10 characters</span>}
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => { setMode('reset'); clearError(); setLocalError(null); }}
                      className="text-[11px] font-semibold text-emerald-800 hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={mode === 'signup' ? 10 : undefined}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
              )}

              {/* Mandatory Terms acceptance on Sign Up */}
              {mode === 'signup' && (
                <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 accent-emerald-700 rounded cursor-pointer mt-0.5 shrink-0"
                  />
                  <div className="text-[11px] text-slate-600 leading-normal">
                    <span>I agree to the </span>
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="font-bold text-slate-900 underline">Terms of Use</a>
                    <span> and </span>
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="font-bold text-slate-900 underline">Privacy Policy</a>.
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      We record the date and version you accepted ({TERMS_VERSION}).
                    </span>
                  </div>
                </label>
              )}

              {/* Error Alert */}
              {(error || localError) && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error || localError}</span>
                </div>
              )}

              {/* Bot protection (only shown when a Cloudflare Turnstile key is configured) */}
              <Turnstile key={captchaKey} onToken={setCaptchaToken} />

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer min-h-[48px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In to DirectHome' : mode === 'signup' ? 'Create My Account' : 'Send reset link'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

            </form>
          )}
        </div>
      </div>
    </div>
  );
};
