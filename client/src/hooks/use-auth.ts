import { useState, useEffect } from "react";

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  avatar?: string;
  organizationId: string;
  organization?: any;
}

interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
  };
}

const API_BASE_URL = "http://localhost:5000";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem("auth_token"));

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      console.log("useAuth: Checking authentication...");
      if (token) {
        console.log("useAuth: Token found, validating...");
        try {
          const response = await fetch(`${API_BASE_URL}/api/v1/auth/me`, {
            headers: {
              "Authorization": `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log("useAuth: Token valid, user data:", data);
            setUser(data.data);
          } else {
            console.log("useAuth: Token invalid, removing...");
            // Token is invalid, remove it
            localStorage.removeItem("auth_token");
            setToken(null);
          }
        } catch (error) {
          console.error("useAuth: Auth check failed:", error);
          localStorage.removeItem("auth_token");
          setToken(null);
        }
      } else {
        console.log("useAuth: No token found");
      }
      setIsLoading(false);
      console.log("useAuth: Auth check complete, isAuthenticated:", !!user && !!token);
    };

    checkAuth();
  }, [token]);

  const login = async (identifier: string, password: string) => {
    try {
      console.log("useAuth: Starting login process...");
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ identifier, password }),
      });

      const data: AuthResponse = await response.json();
      console.log("useAuth: Login response:", data);

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      if (data.success) {
        console.log("useAuth: Login successful, updating state...");
        // Store token and user data
        localStorage.setItem("auth_token", data.data.token);
        setToken(data.data.token);
        setUser(data.data.user);
        console.log("useAuth: State updated, token:", data.data.token, "user:", data.data.user);
        return data;
      } else {
        throw new Error(data.message || "Login failed");
      }
    } catch (error: any) {
      console.error("useAuth: Login error:", error);
      throw new Error(error.message || "Login failed");
    }
  };

  const logout = () => {
    console.log("useAuth: Logging out...");
    localStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
    console.log("useAuth: Logout complete, state cleared");
  };

  const isAuthenticated = !!user && !!token;

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    token,
  };
}
