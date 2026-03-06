import React, { useState, useEffect, createContext, useContext } from 'react';
import api from '@/services/api';

interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  createdAt: string;
  emailVerified?: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData {
  email: string;
  password: string;
  nom: string;
  prenom: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Context for Auth
interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
  resendVerificationEmail: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Restore auth from localStorage synchronously
function getInitialAuth(): { user: User | null; isAuthenticated: boolean } {
  try {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      return { user: JSON.parse(savedUser), isAuthenticated: true };
    }
  } catch {}
  // Dev bypass
  if (import.meta.env.DEV) {
    const devUser: User = { id: '1', email: 'test@staging.com', nom: 'Robin', prenom: 'Timothy', createdAt: new Date().toISOString(), emailVerified: true };
    localStorage.setItem('token', 'dev-bypass');
    localStorage.setItem('user', JSON.stringify(devUser));
    return { user: devUser, isAuthenticated: true };
  }
  return { user: null, isAuthenticated: false };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const initial = getInitialAuth();
  const [user, setUser] = useState<User | null>(initial.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(initial.isAuthenticated);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post<AuthResponse>('/auth?action=login', credentials);
      const { user: loggedUser, token } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedUser));

      setUser(loggedUser);
      setIsAuthenticated(true);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erreur lors de la connexion';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post<AuthResponse>('/auth?action=register', data);
      const { user: registeredUser, token } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(registeredUser));

      setUser(registeredUser);
      setIsAuthenticated(true);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erreur lors de l\'inscription';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const resendVerificationEmail = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await api.post('/auth/email?action=resend', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        // Success - the email was sent
        return;
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Erreur lors de l\'envoi de l\'email';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    logout,
    updateUser,
    resendVerificationEmail
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};