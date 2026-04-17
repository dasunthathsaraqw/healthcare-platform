const cleanJsonResponse = (rawText) => {
    if (!rawText || typeof rawText !== "string") {
        throw new Error("AI response is empty.");
    }

    let cleaned = rawText.trim();

    // Remove markdown code blocks
    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }

    // Find JSON object if there's extra text
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        cleaned = jsonMatch[0];
    }

    return cleaned.trim();
};

const safeParseJson = (text) => {
    try {
        return JSON.parse(text);
    } catch (error) {
        console.error("JSON parse error:", text);
        throw new Error("AI response is not valid JSON.");
    }
};

module.exports = {
    cleanJsonResponse,
    safeParseJson,
};