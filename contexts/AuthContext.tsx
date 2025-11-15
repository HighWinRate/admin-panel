'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminApiClient, User } from '@/lib/api';

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

  useEffect(() => {
    // Check if user is logged in
    const token = adminApiClient.getToken();
    if (token) {
      // Try to decode JWT to get user info
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // Set user from token payload (basic info)
        setUser({
          id: payload.sub,
          email: payload.email,
          first_name: '', // Will be updated when we fetch full user data
          last_name: '',
          role: payload.role,
        });
      } catch (error) {
        console.error('Error decoding token:', error);
        // If token is invalid, clear it
        adminApiClient.logout();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await adminApiClient.login({ email, password });
    if (response.access_token) {
      adminApiClient.setToken(response.access_token);
    }
    setUser(response.user);
  };

  const logout = () => {
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

