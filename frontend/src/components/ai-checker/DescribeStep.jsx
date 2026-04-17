"use client";

const SUGGESTION_CHIPS = [
  "Headache",
  "Fever",
  "Fatigue",
  "Cough",
  "Chest Pain",
  "Shortness of Breath",
  "Nausea",
  "Dizziness",
  "Rash",
  "Joint Pain",
];

export default function DescribeStep({
  symptoms,
  setSymptoms,
  includeProfile,
  setIncludeProfile,
  profileData,
  setProfileData,
  onNext,
  loading,
}) {
  const addSymptomFromChip = (chip) => {
    const current = (symptoms || "").trim();
    if (!current) {
      setSymptoms(chip);
      return;
    }

    const lower = current.toLowerCase();
    if (lower.includes(chip.toLowerCase())) return;

    const endsWithPunctuation = /[.,;:!?]\s*$/.test(current);
    const nextText = endsWithPunctuation
      ? `${current} ${chip.toLowerCase()}`
      : `${current}, ${chip.toLowerCase()}`;
    setSymptoms(nextText);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-5">
      <h2 className="text-lg font-bold text-gray-900">Describe Symptoms</h2>

      <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
        <label className="flex items-center gap-2.5 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={includeProfile}
            onChange={(e) => setIncludeProfile(e.target.checked)}
            className="rounded border-gray-300"
          />
          Include my health profile
        </label>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          What are you feeling?
        </label>
        <textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          placeholder="Example: I have headache, fever, and body pain for 2 days"
          className="w-full min-h-40 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700
            focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
        />
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Suggestions
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTION_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => addSymptomFromChip(chip)}
              className="px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50 text-blue-700
                text-xs font-semibold hover:bg-blue-100 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {includeProfile && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            value={profileData.age}
            onChange={(e) => setProfileData((prev) => ({ ...prev, age: e.target.value }))}
            placeholder="Age"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700"
          />
          <input
            value={profileData.gender}
            onChange={(e) => setProfileData((prev) => ({ ...prev, gender: e.target.value }))}
            placeholder="Gender"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700"
          />
          <input
            value={profileData.history}
            onChange={(e) => setProfileData((prev) => ({ ...prev, history: e.target.value }))}
            placeholder="Medical history"
            className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700"
          />
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={onNext}
          disabled={loading || !symptoms.trim()}
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Analyzing..." : "Start analysis"}
        </button>
      </div>
    </div>
  );
}
