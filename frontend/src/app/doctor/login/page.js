"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import axios from "axios";

const API_BASE = (process.env.NEXT_PUBLIC_DOCTOR_API_URL || process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8080/api";

// ─── Slide data for healthcare/doctor theme ────────────────────────────────────────────────
const SLIDES = [
  {
    src: "/images/i1.jfif",
    headline: "AI-Powered Care,\nSmarter Decisions.",
    sub: "Harness the power of artificial intelligence to enhance diagnostic accuracy and patient outcomes.",
    accent: "rgba(1,44,96,0.70)",
    typeText: "Initializing AI systems...",
  },
  {
    src: "/images/i11.jfif",
    headline: "Instant Insights,\nBetter Outcomes.",
    sub: "Get real-time clinical insights and treatment recommendations at your fingertips.",
    accent: "rgba(10,60,120,0.68)",
    typeText: "Analyzing patient data...",
  },
  {
    src: "/images/i2.jpg",
    headline: "Streamlined Workflows,\nMore Patient Time.",
    sub: "Automate administrative tasks and focus on what matters most—your patients.",
    accent: "rgba(5,35,80,0.72)",
    typeText: "Optimizing workflows...",
  },
  {
    src: "/images/i4.jpg",
    headline: "Secure & Compliant,\nAlways.",
    sub: "Enterprise-grade security with full HIPAA compliance for complete peace of mind.",
    accent: "rgba(0,30,70,0.70)",
    typeText: "Verifying security protocols...",
  },
  {
    src: "/images/i6.jfif",
    headline: "Collaborative Care,\nConnected Teams.",
    sub: "Seamlessly collaborate with specialists and share insights across your network.",
    accent: "rgba(2,38,85,0.72)",
    typeText: "Connecting care teams...",
  },
  {
    src: "/images/i8.jfif",
    headline: "Data-Driven Decisions,\nProven Results.",
    sub: "Leverage predictive analytics to identify risks and improve patient care pathways.",
    accent: "rgba(8,50,110,0.70)",
    typeText: "Predictive analysis running...",
  },
  {
    src: "/images/i10.jfif",
    headline: "24/7 Virtual Support,\nAnytime Access.",
    sub: "Access patient records and AI insights from anywhere, at any time.",
    accent: "rgba(3,34,78,0.72)",
    typeText: "Preparing virtual environment...",
  },
  {
    src: "/images/i3.jpg",
    headline: "Empower Your Practice,\nElevate Care.",
    sub: "Join thousands of doctors using AI to transform healthcare delivery.",
    accent: "rgba(6,44,96,0.70)",
    typeText: "Calculating practice benefits...",
  },
  {
    src: "/images/i5.jfif",
    headline: "The Future of Medicine,\nIs Here.",
    sub: "Experience the next generation of AI-powered healthcare management.",
    accent: "rgba(0,28,68,0.72)",
    typeText: "Loading future of medicine...",
  },
];

const SLIDE_DURATION = 3000;

// ─── Typing animation hook ──────────────────────────────────────────────────
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

export default function DoctorLoginPage() {
  const router = useRouter();

  // Form state
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
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

  // Form handlers
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
    <div className="lt-page">
      {/* Background ambient blobs */}
      <div className="lt-blobs">
        <div className="lt-blob lt-blob-1" />
        <div className="lt-blob lt-blob-2" />
      </div>

      {/* ── Main card ── */}
      <div className="lt-card">
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

        {/* ── RIGHT: form panel ── */}
        <div className="lt-right">
          {/* Greeting */}
          <div className="lt-greeting">
            <p className="lt-hello">Welcome back, Doctor</p>
            <h1 className="lt-title">AI-Powered Healthcare Portal</h1>
            <p className="lt-subtitle">
              Sign in to access your dashboard and patient insights
            </p>
          </div>

          {/* Form */}
          <div className="lt-form-area">
            <form onSubmit={handleSubmit} className="lt-form" noValidate>
              {/* Email */}
              <div className="lt-input-group">
                <label htmlFor="email" className="lt-label">
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
                  placeholder="doctor@hospital.com"
                  className="lt-input"
                />
              </div>

              {/* Password */}
              <div className="lt-input-group">
                <label htmlFor="password" className="lt-label">
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
                  className="lt-input"
                />
              </div>

              {/* Error message */}
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
                id="doctor-login-btn"
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
                    Authenticating...
                  </>
                ) : (
                  "Login to Dashboard →"
                )}
              </button>
            </form>

            {/* Footer links */}
            <div className="lt-links">
              <p>
                Don't have an account?{" "}
                <Link href="/doctor/register" className="lt-link">
                  Register as Doctor
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

      {/* ══ All styles ── Keep exactly as in the original but with form styling added ── */}
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
          font-family: -apple-system, 'SF Pro Display', 'Helvetica Neue', Georgia, serif;
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
          max-width: 1000px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 0 32px 100px rgba(1,30,80,0.22), 0 8px 32px rgba(1,30,80,0.12);
          min-height: 600px;
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
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica;
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
          padding: 40px 36px 32px;
          position: relative;
          overflow-y: auto;
        }

        .lt-greeting { margin-bottom: 28px; }
        .lt-hello {
          font-size: 14px;
          color: #8fa5bf;
          font-weight: 500;
          letter-spacing: 0.01em;
          margin-bottom: 4px;
        }
        .lt-title {
          font-size: 26px;
          font-weight: 750;
          color: #1a2d4a;
          letter-spacing: -0.03em;
          line-height: 1.15;
          margin-bottom: 6px;
        }
        .lt-subtitle { font-size: 13px; color: #8fa5bf; line-height: 1.5; }

        .lt-form-area { flex: 1; }
        
        .lt-form {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .lt-input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        
        .lt-label {
          font-size: 13px;
          font-weight: 600;
          color: #1a2d4a;
          letter-spacing: 0.01em;
        }
        
        .lt-input {
          width: 100%;
          padding: 12px 16px;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 14px;
          transition: all 0.2s ease;
        }
        
        .lt-input:focus {
          outline: none;
          border-color: #012c60;
          box-shadow: 0 0 0 3px rgba(1,44,96,0.1);
          background: #fff;
        }
        
        .lt-error {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: #fef2f2;
          border-radius: 14px;
          color: #dc2626;
          font-size: 13px;
        }
        
        .lt-submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(145deg, #012c60 0%, #0a52b0 100%);
          color: #fff;
          font-weight: 650;
          font-size: 15px;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          box-shadow: 0 4px 18px rgba(1,44,96,0.26);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: transform 0.15s, box-shadow 0.15s;
        }
        
        .lt-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 28px rgba(1,44,96,0.34);
        }
        
        .lt-submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        
        .lt-links {
          margin-top: 24px;
          text-align: center;
        }
        
        .lt-link {
          color: #012c60;
          font-weight: 650;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        
        .lt-divider {
          height: 1px;
          background: #e2e8f0;
          margin: 16px 0;
        }
        
        .lt-back-link {
          font-size: 13px;
          color: #8fa5bf;
          text-decoration: none;
          transition: color 0.2s;
        }
        
        .lt-back-link:hover {
          color: #012c60;
        }

        .lt-footer {
          margin-top: 20px;
          text-align: center;
          font-size: 11px;
          color: #c0cfe0;
        }

        @keyframes lt-fadeIn  { from { opacity: 0; } to { opacity: 1; } }

        @media (max-width: 820px) {
          .lt-page { padding: 16px; }
          .lt-right { padding: 32px 24px 24px; }
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
            padding: 28px 20px 32px;
            min-height: calc(100vh - 280px);
          }
          .lt-bottom-copy { padding: 16px 18px 16px; }
          .lt-headline { font-size: 18px; margin-bottom: 4px; }
          .lt-sub { font-size: 12px; margin-bottom: 12px; }
          .lt-logo { top: 14px; left: 14px; }
          .lt-logo-text { font-size: 14px; }
          .lt-logo-icon { width: 26px; height: 26px; }
          .lt-greeting { margin-bottom: 20px; }
          .lt-title { font-size: 22px; }
          .lt-hello { font-size: 13px; }
          .lt-typing-box { max-width: 190px; padding: 14px 18px; gap: 8px; }
          .lt-typing-text { font-size: 12px; }
        }

        @media (max-width: 380px) {
          .lt-left { max-height: 220px; min-height: 220px; }
          .lt-right { padding: 20px 16px 24px; }
          .lt-title { font-size: 20px; }
          .lt-headline { font-size: 16px; }
        }

        /* Update font family for professional look */
.lt-page {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
}

/* Right panel text colors - highly visible */
.lt-right {
  background: #ffffff;
  display: flex;
  flex-direction: column;
  padding: 40px 36px 32px;
  position: relative;
  overflow-y: auto;
}

.lt-greeting { margin-bottom: 28px; }
.lt-hello {
  font-size: 14px;
  color: #2563eb;  /* Bright blue for visibility */
  font-weight: 600;
  letter-spacing: 0.02em;
  margin-bottom: 4px;
  text-transform: uppercase;
}
.lt-title {
  font-size: 28px;
  font-weight: 700;
  color: #0f172a;  /* Dark slate for high contrast */
  letter-spacing: -0.02em;
  line-height: 1.2;
  margin-bottom: 8px;
}
.lt-subtitle { 
  font-size: 14px; 
  color: #475569;  /* Medium-dark gray for good visibility */
  line-height: 1.5; 
}

.lt-label {
  font-size: 14px;
  font-weight: 600;
  color: #1e293b;  /* Dark slate */
  letter-spacing: 0.01em;
}

.lt-input {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
  background: #f8fafc;
  font-size: 15px;
  color: #0f172a;  /* Dark text for readability */
  font-weight: 500;
  transition: all 0.2s ease;
}

.lt-input::placeholder {
  color: #94a3b8;  /* Visible gray placeholder */
  font-weight: 400;
}

.lt-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  background: #ffffff;
}

.lt-error {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  background: #fef2f2;
  border-radius: 12px;
  border-left: 4px solid #dc2626;
  color: #991b1b;
  font-size: 14px;
  font-weight: 500;
}

.lt-submit-btn {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #1e40af 0%, #2563eb 100%);
  color: #ffffff;
  font-weight: 700;
  font-size: 15px;
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

.lt-links {
  margin-top: 28px;
  text-align: center;
}

.lt-links p {
  color: #334155;
  font-size: 14px;
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
  margin: 16px 0;
}

.lt-back-link {
  font-size: 13px;
  color: #64748b;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s;
}

.lt-back-link:hover {
  color: #2563eb;
}

.lt-footer {
  margin-top: 20px;
  text-align: center;
  font-size: 11px;
  color: #94a3b8;
  font-weight: 500;
}
      `}</style>
    </div>
  );
}