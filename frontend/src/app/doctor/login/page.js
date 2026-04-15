"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";

const API_BASE = (process.env.NEXT_PUBLIC_DOCTOR_API_URL || process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8080/api";

export default function DoctorLoginPage() {
  const router = useRouter();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data } = await axios.post(`${API_BASE}/doctors/login`, {
        email: form.email,
        password: form.password,
      });

      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.doctor));
        localStorage.setItem("role", "doctor");
        router.push("/doctor/dashboard");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Invalid credentials or account not verified";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-100 opacity-50 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-cyan-100 opacity-50 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 shadow-lg mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Doctor Portal</h1>
          <p className="text-gray-500 text-sm mt-1">
            Sign in to manage your patients
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-blue-100 border border-blue-50 p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            Login as Doctor
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="doctor@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition duration-150 bg-gray-50"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 placeholder-gray-400 text-sm
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  transition duration-150 bg-gray-50"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
                <svg
                  className="w-4 h-4 text-red-500 mt-0.5 shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <button
              id="doctor-login-btn"
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                text-white font-semibold text-sm tracking-wide
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                disabled:opacity-60 disabled:cursor-not-allowed
                transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-blue-200"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-4 h-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Signing in…
                </>
              ) : (
                "Login as Doctor"
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-6 space-y-3 text-center text-sm">
            <p className="text-gray-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/doctor/register"
                className="text-blue-600 font-medium hover:text-blue-700 hover:underline"
              >
                Register as Doctor
              </Link>
            </p>
            <div className="border-t border-gray-100 pt-3">
              <Link
                href="/login"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Back to Patient Login
              </Link>
            </div>
          </div>
        </div>

        {/* Verification notice */}
        <p className="text-center text-xs text-gray-400 mt-5 px-4">
          New accounts require admin verification before you can log in.
        </p>
      </div>
    </main>
  );
}
