import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { normalizeRole, type Role } from './rbac';
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
  isAdmin: boolean;
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
    const store = useDataStore.getState();
    const cleanEmail = (email || '').trim().toLowerCase();

    // Check registered users in store
    const matchedUser = (store.users || []).find((u) => {
      const uEmail = (u.email || '').toLowerCase();
      const uCode = (u.employee_code || '').toLowerCase();
      const uUsername = uEmail.split('@')[0];
      return uEmail === cleanEmail || uCode === cleanEmail || uUsername === cleanEmail;
    });

    if (matchedUser) {
      if (matchedUser.is_active === false) {
        store.addLoginLog({
          username: matchedUser.email.split('@')[0],
          status: 'Blocked (Deactivated)',
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent || 'Chrome',
          timestamp,
        });
        return { error: 'Your account is deactivated. Please contact administrator.' };
      }

      if (matchedUser.password && password && matchedUser.password !== password) {
        store.addLoginLog({
          username: matchedUser.email.split('@')[0],
          status: 'Failed (Password mismatch)',
          ip_address: '127.0.0.1',
          user_agent: navigator.userAgent || 'Chrome',
          timestamp,
        });
        return { error: 'Invalid password. Please check your credentials.' };
      }

      const roleId = normalizeRole(matchedUser.role);
      const userSession: Session = {
        access_token: `token-${matchedUser.id}`,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: `refresh-${matchedUser.id}`,
        user: {
          id: matchedUser.id,
          app_metadata: {},
          user_metadata: { full_name: matchedUser.full_name, role: roleId },
          aud: 'authenticated',
          created_at: matchedUser.created_at || new Date().toISOString(),
          email: matchedUser.email,
          phone: matchedUser.phone || '',
          role: roleId,
          updated_at: new Date().toISOString(),
        },
      };

      const userProfile: UserProfile = {
        id: matchedUser.id,
        email: matchedUser.email,
        full_name: matchedUser.full_name,
        role: roleId,
        is_active: matchedUser.is_active,
      };

      setSession(userSession);
      setProfile(userProfile);

      store.updateUser(matchedUser.id, { last_login: timestamp });

      store.addLoginLog({
        username: matchedUser.email.split('@')[0],
        status: 'Success',
        ip_address: '127.0.0.1',
        user_agent: navigator.userAgent || 'Chrome',
        timestamp,
      });

      store.addAuditLog({
        username: matchedUser.full_name,
        module: 'Authentication',
        action: 'Login',
        description: `User ${matchedUser.full_name} (${roleId}) signed in successfully`,
        ip_address: '127.0.0.1',
        timestamp,
      });

      return { error: null };
    }

    // Default Super Admin fallback for initial admin setup
    if (cleanEmail === 'admin' || cleanEmail === 'admin@amkas.pk' || cleanEmail === 'admin123@gmail.com') {
      setSession(defaultDemoSession);
      setProfile(defaultProfile);

      store.addLoginLog({
        username: 'admin',
        status: 'Success',
        ip_address: '127.0.0.1',
        user_agent: navigator.userAgent || 'Chrome',
        timestamp,
      });

      return { error: null };
    }

    return { error: 'No user registered with these credentials. Please ask your administrator to register your account in Users & Employees.' };
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

  const isAdmin = profile?.role === 'super_admin';

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, isAdmin, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    return {
      session: defaultDemoSession,
      user: defaultDemoUser,
      profile: defaultProfile,
      isAdmin: true,
      loading: false,
      signIn: async () => ({ error: null }),
      signOut: async () => {},
    };
  }
  return ctx;
}
