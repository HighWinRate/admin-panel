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
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user profile:', error);
        }

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
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const syncSession = async () => {
      try {
        const timeoutMs = 15000;
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('Session sync timeout')),
            timeoutMs,
          );
        });

        const sessionPromise = supabase.auth.getSession();

        const result = await Promise.race([sessionPromise, timeoutPromise]);
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }

        if (!isMounted) return;

        const { data: { session }, error } = result as Awaited<ReturnType<typeof supabase.auth.getSession>>;

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
      } catch (err) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        const isTimeout = err instanceof Error && err.message === 'Session sync timeout';
        if (isTimeout) {
          // شبکه یا Supabase کند جواب داده؛ بدون خطا فقط به صفحه ورود برمی‌گردیم
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
        } else {
          console.error('Auth initialization error:', err);
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
        }
      }
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
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [supabase, fetchUserProfile]);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    const sessionUser = data.user || data.session?.user;
    if (sessionUser && data.session) {
      await fetchUserProfile(sessionUser.id, sessionUser);
    }
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

