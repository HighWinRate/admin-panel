'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminApiClient, User } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;
    let subscription: { unsubscribe: () => void } | null = null;
    let isInitialized = false;

    // Function to fetch user profile
    const fetchUserProfile = async (userId: string, accessToken: string) => {
      if (!isMounted) return;
      
      adminApiClient.setToken(accessToken);
      
      try {
        const fullUser = await adminApiClient.getUser(userId);
        if (isMounted) {
          setUser(fullUser);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // If fetch fails, use basic info from Supabase
        if (isMounted) {
          // We'll set user from session in onAuthStateChange if needed
        }
      }
    };

    // Check Supabase session once on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted || isInitialized) return;
      isInitialized = true;
      
      if (session && session.user) {
        fetchUserProfile(session.user.id, session.access_token).finally(() => {
          if (isMounted) {
            setLoading(false);
          }
        });
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes (only significant changes)
    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      
      // Only handle significant auth events to avoid loops
      if (event === 'SIGNED_IN') {
        if (session && session.user) {
          fetchUserProfile(session.user.id, session.access_token);
        }
      } else if (event === 'SIGNED_OUT') {
        adminApiClient.setToken(null);
        setUser(null);
        setLoading(false);
      }
      // Ignore TOKEN_REFRESHED and other events to reduce requests
    });

    subscription = authSubscription;

    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    // Use Supabase Auth for login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.session) {
      // Set token in API client
      adminApiClient.setToken(data.session.access_token);
      
      // Fetch user profile from our API
      const fullUser = await adminApiClient.getUser(data.user.id);
      setUser(fullUser);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    adminApiClient.logout();
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

