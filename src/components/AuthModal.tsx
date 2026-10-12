import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  X, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  Loader2,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { TurnstileBadge } from './TurnstileBadge';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  initialRole?: 'buyer' | 'seller';
  title?: string;
  subtitle?: string;
  onSuccess?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  initialRole = 'buyer',
  title,
  subtitle,
  onSuccess
}) => {
  const { signIn, signUp, switchPresetUser, loading, error, clearError, isSupabaseLive } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [role, setRole] = useState<'buyer' | 'seller'>(initialRole);
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
      setRole(initialRole);
      setLocalError(null);
      setSuccessMsg(null);
      clearError();
    }
  }, [isOpen, initialMode, initialRole]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (mode === 'signup' && !termsAccepted) {
      setLocalError('Please accept the Terms of Use and Privacy Policy to create an account.');
      return;
    }

    if (mode === 'signin') {
      const res = await signIn(email, password);
      if (res.success) {
        setSuccessMsg('Signed in successfully!');
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 700);
      }
    } else {
      const res = await signUp(email, fullName, role, phone, password);
      if (res.success) {
        setSuccessMsg(`Welcome to DirectHome BC! Your ${role} account is ready.`);
        setTimeout(() => {
          onClose();
          if (onSuccess) onSuccess();
        }, 800);
      }
    }
  };

  const handleQuickDemoSelect = (persona: 'buyer' | 'seller' | 'admin') => {
    switchPresetUser(persona);
    setSuccessMsg(`Switched to demo ${persona} persona.`);
    setTimeout(() => {
      onClose();
      if (onSuccess) onSuccess();
    }, 500);
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
              <p className="text-xs text-slate-500">Redirecting to your requested action...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Account role toggle for Sign Up */}
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Account Type:
                    </span>
                    <span className="text-[10px] text-slate-500">Free forever</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('buyer')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all min-h-[44px] cursor-pointer flex flex-col items-center justify-center text-center ${
                        role === 'buyer'
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-bold">Buyer / Inquirer</span>
                      <span className="text-[10px] font-normal text-slate-500 mt-0.5">Message sellers & book viewings</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('seller')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold transition-all min-h-[44px] cursor-pointer flex flex-col items-center justify-center text-center ${
                        role === 'seller'
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-700'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="font-bold">Homeowner / Seller</span>
                      <span className="text-[10px] font-normal text-slate-500 mt-0.5">List home & save commissions</span>
                    </button>
                  </div>
                </div>
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
                      Phone Number {role === 'seller' ? '(Recommended for buyers)' : '(Optional)'}
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
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="auth-password" className="text-xs font-semibold text-slate-700">
                    Password
                  </label>
                  <span className="text-[10px] text-slate-400">Min 6 characters</span>
                </div>
                <div className="relative">
                  <input
                    id="auth-password"
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:bg-white"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

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
                    <strong className="text-slate-900 underline">Terms of Use</strong>
                    <span> and </span>
                    <strong className="text-slate-900 underline">Privacy Policy</strong>.
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Acceptance version (2026-v1.0-draft) and timestamp will be audited.
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

              {/* Turnstile Bot Protection Widget */}
              <div className="pt-1">
                <TurnstileBadge action={mode === 'signin' ? 'user_signin' : 'user_signup'} />
              </div>

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
                    <span>{mode === 'signin' ? 'Sign In to DirectHome' : 'Create My Account'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Live Supabase Connected indicator or local preview notice */}
              <div className="text-center pt-1">
                {isSupabaseLive ? (
                  <span className="text-[10px] text-emerald-800 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    🔒 Connected to Supabase Production Auth & Postgres
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200 inline-flex items-center gap-1">
                    <span>⚡ Development / Local storage enabled</span>
                  </span>
                )}
              </div>

              {/* Quick Persona Demo Switcher for fast evaluation */}
              <div className="pt-3 border-t border-slate-100">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2">
                  Quick Demo Testing (1-Click)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemoSelect('buyer')}
                    className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Alex Rivera</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Test Buyer Role</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemoSelect('seller')}
                    className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-xs transition-colors cursor-pointer"
                  >
                    <div className="font-semibold text-slate-800 flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Sarah Miller</span>
                    </div>
                    <div className="text-[10px] text-slate-500">Test Seller Role</div>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
