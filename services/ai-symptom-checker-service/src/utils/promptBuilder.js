const safeJson = (data) => JSON.stringify(data || {}, null, 2);

const buildQuestionPrompt = (symptoms, includeProfile = false, profileData = {}) => {
  return `
You are a clinical triage assistant for a demo healthcare app.
Task: Generate follow-up questions to clarify the symptom report.

Rules:
- This is NOT a diagnosis.
- Ask 3 to 5 concise, practical follow-up questions.
- Questions must help risk-triage and next-step guidance.
- Output MUST be strict JSON only (no markdown, no extra text).
- Use plain patient-friendly language.

Symptom input:
${symptoms}

Include profile context: ${includeProfile ? "Yes" : "No"}
Profile data (JSON):
${safeJson(profileData)}

Return JSON with exactly this schema:
{
  "questions": [
    "string (question 1)",
    "string (question 2)",
    "string (question 3)"
  ]
}

Validation constraints:
- questions length: minimum 3, maximum 5
- each question: non-empty string
- no duplicate questions
- no diagnosis statements
- no fields other than "questions"
  `.trim();
};

const buildInsightsPrompt = (
  symptoms,
  answers,
  includeProfile = false,
  profileData = {},
) => {
  return `
You are a clinical triage assistant for a demo healthcare app.
Task: Provide triage-style insights from symptom text and follow-up answers.

Rules:
- This is NOT a diagnosis.
- Provide triage guidance only.
- Severity MUST be exactly one of: "Low", "Medium", "High".
- Output MUST be strict JSON only (no markdown, no extra text).
- Keep language clear and patient-friendly.

Symptom input:
${symptoms}

Follow-up answers (JSON):
${safeJson(answers)}

Include profile context: ${includeProfile ? "Yes" : "No"}
Profile data (JSON):
${safeJson(profileData)}

Return JSON with exactly this schema:
{
  "severity": "Low | Medium | High",
  "guidance": ["string", "string"],
  "possiblePatterns": ["string", "string"],
  "recommendedSpecialties": ["string", "string"],
  "disclaimer": "string"
}

Validation constraints:
- "severity" must be exactly Low, Medium, or High
- "guidance" must be an array with at least 2 items
- "possiblePatterns" must be an array with at least 1 item
- "recommendedSpecialties" must be an array with at least 1 item
- "disclaimer" must clearly state this is not a diagnosis
- no fields other than those listed above
  `.trim();
};

module.exports = {
  buildQuestionPrompt,
  buildInsightsPrompt,
};
