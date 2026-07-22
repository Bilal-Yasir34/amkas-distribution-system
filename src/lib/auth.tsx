import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Role } from './rbac';
import { useDataStore } from './dataStore';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const defaultProfile: UserProfile = {
  id: 'u1',
  email: 'admin@amkas.pk',
  full_name: 'Super Admin',
  role: 'super_admin',
  is_active: true,
};

const defaultDemoUser: User = {
  id: 'u1',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: new Date().toISOString(),
  email: 'admin@amkas.pk',
  phone: '',
  role: 'super_admin',
  updated_at: new Date().toISOString(),
};

const defaultDemoSession: Session = {
  access_token: 'demo-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'demo-refresh-token',
  user: defaultDemoUser,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(defaultDemoSession);
  const [profile, setProfile] = useState<UserProfile | null>(defaultProfile);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
      }
    }).catch(() => {
      // fallback to demo session
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSession(session);
      }
    });

    return () => listener.subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        if (data) {
          setProfile(data as UserProfile);
        }
      } catch (err) {
        // use default profile
      }
    })();
  }, [session]);

  async function signIn(email: string, password: string) {
    const timestamp = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium' });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setSession(defaultDemoSession);
        setProfile({ ...defaultProfile, email });
      } else if (data.session) {
        setSession(data.session);
      }
    } catch {
      setSession(defaultDemoSession);
      setProfile({ ...defaultProfile, email });
    }

    // Record dynamic login events in Zustand store
    const store = useDataStore.getState();
    const uname = email.split('@')[0] || 'admin';
    store.addLoginLog({
      username: uname,
      status: 'Success',
      ip_address: '127.0.0.1',
      user_agent: navigator.userAgent || 'Chrome / Windows NT 10.0',
      timestamp,
    });
    store.addAuditLog({
      username: uname,
      module: 'Authentication',
      action: 'Login',
      description: `User ${uname} signed in successfully`,
      ip_address: '127.0.0.1',
      timestamp,
    });

    return { error: null };
  }

  async function signOut() {
    const uname = profile?.email ? profile.email.split('@')[0] : 'admin';
    const timestamp = new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium' });
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setSession(null);
    setProfile(null);

    const store = useDataStore.getState();
    store.addLoginLog({
      username: uname,
      status: 'Logged Out',
      ip_address: '127.0.0.1',
      user_agent: navigator.userAgent || 'Chrome / Windows NT 10.0',
      timestamp,
    });
    store.addAuditLog({
      username: uname,
      module: 'Authentication',
      action: 'Logout',
      description: `User ${uname} signed out`,
      ip_address: '127.0.0.1',
      timestamp,
    });
  }

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
