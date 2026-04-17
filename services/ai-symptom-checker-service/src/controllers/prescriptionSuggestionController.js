// ai-symptom-checker-service/src/controllers/prescriptionSuggestionController.js

const { getPrescriptionSuggestions } = require("../services/prescriptionSuggestionService");
const { cleanJsonResponse, safeParseJson } = require("../utils/jsonHelper");
const CircuitBreaker = require("../services/circuitBreaker");
const ResponseCache = require("../services/cacheService");

const circuitBreaker = new CircuitBreaker(3, 30000); // 3 failures, 30 second timeout
const cache = new ResponseCache(1800000); // 30 minute cache

const getSuggestions = async (req, res) => {
    try {
        const {
            patientData,
            appointmentData,
            prescriptionData,
            previousPrescriptions,
            previousDiagnosis,
        } = req.body;

        // Validate required fields
        if (!patientData || !prescriptionData) {
            return res.status(400).json({
                success: false,
                message: "patientData and prescriptionData are required.",
            });
        }

        // Generate cache key based on request
        const cacheKey = JSON.stringify({
            patientId: patientData.id || patientData.name,
            diagnosis: prescriptionData.diagnosis?.slice(0, 100),
            medicationCount: prescriptionData.medications?.length,
        });

        // Check cache first
        const cachedResult = cache.get(cacheKey);
        if (cachedResult) {
            console.log("Returning cached suggestion");
            return res.status(200).json({
                success: true,
                data: cachedResult,
                cached: true,
            });
        }

        // Execute with circuit breaker
        const result = await circuitBreaker.execute(async () => {
            return await getPrescriptionSuggestions({
                patientData,
                appointmentData,
                prescriptionData,
                previousPrescriptions: (previousPrescriptions || []).slice(0, 5), // Limit to 5
                previousDiagnosis: (previousDiagnosis || []).slice(0, 3),
            });
        });

        // Parse and validate the AI response
        const cleanedText = cleanJsonResponse(result.result);
        const parsed = safeParseJson(cleanedText);

        // Validate required fields in response
        const requiredTopLevel = [
            "healthAnalysis",
            "medicationSuggestions",
            "diagnosticSuggestions",
            "lifestyleRecommendations",
            "followUpRecommendation",
            "disclaimer",
        ];

        const missingFields = requiredTopLevel.filter(
            (field) => !parsed[field]
        );

        if (missingFields.length > 0) {
            console.warn(`Missing fields in AI response: ${missingFields.join(", ")}`);
            const fallback = createFallbackSuggestions();
            cache.set(cacheKey, fallback);
            return res.status(200).json({
                success: true,
                data: fallback,
                partial: true,
                missingFields,
            });
        }

        // Cache successful response
        cache.set(cacheKey, parsed);

        return res.status(200).json({
            success: true,
            data: parsed,
        });

    } catch (error) {
        console.error("Prescription suggestion error:", error);

        // Return a helpful fallback instead of failing
        const fallbackSuggestions = createFallbackSuggestions();

        // Check if it's a temporary service issue
        const isTemporary = error.message.includes("overloaded") ||
            error.message.includes("unavailable") ||
            error.status === 503 ||
            error.status === 429;

        return res.status(isTemporary ? 200 : error.status || 500).json({
            success: true, // Still return success with fallback
            data: fallbackSuggestions,
            fallback: true,
            message: isTemporary ? "AI service temporarily unavailable - showing general suggestions" : error.message,
        });
    }
};

const createFallbackSuggestions = () => {
    return {
        healthAnalysis: {
            summary: "Based on the information provided, a thorough clinical evaluation is recommended. The AI service is currently experiencing high demand, so general guidelines are provided below.",
            keyFindings: [
                "Complete physical examination recommended",
                "Review patient's medical history thoroughly",
                "Consider relevant diagnostic tests based on symptoms"
            ],
            riskFactors: [
                "Unable to determine without complete data",
                "Consider age and existing conditions",
                "Review medication allergies before prescribing"
            ],
            recommendedActions: [
                "Perform comprehensive physical examination",
                "Order baseline investigations if indicated",
                "Document all findings systematically"
            ]
        },
        medicationSuggestions: [
            {
                name: "Consult clinical guidelines",
                dosage: "Based on patient's weight and condition",
                frequency: "As per standard protocol",
                duration: "As clinically indicated",
                reasoning: "AI analysis unavailable - please refer to standard treatment guidelines",
                alternatives: ["Consider generic alternatives if available"],
                precautions: ["Check for drug allergies", "Review drug interactions", "Consider contraindications"]
            }
        ],
        diagnosticSuggestions: {
            possibleConditions: ["Based on presenting symptoms - requires clinical correlation"],
            suggestedTests: ["Complete blood count", "Basic metabolic panel", "Physical examination"],
            specialistReferral: "Consider referral if condition persists or worsens"
        },
        lifestyleRecommendations: {
            dietary: ["Maintain balanced nutrition", "Stay adequately hydrated"],
            activity: ["Rest as needed", "Gradual return to normal activities"],
            monitoring: ["Monitor vital signs", "Track symptom progression", "Note any adverse effects"]
        },
        followUpRecommendation: {
            timing: "1 week",
            reason: "To assess treatment response and adjust management if needed"
        },
        disclaimer: "⚠️ These are general clinical guidelines only. AI analysis is temporarily unavailable. Final decisions must be made by the attending physician based on complete patient evaluation."
    };
};

module.exports = {
    getSuggestions,
};