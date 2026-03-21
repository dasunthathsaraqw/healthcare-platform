"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";

// Dynamically import the register form with SSR disabled
const RegisterForm = dynamic(() => import("../../components/RegisterForm"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-600">Loading...</div>
    </div>
  ),
});

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-600">Loading...</div>
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
