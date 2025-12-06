import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        const response = await authAPI.validate();
        if (response.success) {
          setUser(response.data.user);
        }
      } catch (error) {
        localStorage.removeItem('auth_token');
      }
    }
    setLoading(false);
  };

  const login = async (username, password) => {
    try {
      const response = await authAPI.login(username, password);
      if (response.success) {
        localStorage.setItem('auth_token', response.data.token);
        setUser(response.data.user);
        return { success: true };
      }
    } catch (error) {
      return { success: false, error: error.error?.message || 'Login failed' };
    }
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
