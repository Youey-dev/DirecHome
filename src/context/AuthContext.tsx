import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types/listing';
import { storage, DEFAULT_USER, PRESET_USERS, GUEST_USER } from '../lib/storage';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { stripHtml, validateEmail } from '../lib/security';

interface AuthContextType {
  user: UserProfile;
  isAuthenticated: boolean;
  isGuest: boolean;
  isCustomAccount: boolean;
  isSupabaseLive: boolean;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, fullName: string, role: 'buyer' | 'seller', phone?: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  switchPresetUser: (presetKey: 'guest' | 'buyer' | 'seller' | 'admin') => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => storage.getActiveUser());
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Initial sync with local active user
    const currentUser = storage.getActiveUser();
    setUser(currentUser);

    // 2. If Supabase is configured, check for live active session
    if (supabase && isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          const userMeta = session.user.user_metadata || {};
          const liveProfile: UserProfile = {
            id: session.user.id,
            email: session.user.email || '',
            name: userMeta.full_name || session.user.email?.split('@')[0] || 'User',
            phone: userMeta.phone,
            role: userMeta.role === 'seller' ? 'seller' : userMeta.role === 'admin' ? 'admin' : 'buyer'
          };
          storage.setActiveUser(liveProfile);
          setUser(liveProfile);
        }
      });

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          const userMeta = session.user.user_metadata || {};
          const liveProfile: UserProfile = {
            id: session.user.id,
            email: session.user.email || '',
            name: userMeta.full_name || session.user.email?.split('@')[0] || 'User',
            phone: userMeta.phone,
            role: userMeta.role === 'seller' ? 'seller' : userMeta.role === 'admin' ? 'admin' : 'buyer'
          };
          storage.setActiveUser(liveProfile);
          setUser(liveProfile);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const clearError = () => setError(null);

  // Sign In
  const signIn = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setLoading(true);

    const cleanEmail = stripHtml(email).toLowerCase().trim();
    if (!validateEmail(cleanEmail)) {
      setLoading(false);
      const msg = 'Please enter a valid email address.';
      setError(msg);
      return { success: false, error: msg };
    }

    try {
      // If live Supabase client exists and password is provided, try real Supabase auth
      if (supabase && isSupabaseConfigured && password) {
        const { data, error: sbError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (sbError) {
          // If user doesn't exist or wrong password in Supabase, return message
          setLoading(false);
          setError(sbError.message);
          return { success: false, error: sbError.message };
        }

        if (data.user) {
          const userMeta = data.user.user_metadata || {};
          const authenticatedProfile: UserProfile = {
            id: data.user.id,
            email: data.user.email || cleanEmail,
            name: userMeta.full_name || cleanEmail.split('@')[0],
            phone: userMeta.phone,
            role: userMeta.role === 'seller' ? 'seller' : userMeta.role === 'admin' ? 'admin' : 'buyer'
          };
          storage.setActiveUser(authenticatedProfile);
          setUser(authenticatedProfile);
          setLoading(false);
          return { success: true };
        }
      }

      // Seamless fallback or demo account sign-in
      const isSeller = cleanEmail.includes('seller') || cleanEmail.includes('sarah');
      const isAdmin = cleanEmail.includes('admin') || cleanEmail.includes('compliance');
      const role = isAdmin ? 'admin' : isSeller ? 'seller' : 'buyer';
      
      const localProfile: UserProfile = {
        id: `user-${Date.now()}`,
        email: cleanEmail,
        name: cleanEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        role
      };

      storage.setActiveUser(localProfile);
      setUser(localProfile);
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || 'Failed to sign in. Please try again.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  // Sign Up / Create Account
  const signUp = async (
    email: string, 
    fullName: string, 
    role: 'buyer' | 'seller', 
    phone?: string, 
    password?: string
  ): Promise<{ success: boolean; error?: string }> => {
    setError(null);
    setLoading(true);

    const cleanEmail = stripHtml(email).toLowerCase().trim();
    const cleanName = stripHtml(fullName).trim();
    const cleanPhone = phone ? stripHtml(phone).trim() : undefined;

    if (!validateEmail(cleanEmail)) {
      setLoading(false);
      const msg = 'Please enter a valid email address.';
      setError(msg);
      return { success: false, error: msg };
    }

    if (!cleanName || cleanName.length < 2) {
      setLoading(false);
      const msg = 'Please enter your full name.';
      setError(msg);
      return { success: false, error: msg };
    }

    try {
      // If live Supabase client exists, register with real Supabase Auth
      if (supabase && isSupabaseConfigured && password) {
        const { data, error: sbError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              phone: cleanPhone,
              role
            }
          }
        });

        if (sbError) {
          setLoading(false);
          setError(sbError.message);
          return { success: false, error: sbError.message };
        }

        if (data.user) {
          const createdProfile: UserProfile = {
            id: data.user.id,
            email: cleanEmail,
            name: cleanName,
            phone: cleanPhone,
            role,
            termsAcceptedAt: new Date().toISOString(),
            termsVersion: '2026-v1.0-draft'
          };
          storage.setActiveUser(createdProfile);
          setUser(createdProfile);
          setLoading(false);
          return { success: true };
        }
      }

      // Local / preview profile creation
      const localProfile: UserProfile = {
        id: `user-${Date.now()}`,
        email: cleanEmail,
        name: cleanName,
        phone: cleanPhone,
        role,
        termsAcceptedAt: new Date().toISOString(),
        termsVersion: '2026-v1.0-draft'
      };

      storage.setActiveUser(localProfile);
      setUser(localProfile);
      setLoading(false);
      return { success: true };
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || 'Failed to create account.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  // Sign Out
  const signOut = async () => {
    if (supabase && isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch {
        // Continue with local cleanup
      }
    }
    // Switch to guest visitor
    storage.logout();
    setUser(GUEST_USER);
  };

  // Quick Persona Switcher (Convenient for testing buyer vs seller views)
  const switchPresetUser = (presetKey: 'guest' | 'buyer' | 'seller' | 'admin') => {
    if (presetKey === 'guest') {
      storage.logout();
      setUser(GUEST_USER);
      return;
    }
    const target = PRESET_USERS[presetKey] || DEFAULT_USER;
    storage.setActiveUser(target);
    setUser(target);
  };

  const isGuest = user.id === 'guest' || Boolean(user.isGuest) || user.role === 'guest' || !user.email;
  const isAuthenticated = !isGuest;
  const isCustomAccount = isAuthenticated && 
                          user.id !== DEFAULT_USER.id && 
                          user.id !== PRESET_USERS.seller.id && 
                          user.id !== PRESET_USERS.admin.id;

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isGuest,
        isCustomAccount,
        isSupabaseLive: isSupabaseConfigured,
        loading,
        error,
        signIn,
        signUp,
        signOut,
        switchPresetUser,
        clearError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
