"use client";

import { createContext, useContext, useState, useEffect } from "react";
import authService from "@/services/authService";
import { useRouter } from "next/navigation";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

// Helper for browser check
const isBrowser = typeof window !== "undefined";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // This only runs in browser, so safe to use localStorage
    const storedUser = authService.getCurrentUserFromStorage();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      setUser(response.user);
      return { success: true, user: response.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      setUser(response.user);
      return { success: true, user: response.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    if (isBrowser) {
      router.push("/login");
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await authService.updateProfile(profileData);
      setUser(response.user);
      return { success: true, user: response.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    isAuthenticated: isBrowser ? authService.isAuthenticated() : false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
