'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  ReactNode,
} from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const createFallbackUser = (sessionUser: SupabaseUser): User => ({
    id: sessionUser.id,
    email: sessionUser.email ?? '',
    first_name: (sessionUser.user_metadata as any)?.first_name ?? '',
    last_name: (sessionUser.user_metadata as any)?.last_name ?? '',
    role:
      ((sessionUser.user_metadata as any)?.role as User['role']) ?? 'user',
  });

  const fetchUserProfile = useCallback(
    async (userId: string, sessionUser?: SupabaseUser) => {
      try {
        const { data } = await supabase
          .from<User>('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (data) {
          setUser(data);
          return;
        }

        if (sessionUser) {
          setUser(createFallbackUser(sessionUser));
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        if (sessionUser) {
          setUser(createFallbackUser(sessionUser));
        }
      }
    },
    [supabase],
  );

  useEffect(() => {
    let isMounted = true;

    const syncSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) return;

      if (error) {
        console.error('Failed to load Supabase session:', error);
        setUser(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        await fetchUserProfile(session.user.id, session.user);
      } else {
        setUser(null);
      }

      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isMounted) return;

      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true);
        await fetchUserProfile(session.user.id, session.user);
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      }
    });

    void syncSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserProfile]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setLoading(false);
      throw new Error(error.message);
    }

    const sessionUser = data.user || data.session?.user;
    if (sessionUser && data.session) {
      await fetchUserProfile(sessionUser.id, sessionUser);
    }

    setLoading(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

