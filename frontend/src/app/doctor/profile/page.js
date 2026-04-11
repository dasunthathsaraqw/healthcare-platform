"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

const API_BASE = (process.env.NEXT_PUBLIC_DOCTOR_API_URL || process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8080/api";

function authHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { Authorization: `Bearer ${t}` };
}

const SPECIALTIES = [
  "Cardiologist", "Dermatologist", "Neurologist", "Pediatrician",
  "Gynecologist", "Orthopedic", "General Physician",
];

// ─────────────────────────────────────────────────────────────────────────────
// TAGS INPUT
// ─────────────────────────────────────────────────────────────────────────────

function TagsInput({ label, tags, onChange, placeholder }) {
  const [input, setInput] = useState("");

  const addTag = () => {
    const val = input.trim();
    if (!val || tags.includes(val)) { setInput(""); return; }
    onChange([...tags, val]);
    setInput("");
  };

  const removeTag = (idx) => onChange(tags.filter((_, i) => i !== idx));

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); }
    if (e.key === "Backspace" && !input && tags.length) removeTag(tags.length - 1);
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <div className="flex flex-wrap gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 min-h-[44px]
        focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition cursor-text">
        {tags.map((t, i) => (
          <span key={i} className="flex items-center gap-1 px-2.5 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-lg">
            {t}
            <button type="button" onClick={() => removeTag(i)} className="opacity-70 hover:opacity-100 ml-0.5 leading-none">×</button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-24 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none"
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-1">Press Enter or comma to add</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION WRAPPER
// ─────────────────────────────────────────────────────────────────────────────

function Section({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-blue-50/30">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
          {icon}
        </div>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST (inline, no portal needed)
// ─────────────────────────────────────────────────────────────────────────────

function InlineToast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium
      ${type === "success" ? "bg-green-50 border border-green-200 text-green-700"
        : "bg-red-50 border border-red-200 text-red-700"}`}>
      {type === "success"
        ? <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
        : <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
      }
      {msg}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FIELD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, id, readOnly, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label} {readOnly && <span className="text-gray-300 font-normal">(read-only)</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const fileRef = useRef(null);

  // Profile state
  const [loading, setLoading]     = useState(true);
  const [saving,  setSaving]      = useState(false);
  const [toast,   setToast]       = useState({ msg: "", type: "" });

  const [profile, setProfile] = useState({
    name: "", email: "", phone: "", specialty: "",
    qualifications: [], experience: "", consultationFee: "",
    clinicAddress: "", bio: "", languages: [], profilePicture: "",
    isVerified: false, isActive: true,
  });

  // Password state
  const [pwForm, setPwForm]     = useState({ current: "", next: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);
  const [pwToast,  setPwToast]  = useState({ msg: "", type: "" });

  // ── Load profile ───────────────────────────────────────────────────────────
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/doctors/profile`, { headers: authHeaders() });
      const d = data.doctor || data;
      setProfile({
        name:            d.name            || "",
        email:           d.email           || "",
        phone:           d.phone           || "",
        specialty:       d.specialty       || "",
        qualifications:  d.qualifications  || [],
        experience:      d.experience      ?? "",
        consultationFee: d.consultationFee ?? "",
        clinicAddress:   d.clinicAddress   || "",
        bio:             d.bio             || "",
        languages:       d.languages       || [],
        profilePicture:  d.profilePicture  || "",
        isVerified:      d.isVerified      || false,
        isActive:        d.isActive        !== false,
      });
      // Update localStorage with fresh data
      localStorage.setItem("user", JSON.stringify(d));
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to load profile", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const set = (key, val) => setProfile((p) => ({ ...p, [key]: val }));

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: "", type: "" }), 4000);
  };

  // ── Save profile ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await axios.put(`${API_BASE}/doctors/profile`, {
        name:            profile.name,
        phone:           profile.phone,
        specialty:       profile.specialty,
        qualifications:  profile.qualifications,
        experience:      Number(profile.experience) || 0,
        consultationFee: Number(profile.consultationFee) || 0,
        clinicAddress:   profile.clinicAddress,
        bio:             profile.bio,
        languages:       profile.languages,
      }, { headers: authHeaders() });

      const updated = data.doctor || data;
      localStorage.setItem("user", JSON.stringify(updated));
      showToast("Profile updated successfully!", "success");
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Change password ────────────────────────────────────────────────────────
  const handlePasswordChange = async () => {
    const errs = {};
    if (!pwForm.current)  errs.current  = "Current password required";
    if (!pwForm.next)     errs.next     = "New password required";
    else if (pwForm.next.length < 6) errs.next = "Min 6 characters";
    if (!pwForm.confirm)  errs.confirm  = "Please confirm password";
    else if (pwForm.next !== pwForm.confirm) errs.confirm = "Passwords don't match";
    if (Object.keys(errs).length) { setPwErrors(errs); return; }

    setPwSaving(true);
    try {
      await axios.put(`${API_BASE}/doctors/change-password`, {
        currentPassword: pwForm.current,
        newPassword:     pwForm.next,
      }, { headers: authHeaders() });
      setPwForm({ current: "", next: "", confirm: "" });
      setPwErrors({});
      setPwToast({ msg: "Password updated successfully!", type: "success" });
      setTimeout(() => setPwToast({ msg: "", type: "" }), 4000);
    } catch (err) {
      setPwToast({ msg: err.response?.data?.message || "Failed to update password", type: "error" });
      setTimeout(() => setPwToast({ msg: "", type: "" }), 4000);
    } finally {
      setPwSaving(false);
    }
  };

  // ── Profile picture (placeholder handler) ─────────────────────────────────
  const handlePicChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setProfile((p) => ({ ...p, profilePicture: url }));
  };

  const inputCls = (err) =>
    `w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-800 placeholder-gray-400
    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition
    ${err ? "border-red-300 bg-red-50" : "border-gray-200"}`;

  const readOnlyCls = "w-full px-3.5 py-2.5 rounded-xl border border-gray-100 text-sm text-gray-500 bg-gray-50 cursor-not-allowed";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your personal and professional information</p>
      </div>

      {loading ? (
        <div className="space-y-6">
          {[1,2,3].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 animate-pulse">
              <div className="h-4 w-32 bg-gray-200 rounded" />
              {[1,2].map((j) => <div key={j} className="h-10 bg-gray-100 rounded-xl" />)}
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Global toast */}
          {toast.msg && <InlineToast msg={toast.msg} type={toast.type} />}

          {/* ── Profile Picture ──────────────────────────────────────────── */}
          <Section
            title="Profile Picture"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
          >
            <div className="flex items-center gap-6">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {profile.profilePicture
                    ? <img src={profile.profilePicture} alt="Profile" className="w-full h-full object-cover" />
                    : (profile.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "DR")
                  }
                </div>
                <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center
                  ${profile.isVerified ? "bg-green-500" : "bg-amber-400"}`}>
                  {profile.isVerified
                    ? <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
                    : <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg>
                  }
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${profile.isVerified ? "bg-green-100 text-green-700" : "bg-amber-50 text-amber-600"}`}>
                    {profile.isVerified ? "✓ Verified" : "⏳ Pending Verification"}
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${profile.isActive ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                    {profile.isActive ? "● Active" : "● Inactive"}
                  </span>
                </div>
                <input type="file" accept="image/*" ref={fileRef} onChange={handlePicChange} className="hidden" />
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                  Upload Photo
                </button>
                <p className="text-[10px] text-gray-400">JPG, PNG or GIF · Max 2MB</p>
              </div>
            </div>
          </Section>

          {/* ── Personal Information ────────────────────────────────────── */}
          <Section
            title="Personal Information"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name" id="name">
                <input id="name" type="text" value={profile.name} onChange={(e) => set("name", e.target.value)}
                  placeholder="Dr. Jane Smith" className={inputCls(false)} />
              </Field>
              <Field label="Email Address" id="email" readOnly>
                <input id="email" type="email" value={profile.email} readOnly className={readOnlyCls} />
              </Field>
              <Field label="Phone Number" id="phone">
                <input id="phone" type="tel" value={profile.phone} onChange={(e) => set("phone", e.target.value)}
                  placeholder="+1 (555) 000-0000" className={inputCls(false)} />
              </Field>
              <Field label="Role" readOnly>
                <input type="text" value="Doctor" readOnly className={readOnlyCls} />
              </Field>
            </div>
          </Section>

          {/* ── Professional Information ────────────────────────────────── */}
          <Section
            title="Professional Information"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Specialty */}
              <Field label="Specialty" id="specialty">
                <select id="specialty" value={profile.specialty} onChange={(e) => set("specialty", e.target.value)}
                  className={inputCls(false) + " cursor-pointer appearance-none"}>
                  <option value="">Select specialty…</option>
                  {SPECIALTIES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>

              <Field label="Years of Experience" id="experience">
                <input id="experience" type="number" min="0" value={profile.experience}
                  onChange={(e) => set("experience", e.target.value)}
                  placeholder="e.g. 5" className={inputCls(false)} />
              </Field>

              <Field label="Consultation Fee ($)" id="consultationFee">
                <input id="consultationFee" type="number" min="0" value={profile.consultationFee}
                  onChange={(e) => set("consultationFee", e.target.value)}
                  placeholder="e.g. 100" className={inputCls(false)} />
              </Field>

              <Field label="Clinic Address" id="clinicAddress">
                <input id="clinicAddress" type="text" value={profile.clinicAddress}
                  onChange={(e) => set("clinicAddress", e.target.value)}
                  placeholder="123 Medical Centre, City" className={inputCls(false)} />
              </Field>

              <div className="sm:col-span-2">
                <TagsInput
                  label="Qualifications"
                  tags={profile.qualifications}
                  onChange={(v) => set("qualifications", v)}
                  placeholder="Type and press Enter (e.g. MBBS, MD)"
                />
              </div>

              <div className="sm:col-span-2">
                <TagsInput
                  label="Languages Spoken"
                  tags={profile.languages}
                  onChange={(v) => set("languages", v)}
                  placeholder="e.g. English, Hindi"
                />
              </div>

              <div className="sm:col-span-2">
                <Field label="Bio / Introduction" id="bio">
                  <textarea id="bio" rows={4} value={profile.bio}
                    onChange={(e) => set("bio", e.target.value)}
                    placeholder="Brief introduction for patients…"
                    className={inputCls(false) + " resize-none"} />
                </Field>
              </div>
            </div>

            {/* Save button */}
            <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <button onClick={fetchProfile} disabled={loading}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                Discard Changes
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white
                  text-sm font-bold shadow-md shadow-blue-200 disabled:opacity-60 transition-colors">
                {saving
                  ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Saving…</>
                  : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>Save Changes</>
                }
              </button>
            </div>
          </Section>

          {/* ── Change Password ─────────────────────────────────────────── */}
          <Section
            title="Change Password"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>}
          >
            {pwToast.msg && <div className="mb-4"><InlineToast msg={pwToast.msg} type={pwToast.type} /></div>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Current Password" id="curPw">
                  <input id="curPw" type="password" value={pwForm.current}
                    onChange={(e) => { setPwForm((p) => ({ ...p, current: e.target.value })); setPwErrors((e2) => ({ ...e2, current: "" })); }}
                    placeholder="••••••••" className={inputCls(pwErrors.current)} />
                  {pwErrors.current && <p className="text-xs text-red-500 mt-1">{pwErrors.current}</p>}
                </Field>
              </div>
              <Field label="New Password" id="newPw">
                <input id="newPw" type="password" value={pwForm.next}
                  onChange={(e) => { setPwForm((p) => ({ ...p, next: e.target.value })); setPwErrors((e2) => ({ ...e2, next: "" })); }}
                  placeholder="Min. 6 characters" className={inputCls(pwErrors.next)} />
                {pwErrors.next && <p className="text-xs text-red-500 mt-1">{pwErrors.next}</p>}
              </Field>
              <Field label="Confirm New Password" id="confirmPw">
                <input id="confirmPw" type="password" value={pwForm.confirm}
                  onChange={(e) => { setPwForm((p) => ({ ...p, confirm: e.target.value })); setPwErrors((e2) => ({ ...e2, confirm: "" })); }}
                  placeholder="Re-enter new password" className={inputCls(pwErrors.confirm)} />
                {pwErrors.confirm && <p className="text-xs text-red-500 mt-1">{pwErrors.confirm}</p>}
              </Field>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 flex justify-end">
              <button onClick={handlePasswordChange} disabled={pwSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white
                  text-sm font-bold shadow-md shadow-gray-300 disabled:opacity-60 transition-colors">
                {pwSaving
                  ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Updating…</>
                  : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>Update Password</>
                }
              </button>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}
