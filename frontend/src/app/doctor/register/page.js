"use client";

import { useState } from "react";
import Link from "next/link";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

const SPECIALTIES = [
  "Cardiologist",
  "Dermatologist",
  "Neurologist",
  "Pediatrician",
  "Gynecologist",
  "Orthopedic",
  "General Physician",
];

const initialForm = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  specialty: "",
  qualifications: "",
  experience: "",
  consultationFee: "",
};

export default function DoctorRegisterPage() {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    setError("");
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Full name is required";
    if (!form.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = "Enter a valid email";
    if (!form.password) errors.password = "Password is required";
    else if (form.password.length < 6)
      errors.password = "Password must be at least 6 characters";
    if (!form.confirmPassword)
      errors.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword)
      errors.confirmPassword = "Passwords do not match";
    if (!form.specialty) errors.specialty = "Please select a specialty";
    if (form.experience && isNaN(Number(form.experience)))
      errors.experience = "Must be a number";
    if (form.consultationFee && isNaN(Number(form.consultationFee)))
      errors.consultationFee = "Must be a number";
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setError("");

    const qualificationsArray = form.qualifications
      ? form.qualifications.split(",").map((q) => q.trim()).filter(Boolean)
      : [];

    try {
      await axios.post(`${API_BASE}/doctors/register`, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        phone: form.phone.trim(),
        specialty: form.specialty,
        qualifications: qualificationsArray,
        experience: form.experience ? Number(form.experience) : 0,
        consultationFee: form.consultationFee
          ? Number(form.consultationFee)
          : 0,
      });

      setSuccess(true);
    } catch (err) {
      const msg =
        err.response?.data?.message || "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Success Screen ────────────────────────────────────────────────────────────
  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-xl shadow-blue-100 border border-blue-50 p-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-5">
              <svg
                className="w-10 h-10 text-green-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Registration Successful!
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-8">
              Your application has been submitted. Please wait for{" "}
              <strong className="text-gray-700">admin verification</strong>{" "}
              before you can log in. You will be notified once approved.
            </p>
            <Link
              href="/doctor/login"
              className="inline-block w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700
                text-white font-semibold text-sm tracking-wide text-center
                transition-all duration-200 shadow-md shadow-blue-200"
            >
              Go to Doctor Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // ── Registration Form ─────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-10 px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-100 opacity-40 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-cyan-100 opacity-40 blur-3xl" />
      </div>

      <div className="relative w-full max-w-2xl mx-auto">
        {/* Header */}
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
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Register as Doctor
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Join our network of healthcare professionals
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-blue-100 border border-blue-50 p-8">
          <form onSubmit={handleSubmit} className="space-y-6" noValidate>

            {/* ── Section: Personal Info ── */}
            <div>
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-4">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field
                  label="Full Name"
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Dr. Jane Smith"
                  value={form.name}
                  onChange={handleChange}
                  error={fieldErrors.name}
                  required
                />
                <Field
                  label="Email Address"
                  id="email"
                  name="email"
                  type="email"
                  placeholder="doctor@example.com"
                  value={form.email}
                  onChange={handleChange}
                  error={fieldErrors.email}
                  required
                />
                <Field
                  label="Password"
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  error={fieldErrors.password}
                  required
                />
                <Field
                  label="Confirm Password"
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  error={fieldErrors.confirmPassword}
                  required
                />
                <Field
                  label="Phone Number"
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+1 (555) 000-0000"
                  value={form.phone}
                  onChange={handleChange}
                  error={fieldErrors.phone}
                />
              </div>
            </div>

            {/* ── Section: Professional Info ── */}
            <div>
              <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-4">
                Professional Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Specialty dropdown */}
                <div>
                  <label
                    htmlFor="specialty"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Specialty <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="specialty"
                    name="specialty"
                    value={form.specialty}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-900
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                      transition duration-150 bg-gray-50 appearance-none
                      ${fieldErrors.specialty ? "border-red-300 bg-red-50" : "border-gray-200"}`}
                  >
                    <option value="">Select specialty…</option>
                    {SPECIALTIES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.specialty && (
                    <p className="text-xs text-red-500 mt-1">
                      {fieldErrors.specialty}
                    </p>
                  )}
                </div>

                <Field
                  label="Years of Experience"
                  id="experience"
                  name="experience"
                  type="number"
                  placeholder="e.g. 5"
                  value={form.experience}
                  onChange={handleChange}
                  error={fieldErrors.experience}
                  min="0"
                />
                <Field
                  label="Consultation Fee ($)"
                  id="consultationFee"
                  name="consultationFee"
                  type="number"
                  placeholder="e.g. 100"
                  value={form.consultationFee}
                  onChange={handleChange}
                  error={fieldErrors.consultationFee}
                  min="0"
                />
                <div>
                  <label
                    htmlFor="qualifications"
                    className="block text-sm font-medium text-gray-700 mb-1.5"
                  >
                    Qualifications
                    <span className="ml-1 text-gray-400 font-normal text-xs">
                      (comma-separated)
                    </span>
                  </label>
                  <input
                    id="qualifications"
                    name="qualifications"
                    type="text"
                    placeholder="MBBS, MD, FRCS"
                    value={form.qualifications}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900
                      placeholder-gray-400 text-sm focus:outline-none focus:ring-2
                      focus:ring-blue-500 focus:border-transparent transition duration-150 bg-gray-50"
                  />
                </div>
              </div>
            </div>

            {/* Global error */}
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

            {/* Submit */}
            <button
              id="doctor-register-btn"
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
                  Submitting…
                </>
              ) : (
                "Submit Registration"
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-sm space-y-2">
            <p className="text-gray-500">
              Already registered?{" "}
              <Link
                href="/doctor/login"
                className="text-blue-600 font-medium hover:text-blue-700 hover:underline"
              >
                Login as Doctor
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

        <p className="text-center text-xs text-gray-400 mt-5 px-4">
          After registration, an admin will review and verify your account
          before you can log in.
        </p>
      </div>
    </main>
  );
}

// ── Reusable Field Component ──────────────────────────────────────────────────
function Field({ label, id, error, required, ...inputProps }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-medium text-gray-700 mb-1.5"
      >
        {label}{" "}
        {required && <span className="text-red-400">*</span>}
      </label>
      <input
        id={id}
        {...inputProps}
        className={`w-full px-4 py-3 rounded-xl border text-gray-900 placeholder-gray-400
          text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          transition duration-150 bg-gray-50
          ${error ? "border-red-300 bg-red-50" : "border-gray-200"}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
