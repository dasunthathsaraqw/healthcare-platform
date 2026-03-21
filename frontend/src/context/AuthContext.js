"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import authService from "@/services/auth";

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load user on mount
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      setLoading(true);
      const userData = authService.getCurrentUserFromStorage();

      if (userData && authService.isAuthenticated()) {
        // Verify token by fetching current user
        const freshUser = await authService.getCurrentUser();
        if (freshUser) {
          setUser(freshUser);
        } else {
          // Token invalid
          authService.clearSession();
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error("Error loading user:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (email, password, role) => {
    try {
      setError(null);
      const response = await authService.login(email, password, role);

      if (response.success) {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      } else {
        setError(response.message);
        return { success: false, error: response.message };
      }
    } catch (err) {
      const errorMessage = err.message || "Login failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const register = useCallback(async (userData) => {
    try {
      setError(null);
      const response = await authService.register(userData);

      if (response.success) {
        setUser(response.data.user);
        return { success: true, user: response.data.user };
      } else {
        setError(response.message);
        return { success: false, error: response.message };
      }
    } catch (err) {
      const errorMessage = err.message || "Registration failed";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setError(null);
    }
  }, []);

  const value = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    isPatient: user?.role === "patient",
    isDoctor: user?.role === "doctor",
    isAdmin: user?.role === "admin",
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
