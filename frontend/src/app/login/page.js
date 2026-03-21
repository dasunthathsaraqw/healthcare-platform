"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Dynamically import the login form with SSR disabled
const LoginForm = dynamic(() => import("../../components/LoginForm"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>
  ),
});

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
