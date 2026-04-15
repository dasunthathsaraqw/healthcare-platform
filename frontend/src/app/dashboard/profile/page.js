"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";
import toast, { Toaster } from "react-hot-toast";

// ─── Skeleton Components ──────────────────────────────────────────────────────

function IdentityCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center animate-pulse">
      <div className="w-24 h-24 mx-auto bg-gray-200 rounded-full mb-4" />
      <div className="h-5 w-36 bg-gray-200 rounded mx-auto mb-2" />
      <div className="h-3.5 w-48 bg-gray-100 rounded mx-auto mb-4" />
      <div className="h-6 w-24 bg-gray-100 rounded-full mx-auto" />
      <div className="mt-8 border-t pt-6">
        <div className="h-3 w-28 bg-gray-100 rounded mb-3" />
        <div className="h-4 w-20 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="p-6 animate-pulse space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {[1, 2, 3, 4].map((i) => (
          <div key={i}>
            <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
            <div className="h-10 w-full bg-gray-100 rounded-lg" />
          </div>
        ))}
      </div>
      <div className="pt-4 flex justify-end">
        <div className="h-10 w-32 bg-gray-200 rounded-lg" />
      </div>
    </div>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────

const PHONE_REGEX = /^[+]?[\d\s\-().]{7,20}$/;

function validatePersonalForm(data) {
  const errors = {};
  if (!data.name.trim()) errors.name = "Full name is required";
  else if (data.name.trim().length < 2) errors.name = "Name must be at least 2 characters";
  if (data.phone && !PHONE_REGEX.test(data.phone))
    errors.phone = "Please enter a valid phone number";
  return errors;
}

// ─── Input Component ──────────────────────────────────────────────────────────

function FormInput({ label, id, error, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      <input
        id={id}
        className={`w-full p-2.5 bg-gray-50 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-sm ${
          error ? "border-red-400 bg-red-50 focus:ring-red-400" : "border-gray-200"
        }`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10A8 8 0 11 2 10a8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();

  const [activeTab, setActiveTab]       = useState("personal");
  const [isUpdating, setIsUpdating]     = useState(false);
  const [formErrors, setFormErrors]     = useState({});

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    dateOfBirth: "",
    address: "",
  });

  const [medicalHistory, setMedicalHistory] = useState([]);
  const [newCondition, setNewCondition]     = useState("");
  const [conditionError, setConditionError] = useState("");

  useEffect(() => {
    if (user) {
      setFormData({
        name:        user.name || "",
        phone:       user.phone || "",
        address:     user.address || "",
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split("T")[0] : "",
      });
      setMedicalHistory(user.medicalHistory || []);
    }
  }, [user]);

  // ── Personal info update ──────────────────────────────────────────────────────
  const handlePersonalUpdate = async (e) => {
    e.preventDefault();
    const errors = validatePersonalForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error("Please fix the highlighted errors before saving.");
      return;
    }
    setFormErrors({});
    setIsUpdating(true);

    const loadingToast = toast.loading("Saving your profile...");
    const result = await updateProfile(formData);
    toast.dismiss(loadingToast);

    if (result.success) {
      toast.success("Profile updated successfully!", { duration: 4000 });
    } else {
      toast.error(result.error || "Failed to update profile. Please try again.");
    }
    setIsUpdating(false);
  };

  // ── Medical history ───────────────────────────────────────────────────────────
  const handleAddCondition = (e) => {
    e.preventDefault();
    const trimmed = newCondition.trim();
    if (!trimmed) {
      setConditionError("Please enter a condition name.");
      return;
    }
    if (trimmed.length > 100) {
      setConditionError("Condition name is too long (max 100 chars).");
      return;
    }
    if (medicalHistory.includes(trimmed)) {
      setConditionError("This condition is already in your list.");
      return;
    }
    setConditionError("");
    setMedicalHistory([...medicalHistory, trimmed]);
    setNewCondition("");
  };

  const handleRemoveCondition = (conditionToRemove) =>
    setMedicalHistory(medicalHistory.filter((c) => c !== conditionToRemove));

  const handleSaveMedical = async () => {
    setIsUpdating(true);
    const loadingToast = toast.loading("Saving medical history...");
    try {
      await api.put("/patients/history", { conditions: medicalHistory });
      toast.dismiss(loadingToast);
      toast.success("Medical history saved successfully! 🏥", { duration: 4000 });
    } catch (error) {
      toast.dismiss(loadingToast);
      const msg = error.response?.data?.message || "Failed to save medical history.";
      toast.error(msg);
    }
    setIsUpdating(false);
  };

  // ── Loading state ──────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <div className="max-w-6xl mx-auto p-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <IdentityCardSkeleton />
          </div>
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="flex border-b border-gray-100 animate-pulse">
                <div className="flex-1 py-4 px-6 bg-gray-100 h-14" />
                <div className="flex-1 py-4 px-6 bg-gray-50 h-14" />
              </div>
              <FormSkeleton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const initials = user.name
    ?.trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "P";

  return (
    <>
      {/* Toast container — bottom-right, matches design system */}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: "10px",
            background: "#1e293b",
            color: "#f8fafc",
            fontSize: "14px",
            fontWeight: 500,
          },
          success: {
            iconTheme: { primary: "#22c55e", secondary: "#f8fafc" },
          },
          error: {
            iconTheme: { primary: "#ef4444", secondary: "#f8fafc" },
          },
        }}
      />

      <div className="max-w-6xl mx-auto p-4 mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* ── LEFT: Identity Card ───────────────────────────────────────── */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
              <div className="w-24 h-24 mx-auto bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center mb-4 shadow-md">
                <span className="text-3xl text-white font-extrabold">{initials}</span>
              </div>
              <h2 className="text-xl font-bold text-gray-800">{user.name}</h2>
              <p className="text-sm text-gray-500 mb-4">{user.email}</p>
              <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wide border border-blue-100">
                {user.role} Account
              </span>

              <div className="mt-8 border-t pt-6 text-left space-y-3">
                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Account Status</p>
                <div className="flex items-center text-sm text-gray-600 gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 shadow-sm" />
                  <span>Active &amp; Verified</span>
                </div>
                {user.phone && (
                  <div className="flex items-center text-sm text-gray-500 gap-2">
                    <span className="text-gray-400">📞</span>
                    {user.phone}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Tabbed Form ────────────────────────────────────────── */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

              {/* Tab Navigation */}
              <div className="flex border-b border-gray-100">
                {["personal", "medical"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setFormErrors({}); }}
                    className={`flex-1 py-4 text-sm font-semibold transition-all duration-200 ${
                      activeTab === tab
                        ? "bg-blue-50 text-blue-600 border-b-2 border-blue-600"
                        : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {tab === "personal" ? "Personal Details" : "Clinical History"}
                  </button>
                ))}
              </div>

              <div className="p-6">

                {/* ── TAB 1: PERSONAL DETAILS ────────────────────────────── */}
                {activeTab === "personal" && (
                  <form onSubmit={handlePersonalUpdate} className="space-y-5" noValidate>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormInput
                        label="Full Name"
                        id="name"
                        type="text"
                        value={formData.name}
                        onChange={(e) => {
                          setFormData({ ...formData, name: e.target.value });
                          if (formErrors.name) setFormErrors({ ...formErrors, name: "" });
                        }}
                        error={formErrors.name}
                        required
                      />
                      <FormInput
                        label="Date of Birth"
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                        max={new Date().toISOString().split("T")[0]}
                      />
                      <FormInput
                        label="Phone Number"
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => {
                          setFormData({ ...formData, phone: e.target.value });
                          if (formErrors.phone) setFormErrors({ ...formErrors, phone: "" });
                        }}
                        error={formErrors.phone}
                        placeholder="+1 555 000 1234"
                      />
                      <FormInput
                        label="Address"
                        id="address"
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        placeholder="City, Country"
                      />
                    </div>
                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="flex items-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {isUpdating ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Saving…
                          </>
                        ) : (
                          "Update Profile"
                        )}
                      </button>
                    </div>
                  </form>
                )}

                {/* ── TAB 2: MEDICAL HISTORY ─────────────────────────────── */}
                {activeTab === "medical" && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-base font-bold text-gray-800 mb-1">Known Conditions &amp; Allergies</h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Add your chronic conditions, allergies, or past major surgeries to help doctors assist you better.
                      </p>

                      {/* Tag badges */}
                      <div className="flex flex-wrap gap-2 mb-4 p-4 min-h-[80px] bg-gray-50 border border-gray-200 rounded-lg transition-all">
                        {medicalHistory.length === 0 ? (
                          <span className="text-gray-400 text-sm italic self-center">No medical history recorded yet.</span>
                        ) : (
                          medicalHistory.map((condition, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-50 text-red-700 border border-red-200"
                            >
                              {condition}
                              <button
                                type="button"
                                onClick={() => handleRemoveCondition(condition)}
                                className="w-4 h-4 rounded-full bg-red-100 hover:bg-red-200 text-red-600 flex items-center justify-center text-xs font-bold transition-colors"
                                title={`Remove ${condition}`}
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      {/* Add condition */}
                      <form onSubmit={handleAddCondition} className="flex gap-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={newCondition}
                            onChange={(e) => {
                              setNewCondition(e.target.value);
                              setConditionError("");
                            }}
                            placeholder="e.g., Asthma, Penicillin Allergy..."
                            className={`w-full p-2.5 border rounded-lg focus:ring-2 outline-none text-sm transition-all ${
                              conditionError
                                ? "border-red-400 focus:ring-red-400 bg-red-50"
                                : "border-gray-300 focus:ring-blue-500"
                            }`}
                          />
                          {conditionError && (
                            <p className="mt-1 text-xs text-red-500">{conditionError}</p>
                          )}
                        </div>
                        <button
                          type="submit"
                          className="shrink-0 bg-white border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                        >
                          Add Tag
                        </button>
                      </form>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end">
                      <button
                        onClick={handleSaveMedical}
                        disabled={isUpdating}
                        className="flex items-center gap-2 bg-red-600 text-white font-semibold py-2.5 px-6 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdating ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Saving…
                          </>
                        ) : (
                          "Save Medical Data"
                        )}
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}