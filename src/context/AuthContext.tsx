/**
 * Authentication for OwnersMarket (Supabase Auth).
 *
 * IMPORTANT: a person's role (member / admin) is read from the database
 * table public.users — never from anything the browser or the signup form supplies.
 * Admin access can only be granted by the site owner inside the Supabase dashboard.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from '../types/listing';
import { supabase } from '../lib/supabase';
import { db, GUEST_USER, TERMS_VERSION } from '../lib/db';
import { stripHtml, validateEmail } from '../lib/security';

interface AuthResult {
  success: boolean;
  error?: string;
  /** True when the person must click the link we emailed before they can sign in. */
  needsEmailConfirmation?: boolean;
}

interface AuthContextType {
  user: UserProfile;
  isAuthenticated: boolean;
  isGuest: boolean;
  /** True until we know whether someone is already signed in (avoids a flash of the signed-out page). */
  initializing: boolean;
  loading: boolean;
  error: string | null;
  recoveryMode: boolean;
  signIn: (email: string, password: string, captchaToken?: string) => Promise<AuthResult>;
  signUp: (
    email: string,
    fullName: string,
    phone: string | undefined,
    password: string,
    captchaToken?: string
  ) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string, captchaToken?: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  clearError: () => void;
  dismissRecovery: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const friendlyAuthError = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('invalid login')) return 'That email or password is not correct.';
  if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox for our message.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'An account with this email already exists. Try signing in instead.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts. Please wait a few minutes and try again.';
  if (m.includes('captcha')) return 'Please complete the verification check and try again.';
  if (m.includes('password') && m.includes('weak')) return 'That password is too easy to guess. Please choose a stronger one.';
  return message;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(GUEST_USER);
  const [initializing, setInitializing] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const loadingProfileFor = useRef<string | null>(null);

  const applyUser = useCallback((profile: UserProfile) => {
    setUser(profile);
    db.setUser(profile);
  }, []);

  /** Reads the person's profile (and role) from the database. */
  const loadProfile = useCallback(
    async (session: Session) => {
      const uid = session.user.id;
      if (loadingProfileFor.current === uid) return;
      loadingProfileFor.current = uid;
      try {
        let row: Record<string, any> | null = null;
        for (let attempt = 0; attempt < 3 && !row; attempt++) {
          const { data } = await supabase.from('users').select('*').eq('id', uid).maybeSingle();
          row = data;
          if (!row) await new Promise((r) => setTimeout(r, 600));
        }
        applyUser({
          id: uid,
          email: row?.email ?? session.user.email ?? '',
          name: row?.full_name ?? session.user.email?.split('@')[0] ?? 'Member',
          phone: row?.phone ?? undefined,
          // Never trust metadata for the role. If the profile row is missing we treat the person as a buyer.
          role: (row?.role as UserProfile['role']) ?? 'buyer',
          isGuest: false,
          termsAcceptedAt: row?.terms_accepted_at ?? undefined,
          termsVersion: row?.terms_version ?? undefined,
        });
      } finally {
        loadingProfileFor.current = null;
        setInitializing(false);
      }
    },
    [applyUser]
  );

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      if (session) void loadProfile(session);
      else {
        applyUser(GUEST_USER);
        setInitializing(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      if (event === 'SIGNED_OUT' || !session) {
        applyUser(GUEST_USER);
        setInitializing(false);
        return;
      }
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
        // Defer: calling Supabase inside this callback can deadlock the auth client
        setTimeout(() => void loadProfile(session), 0);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [applyUser, loadProfile]);

  const signIn: AuthContextType['signIn'] = async (email, password, captchaToken) => {
    setLoading(true);
    setError(null);
    try {
      if (!validateEmail(email)) throw new Error('Please enter a valid email address.');
      if (!password) throw new Error('Please enter your password.');
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
        options: captchaToken ? { captchaToken } : undefined,
      });
      if (err) throw new Error(friendlyAuthError(err.message));
      return { success: true };
    } catch (e: any) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  };

  const signUp: AuthContextType['signUp'] = async (email, fullName, phone, password, captchaToken) => {
    setLoading(true);
    setError(null);
    try {
      const cleanName = stripHtml(fullName).slice(0, 100);
      if (!validateEmail(email)) throw new Error('Please enter a valid email address.');
      if (cleanName.length < 2) throw new Error('Please enter your full name.');
      if (!password || password.length < 10) throw new Error('Your password must be at least 10 characters.');

      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          // The confirmation link brings people back to the page they signed up on (e.g. their listing form)
          emailRedirectTo: window.location.origin + window.location.pathname + window.location.search,
          captchaToken,
          // Everyone signs up as the same kind of member. Admin access can only be granted by the
          // site owner inside the Supabase dashboard — the database ignores anything sent here.
          data: {
            full_name: cleanName,
            phone: phone ? stripHtml(phone).slice(0, 30) : '',
            terms_version: TERMS_VERSION,
          },
        },
      });
      if (err) throw new Error(friendlyAuthError(err.message));

      // Supabase returns an empty identities list when the email is already registered
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('An account with this email already exists. Try signing in instead.');
      }
      return { success: true, needsEmailConfirmation: !data.session };
    } catch (e: any) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    db.clearAllDrafts();
    applyUser(GUEST_USER);
  };

  const resetPassword: AuthContextType['resetPassword'] = async (email, captchaToken) => {
    setLoading(true);
    setError(null);
    try {
      if (!validateEmail(email)) throw new Error('Please enter a valid email address.');
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin,
        captchaToken,
      });
      if (err) throw new Error(friendlyAuthError(err.message));
      return { success: true };
    } catch (e: any) {
      setError(e.message);
      return { success: false, error: e.message };
    } finally {
      setLoading(false);
    }
  };

  const updatePassword: AuthContextType['updatePassword'] = async (newPassword) => {
    if (newPassword.length < 10) return { success: false, error: 'Your password must be at least 10 characters.' };
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    if (err) return { success: false, error: friendlyAuthError(err.message) };
    setRecoveryMode(false);
    return { success: true };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !user.isGuest,
        isGuest: !!user.isGuest,
        initializing,
        loading,
        error,
        recoveryMode,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        clearError: () => setError(null),
        dismissRecovery: () => setRecoveryMode(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
