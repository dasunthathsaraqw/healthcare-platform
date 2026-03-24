import api from "./api";

const isBrowser = typeof window !== "undefined";

class AuthService {
  async register(userData) {
    try {
      console.log("AuthService: Sending registration request", userData);
      const response = await api.post("/auth/register", userData);
      console.log("AuthService: Response received", response.data);

      if (isBrowser && response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error("AuthService: Registration error", error);
      // Ensure we always throw an object with message
      if (error.response?.data) {
        throw error.response.data;
      }
      throw { message: error.message || "Registration failed" };
    }
  }

  async login(email, password) {
    try {
      console.log("AuthService: Sending login request");
      const response = await api.post("/auth/login", { email, password });
      console.log("AuthService: Login response", response.data);

      if (isBrowser && response.data.token) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      console.error("AuthService: Login error", error);
      if (error.response?.data) {
        throw error.response.data;
      }
      throw { message: error.message || "Login failed" };
    }
  }

  logout() {
    if (isBrowser) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
  }

  async getCurrentUser() {
    try {
      const response = await api.get("/auth/me");
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to get user" };
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      const response = await api.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to change password" };
    }
  }

  async updateProfile(profileData) {
    try {
      const response = await api.put("/auth/profile", profileData);
      if (isBrowser && response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: "Failed to update profile" };
    }
  }

  isAuthenticated() {
    if (!isBrowser) return false;
    return !!localStorage.getItem("token");
  }

  getCurrentUserFromStorage() {
    if (!isBrowser) return null;
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        console.error("Failed to parse user", e);
        return null;
      }
    }
    return null;
  }
}

export default new AuthService();
