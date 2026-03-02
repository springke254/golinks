import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import * as authService from '../services/authService';
import { getAccessToken, setAccessToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const decodeAndSetUser = useCallback((token) => {
    try {
      const decoded = jwtDecode(token);
      setUser({
        id: decoded.sub,
        email: decoded.email,
      });
    } catch {
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  // Attempt silent refresh on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const data = await authService.refresh();
        if (data.accessToken) {
          decodeAndSetUser(data.accessToken);
        }
      } catch {
        setUser(null);
        setAccessToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [decodeAndSetUser]);

  const login = useCallback(async (credentials) => {
    const data = await authService.login(credentials);
    decodeAndSetUser(data.accessToken);
    return data;
  }, [decodeAndSetUser]);

  const signup = useCallback(async (data) => {
    return await authService.signup(data);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const logoutAll = useCallback(async () => {
    await authService.logoutAll();
    setUser(null);
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    logoutAll,
    refreshUser: async () => {
      const token = getAccessToken();
      if (token) {
        decodeAndSetUser(token);
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
