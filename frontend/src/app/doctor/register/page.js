"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";

const API_BASE = (process.env.NEXT_PUBLIC_DOCTOR_API_URL || process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8080/api";

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

// ─── Slide data for healthcare/doctor theme ────────────────────────────────────────────────
const SLIDES = [
  {
    src: "/images/i1.jfif",
    headline: "Join the Future\nof Healthcare",
    sub: "Register today and become part of our AI-powered medical network.",
    accent: "rgba(1,44,96,0.70)",
    typeText: "Initializing registration...",
  },
  {
    src: "/images/i11.jfif",
    headline: "Connect with\nPatients Globally",
    sub: "Reach more patients and provide care beyond geographical boundaries.",
    accent: "rgba(10,60,120,0.68)",
    typeText: "Connecting networks...",
  },
  {
    src: "/images/i2.jpg",
    headline: "AI-Assisted\nDiagnosis",
    sub: "Leverage cutting-edge AI tools to enhance your diagnostic accuracy.",
    accent: "rgba(5,35,80,0.72)",
    typeText: "Loading AI tools...",
  },
  {
    src: "/images/i4.jpg",
    headline: "Join 10,000+\nTrusted Doctors",
    sub: "Be part of a growing community of healthcare professionals.",
    accent: "rgba(0,30,70,0.70)",
    typeText: "Building community...",
  },
  {
    src: "/images/i6.jfif",
    headline: "Simplify Your\nPractice Management",
    sub: "Streamlined scheduling, billing, and patient records all in one place.",
    accent: "rgba(2,38,85,0.72)",
    typeText: "Setting up workspace...",
  },
  {
    src: "/images/i8.jfif",
    headline: "Continuous\nLearning Platform",
    sub: "Access CME courses and stay updated with the latest medical advances.",
    accent: "rgba(8,50,110,0.70)",
    typeText: "Preparing resources...",
  },
  {
    src: "/images/i10.jfif",
    headline: "Secure & Private\nPlatform",
    sub: "Enterprise-grade security with full HIPAA compliance.",
    accent: "rgba(3,34,78,0.72)",
    typeText: "Verifying security...",
  },
  {
    src: "/images/i3.jpg",
    headline: "Start Your Journey\nToday",
    sub: "Complete registration and get verified to start practicing.",
    accent: "rgba(6,44,96,0.70)",
    typeText: "Finalizing setup...",
  },
  {
    src: "/images/i5.jfif",
    headline: "Your Patients\nAre Waiting",
    sub: "Join now and start making a difference in healthcare.",
    accent: "rgba(0,28,68,0.72)",
    typeText: "Almost there...",
  },
];

const SLIDE_DURATION = 3000;

// ─── Typing animation hook testn111 ──────────────────────────────────────────────────
function useTypingText(text, active) {
  const [displayed, setDisplayed] = useState("");
  const rafRef = useRef(null);

  useEffect(() => {
    if (!active) {
      setDisplayed("");
      return;
    }
    let i = 0;
    setDisplayed("");
    const type = () => {
      if (i <= text.length) {
        setDisplayed(text.slice(0, i));
        i++;
        rafRef.current = setTimeout(type, 60);
      }
    };
    rafRef.current = setTimeout(type, 60);
    return () => {
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, [text, active]);

  return displayed;
}

export default function DoctorRegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Slide state
  const [activeSlide, setActiveSlide] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [typingSlideIdx, setTypingSlideIdx] = useState(null);

  const nextSlide = SLIDES[(typingSlideIdx ?? activeSlide + 1) % SLIDES.length];
  const typedText = useTypingText(nextSlide.typeText, transitioning);

  // Auto-advance slides
  useEffect(() => {
    const id = setInterval(() => {
      const next = (activeSlide + 1) % SLIDES.length;
      setTypingSlideIdx(next);
      setTransitioning(true);
      setTimeout(() => {
        setActiveSlide(next);
        setTransitioning(false);
        setTypingSlideIdx(null);
      }, 2000);
    }, SLIDE_DURATION);
    return () => clearInterval(id);
  }, [activeSlide]);

  const goToSlide = (idx) => {
    if (idx === activeSlide || transitioning) return;
    setTypingSlideIdx(idx);
    setTransitioning(true);
    setTimeout(() => {
      setActiveSlide(idx);
      setTransitioning(false);
      setTypingSlideIdx(null);
    }, 2000);
  };

  const slide = SLIDES[activeSlide];

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
      const response = await axios.post(`${API_BASE}/doctors/register`, {
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

      // On successful registration, redirect to login
      if (response.status === 200 || response.status === 201) {
        router.push("/doctor/login");
      }
    } catch (err) {
      console.error("Registration error:", err);

      let errorMessage = "Registration failed. Please try again.";

      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      }

      setError(errorMessage);
      setLoading(false);
    }
  };

  // ── Registration Form with Image Slider ──
  return (
    <div className="lt-page">
      {/* Background ambient blobs */}
      <div className="lt-blobs">
        <div className="lt-blob lt-blob-1" />
        <div className="lt-blob lt-blob-2" />
      </div>

      {/* ── Main card ── */}
      <div className="lt-card lt-card-register">
        {/* ── LEFT: image panel ── */}
        <div className="lt-left">
          {/* Progress bar */}
          <div className="lt-progress-track">
            <div
              key={activeSlide}
              className="lt-progress-bar"
              style={{ animationDuration: `${SLIDE_DURATION}ms` }}
            />
          </div>

          {/* Slide images */}
          {SLIDES.map((s, i) => (
            <div
              key={i}
              className="lt-slide-img"
              style={{
                opacity: i === activeSlide ? (transitioning ? 0 : 1) : 0,
                zIndex: i === activeSlide ? 2 : 1,
              }}
            >
              <Image
                src={s.src}
                alt={`Slide ${i + 1}`}
                fill
                style={{ objectFit: "cover", objectPosition: "center" }}
                priority={i === 0}
              />
            </div>
          ))}

          {/* Gradient overlay */}
          <div
            className="lt-overlay"
            style={{
              background: `linear-gradient(
              to bottom,
              rgba(0,10,30,0.10) 0%,
              rgba(0,10,30,0.20) 30%,
              ${slide.accent} 70%,
              rgba(0,5,20,0.88) 100%
            )`,
            }}
          />

          {/* Typing text overlay — shown during transition */}
          {transitioning && (
            <div className="lt-typing-overlay">
              <div className="lt-typing-box">
                <p className="lt-typing-text">
                  {typedText}
                  <span className="lt-cursor">|</span>
                </p>
              </div>
            </div>
          )}

          {/* Bottom copy + dots */}
          <div className="lt-bottom-copy">
            <h2
              className="lt-headline"
              style={{
                opacity: transitioning ? 0 : 1,
                transform: transitioning ? "translateY(8px)" : "translateY(0)",
              }}
            >
              {slide.headline}
            </h2>
            <p
              className="lt-sub"
              style={{
                opacity: transitioning ? 0 : 1,
                transform: transitioning ? "translateY(6px)" : "translateY(0)",
                transitionDelay: "0.05s",
              }}
            >
              {slide.sub}
            </p>

            {/* Dot nav */}
            <div className="lt-dots">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goToSlide(i)}
                  className="lt-dot"
                  style={{
                    width: i === activeSlide ? "24px" : "7px",
                    background: i === activeSlide ? "#fff" : "rgba(255,255,255,0.38)",
                  }}
                  aria-label={`Go to slide ${i + 1}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: registration form panel ── */}
        <div className="lt-right lt-right-register">
          {/* Greeting */}
          <div className="lt-greeting">
            <p className="lt-hello">Join Our Network</p>
            <h1 className="lt-title">Doctor Registration</h1>
            <p className="lt-subtitle">
              Create your account to start your journey with AI Health
            </p>
          </div>

          {/* Form */}
          <div className="lt-form-area">
            <form onSubmit={handleSubmit} className="lt-form" noValidate>
              {/* Personal Information Section */}
              <div className="lt-section">
                <h3 className="lt-section-title">Personal Information</h3>
                <div className="lt-form-grid">
                  <div className="lt-input-group">
                    <label htmlFor="name" className="lt-label">
                      Full Name <span className="lt-required">*</span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Dr. Jane Smith"
                      value={form.name}
                      onChange={handleChange}
                      className={`lt-input ${fieldErrors.name ? "lt-input-error" : ""}`}
                    />
                    {fieldErrors.name && <p className="lt-error-text">{fieldErrors.name}</p>}
                  </div>

                  <div className="lt-input-group">
                    <label htmlFor="email" className="lt-label">
                      Email Address <span className="lt-required">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="doctor@hospital.com"
                      value={form.email}
                      onChange={handleChange}
                      className={`lt-input ${fieldErrors.email ? "lt-input-error" : ""}`}
                    />
                    {fieldErrors.email && <p className="lt-error-text">{fieldErrors.email}</p>}
                  </div>

                  <div className="lt-input-group">
                    <label htmlFor="password" className="lt-label">
                      Password <span className="lt-required">*</span>
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Min. 6 characters"
                      value={form.password}
                      onChange={handleChange}
                      className={`lt-input ${fieldErrors.password ? "lt-input-error" : ""}`}
                    />
                    {fieldErrors.password && <p className="lt-error-text">{fieldErrors.password}</p>}
                  </div>

                  <div className="lt-input-group">
                    <label htmlFor="confirmPassword" className="lt-label">
                      Confirm Password <span className="lt-required">*</span>
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="Re-enter password"
                      value={form.confirmPassword}
                      onChange={handleChange}
                      className={`lt-input ${fieldErrors.confirmPassword ? "lt-input-error" : ""}`}
                    />
                    {fieldErrors.confirmPassword && <p className="lt-error-text">{fieldErrors.confirmPassword}</p>}
                  </div>

                  <div className="lt-input-group">
                    <label htmlFor="phone" className="lt-label">
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={form.phone}
                      onChange={handleChange}
                      className="lt-input"
                    />
                  </div>
                </div>
              </div>

              {/* Professional Information Section */}
              <div className="lt-section">
                <h3 className="lt-section-title">Professional Information</h3>
                <div className="lt-form-grid">
                  <div className="lt-input-group">
                    <label htmlFor="specialty" className="lt-label">
                      Specialty <span className="lt-required">*</span>
                    </label>
                    <select
                      id="specialty"
                      name="specialty"
                      value={form.specialty}
                      onChange={handleChange}
                      className={`lt-select ${fieldErrors.specialty ? "lt-input-error" : ""}`}
                    >
                      <option value="">Select specialty…</option>
                      {SPECIALTIES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {fieldErrors.specialty && <p className="lt-error-text">{fieldErrors.specialty}</p>}
                  </div>

                  <div className="lt-input-group">
                    <label htmlFor="experience" className="lt-label">
                      Years of Experience
                    </label>
                    <input
                      id="experience"
                      name="experience"
                      type="number"
                      placeholder="e.g. 5"
                      value={form.experience}
                      onChange={handleChange}
                      min="0"
                      className={`lt-input ${fieldErrors.experience ? "lt-input-error" : ""}`}
                    />
                    {fieldErrors.experience && <p className="lt-error-text">{fieldErrors.experience}</p>}
                  </div>

                  <div className="lt-input-group">
                    <label htmlFor="consultationFee" className="lt-label">
                      Consultation Fee ($)
                    </label>
                    <input
                      id="consultationFee"
                      name="consultationFee"
                      type="number"
                      placeholder="e.g. 100"
                      value={form.consultationFee}
                      onChange={handleChange}
                      min="0"
                      className={`lt-input ${fieldErrors.consultationFee ? "lt-input-error" : ""}`}
                    />
                    {fieldErrors.consultationFee && <p className="lt-error-text">{fieldErrors.consultationFee}</p>}
                  </div>

                  <div className="lt-input-group">
                    <label htmlFor="qualifications" className="lt-label">
                      Qualifications
                      <span className="lt-hint"> (comma-separated)</span>
                    </label>
                    <input
                      id="qualifications"
                      name="qualifications"
                      type="text"
                      placeholder="MBBS, MD, FRCS"
                      value={form.qualifications}
                      onChange={handleChange}
                      className="lt-input"
                    />
                  </div>
                </div>
              </div>

              {/* Global error */}
              {error && (
                <div className="lt-error">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p>{error}</p>
                </div>
              )}

              {/* Submit button */}
              <button
                id="doctor-register-btn"
                type="submit"
                disabled={loading}
                className="lt-submit-btn"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Submitting...
                  </>
                ) : (
                  "Submit Registration →"
                )}
              </button>
            </form>

            {/* Footer links */}
            <div className="lt-links">
              <p>
                Already registered?{" "}
                <Link href="/doctor/login" className="lt-link">
                  Login as Doctor
                </Link>
              </p>
              <div className="lt-divider" />
              <Link href="/login" className="lt-back-link">
                ← Back to Patient Login
              </Link>
            </div>
          </div>

          <p className="lt-footer">© {new Date().getFullYear()} AI Health · Secure & HIPAA Compliant</p>
        </div>
      </div>

      {/* ══ All styles ── */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lt-page {
          min-height: 100vh;
          background: linear-gradient(rgba(200, 216, 240, 0.7), rgba(189, 208, 238, 0.7)), 
                      url('/images/test1.jpg'); 
          background-size: cover;
          background-position: center;
          background-attachment: fixed;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          position: relative;
          overflow: hidden;
        }

        .lt-blobs { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
        .lt-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(60px);
        }
        .lt-blob-1 {
          top: -15%; left: -10%;
          width: 60vw; height: 60vw;
          background: radial-gradient(circle, rgba(80,130,220,0.18) 0%, transparent 70%);
        }
        .lt-blob-2 {
          bottom: -15%; right: -5%;
          width: 50vw; height: 50vw;
          background: radial-gradient(circle, rgba(60,100,200,0.14) 0%, transparent 70%);
        }

        .lt-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1200px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 32px 100px rgba(1,30,80,0.22), 0 8px 32px rgba(1,30,80,0.12);
          min-height: 600px;
        }

        .lt-card-register {
          max-width: 1300px;
        }

        .lt-left {
          position: relative;
          overflow: hidden;
          background: #0a1f4a;
          min-height: 600px;
        }

        .lt-progress-track {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: rgba(255,255,255,0.15);
          z-index: 6;
          overflow: hidden;
        }
        .lt-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6));
          border-radius: 0 2px 2px 0;
          animation: lt-progress linear forwards;
        }
        @keyframes lt-progress {
          from { width: 0%; }
          to   { width: 100%; }
        }

        .lt-slide-img {
          position: absolute;
          inset: 0;
          transition: opacity 0.55s cubic-bezier(0.4,0,0.2,1);
        }

        .lt-overlay {
          position: absolute;
          inset: 0;
          z-index: 3;
          transition: background 0.6s ease;
        }

        .lt-typing-overlay {
          position: absolute;
          inset: 0;
          z-index: 8;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 8, 24, 0.3);
          animation: lt-fadeIn 0.2s ease;
        }

        .lt-typing-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          background: transparent;
          border: none;
          max-width: 90%;
          width: auto;
        }

        .lt-typing-text {
          font-size: 28px;
          color: #ffffff;
          font-weight: 700;
          letter-spacing: -0.02em;
          text-align: center;
          line-height: 1.2;
          min-height: 40px;
          text-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }

        .lt-cursor {
          display: inline-block;
          color: #ffffff;
          animation: lt-blink 0.7s step-end infinite;
          margin-left: 4px;
        }
        @keyframes lt-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }

        .lt-logo {
          position: absolute;
          top: 20px; left: 20px;
          z-index: 5;
          display: flex;
          align-items: center;
          gap: 8px;
          text-decoration: none;
        }
        .lt-logo-icon {
          width: 32px; height: 32px;
          background: rgba(255,255,255,0.18);
          border: 1px solid rgba(255,255,255,0.30);
          border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(8px);
        }
        .lt-logo-text {
          font-size: 16px;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.01em;
          text-shadow: 0 1px 8px rgba(0,0,0,0.3);
        }

        .lt-bottom-copy {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          z-index: 5;
          padding: 28px 28px 24px;
        }
        .lt-headline {
          font-size: 26px;
          font-weight: 750;
          color: #fff;
          line-height: 1.18;
          letter-spacing: -0.025em;
          white-space: pre-line;
          text-shadow: 0 2px 16px rgba(0,0,0,0.35);
          margin-bottom: 8px;
          transition: opacity 0.45s ease, transform 0.45s ease;
        }
        .lt-sub {
          font-size: 13px;
          color: rgba(255,255,255,0.78);
          line-height: 1.5;
          text-shadow: 0 1px 8px rgba(0,0,0,0.3);
          margin-bottom: 18px;
          transition: opacity 0.45s ease, transform 0.45s ease;
        }

        .lt-dots { display: flex; gap: 7px; align-items: center; }
        .lt-dot {
          height: 7px;
          border-radius: 4px;
          border: none;
          cursor: pointer;
          padding: 0;
          transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
        }

        .lt-right {
          background: #ffffff;
          display: flex;
          flex-direction: column;
          padding: 32px 32px 28px;
          position: relative;
          overflow-y: auto;
          max-height: 85vh;
        }

        .lt-right-register {
          padding: 24px 28px 24px;
        }

        .lt-greeting { margin-bottom: 20px; }
        .lt-hello {
          font-size: 13px;
          color: #2563eb;
          font-weight: 600;
          letter-spacing: 0.02em;
          margin-bottom: 4px;
          text-transform: uppercase;
        }
        .lt-title {
          font-size: 26px;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin-bottom: 6px;
        }
        .lt-subtitle { 
          font-size: 13px; 
          color: #475569;
          line-height: 1.4; 
        }

        .lt-form-area { flex: 1; }
        
        .lt-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .lt-section {
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 16px;
        }

        .lt-section-title {
          font-size: 13px;
          font-weight: 700;
          color: #1e40af;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin-bottom: 14px;
        }

        .lt-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        
        .lt-input-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        
        .lt-label {
          font-size: 12px;
          font-weight: 600;
          color: #1e293b;
          letter-spacing: 0.01em;
        }

        .lt-required {
          color: #ef4444;
        }

        .lt-hint {
          font-size: 10px;
          color: #94a3b8;
          font-weight: normal;
        }
        
        .lt-input, .lt-select {
          width: 100%;
          padding: 10px 14px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          background: #f8fafc;
          font-size: 14px;
          color: #0f172a;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        .lt-select {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%2364748b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 18px;
        }
        
        .lt-input::placeholder {
          color: #94a3b8;
          font-weight: 400;
          font-size: 13px;
        }
        
        .lt-input:focus, .lt-select:focus {
          outline: none;
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
          background: #ffffff;
        }

        .lt-input-error {
          border-color: #ef4444;
          background: #fef2f2;
        }

        .lt-error-text {
          font-size: 11px;
          color: #ef4444;
          margin-top: 2px;
        }
        
        .lt-error {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: #fef2f2;
          border-radius: 10px;
          border-left: 4px solid #dc2626;
          color: #991b1b;
          font-size: 13px;
          font-weight: 500;
        }
        
        .lt-submit-btn {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
          color: #ffffff;
          font-weight: 700;
          font-size: 14px;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        
        .lt-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(37, 99, 235, 0.4);
          background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 100%);
        }
        
        .lt-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .lt-links {
          margin-top: 20px;
          text-align: center;
        }
        
        .lt-links p {
          color: #334155;
          font-size: 13px;
        }
        
        .lt-link {
          color: #2563eb;
          font-weight: 700;
          text-decoration: none;
          transition: color 0.2s;
        }
        
        .lt-link:hover {
          color: #1d4ed8;
          text-decoration: underline;
        }
        
        .lt-divider {
          height: 1px;
          background: #e2e8f0;
          margin: 14px 0;
        }
        
        .lt-back-link {
          font-size: 12px;
          color: #64748b;
          text-decoration: none;
          font-weight: 500;
          transition: color 0.2s;
        }
        
        .lt-back-link:hover {
          color: #2563eb;
        }

        .lt-footer {
          margin-top: 16px;
          text-align: center;
          font-size: 10px;
          color: #94a3b8;
          font-weight: 500;
        }

        @keyframes lt-fadeIn  { from { opacity: 0; } to { opacity: 1; } }

        @media (max-width: 900px) {
          .lt-form-grid {
            grid-template-columns: 1fr;
            gap: 12px;
          }
          .lt-right-register {
            padding: 20px;
          }
        }

        @media (max-width: 820px) {
          .lt-page { padding: 16px; }
          .lt-right { padding: 24px 20px; }
          .lt-title { font-size: 22px; }
          .lt-headline { font-size: 22px; }
        }

        @media (max-width: 640px) {
          .lt-page {
            padding: 0;
            align-items: flex-start;
          }
          .lt-card {
            grid-template-columns: 1fr;
            border-radius: 0;
            min-height: 100vh;
            box-shadow: none;
            max-width: 100%;
          }
          .lt-left {
            min-height: 260px;
            max-height: 280px;
            order: 0;
          }
          .lt-right {
            order: 1;
            padding: 20px 16px 24px;
            min-height: calc(100vh - 280px);
            max-height: none;
          }
          .lt-bottom-copy { padding: 16px 18px 16px; }
          .lt-headline { font-size: 18px; margin-bottom: 4px; }
          .lt-sub { font-size: 12px; margin-bottom: 12px; }
          .lt-logo { top: 14px; left: 14px; }
          .lt-logo-text { font-size: 14px; }
          .lt-logo-icon { width: 26px; height: 26px; }
          .lt-greeting { margin-bottom: 16px; }
          .lt-title { font-size: 20px; }
          .lt-hello { font-size: 12px; }
          .lt-typing-box { max-width: 190px; padding: 14px 18px; }
          .lt-typing-text { font-size: 12px; }
          .lt-form-grid { gap: 10px; }
          .lt-section-title { font-size: 11px; margin-bottom: 10px; }
          .lt-input, .lt-select { padding: 8px 12px; font-size: 13px; }
          .lt-submit-btn { padding: 10px; font-size: 13px; }
        }

        @media (max-width: 380px) {
          .lt-left { max-height: 200px; min-height: 200px; }
          .lt-right { padding: 16px 14px 20px; }
          .lt-title { font-size: 18px; }
          .lt-headline { font-size: 16px; }
        }
      `}</style>
    </div>
  );
}