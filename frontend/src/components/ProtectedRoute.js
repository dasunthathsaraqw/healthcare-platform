"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(user?.role)
      ) {
        // Redirect to appropriate dashboard based on role
        if (user?.role === "admin") {
          router.push("/admin/dashboard");
        } else if (user?.role === "doctor") {
          router.push("/doctor/dashboard");
        } else {
          router.push("/dashboard");
        }
      }
    }
  }, [loading, isAuthenticated, user, router, allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return null;
  }

  return children;
}
