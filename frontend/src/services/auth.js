import api from "./api";

class AuthService {
  /**
   * Register new user
   */
  async register(userData) {
    try {
      const response = await api.post("/auth/register", userData);
      if (response.data.success) {
        this.setSession(response.data.data.token, response.data.data.user);
      }
      return response.data;
    } catch (error) {
      throw (
        error.response?.data || {
          success: false,
          message: "Registration failed",
        }
      );
    }
  }

  /**
   * Login user
   */
  async login(email, password, role) {
    try {
      const response = await api.post("/auth/login", { email, password, role });
      if (response.data.success) {
        this.setSession(response.data.data.token, response.data.data.user);
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { success: false, message: "Login failed" };
    }
  }

  /**
   * Logout user
   */
  async logout() {
    try {
      await api.post("/auth/logout");
    } finally {
      this.clearSession();
    }
  }

  /**
   * Get current user
   */
  async getCurrentUser() {
    try {
      const response = await api.get("/auth/me");
      if (response.data.success) {
        return response.data.data.user;
      }
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Set session data - safe for server-side
   */
  setSession(token, user) {
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
    }
  }

  /**
   * Clear session data - safe for server-side
   */
  clearSession() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  /**
   * Get token - safe for server-side
   */
  getToken() {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  }

  /**
   * Get current user from storage - safe for server-side
   */
  getCurrentUserFromStorage() {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    }
    return null;
  }

  /**
   * Check if user is authenticated - safe for server-side
   */
  isAuthenticated() {
    if (typeof window !== "undefined") {
      return !!this.getToken();
    }
    return false;
  }

  /**
   * Check if user has specific role - safe for server-side
   */
  hasRole(role) {
    if (typeof window !== "undefined") {
      const user = this.getCurrentUserFromStorage();
      return user?.role === role;
    }
    return false;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(roles) {
    if (typeof window !== "undefined") {
      const user = this.getCurrentUserFromStorage();
      return user && roles.includes(user.role);
    }
    return false;
  }
}

export default new AuthService();
