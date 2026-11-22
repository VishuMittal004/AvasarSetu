/**
 * Gemini-powered eligibility parser.
 * Takes free-text eligibility description → structured EligibilityRules JSON.
 */

export interface ParsedEligibility {
  minAge?: number
  maxAge?: number
  maxIncome?: number
  requiredEducation?: string[]
  requiredDegrees?: string[]
  requiredBranches?: string[]
  allowedCategories?: string[]    // General, OBC, SC, ST, EWS
  states?: string[]
  requiredSkills?: string[]
  minExperience?: number
  maxExperience?: number
}

const EDUCATION_LEVELS = ["below-10th", "10th-pass", "12th-pass", "undergraduate", "graduate", "postgraduate", "doctorate"]
const CATEGORIES = ["General", "OBC", "SC", "ST", "EWS"]

export async function parseEligibility(
  eligibilityText: string,
  geminiKey: string
): Promise<ParsedEligibility> {
  if (!eligibilityText || eligibilityText.length < 5) return {}

  const prompt = `Parse this eligibility criteria into structured JSON for an Indian opportunity.
Return ONLY valid JSON with these optional fields:
{
  "minAge": number or null,
  "maxAge": number or null,  
  "maxIncome": number (annual INR) or null,
  "requiredEducation": array from ["below-10th","10th-pass","12th-pass","undergraduate","graduate","postgraduate","doctorate"] or [],
  "requiredDegrees": array of degree names like ["B.Tech","B.Sc","MBA"] or [],
  "requiredBranches": array like ["Computer Science","Electronics","Mechanical"] or [],
  "allowedCategories": array from ["General","OBC","SC","ST","EWS"] or [] (empty means all),
  "states": array of Indian state names or [] (empty means all India),
  "requiredSkills": array of skills or [],
  "minExperience": years or null,
  "maxExperience": years or null
}

Eligibility text: "${eligibilityText.slice(0, 1000)}"`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.0 },
        }),
        signal: AbortSignal.timeout(10000),
      }
    )

    if (!res.ok) return {}
    const data = await res.json()
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
    const parsed = JSON.parse(text)

    // Sanitize — only keep valid values
    return {
      minAge: typeof parsed.minAge === "number" ? parsed.minAge : undefined,
      maxAge: typeof parsed.maxAge === "number" ? parsed.maxAge : undefined,
      maxIncome: typeof parsed.maxIncome === "number" ? parsed.maxIncome : undefined,
      requiredEducation: Array.isArray(parsed.requiredEducation)
        ? parsed.requiredEducation.filter((e: string) => EDUCATION_LEVELS.includes(e))
        : [],
      requiredDegrees: Array.isArray(parsed.requiredDegrees) ? parsed.requiredDegrees.slice(0, 5) : [],
      requiredBranches: Array.isArray(parsed.requiredBranches) ? parsed.requiredBranches.slice(0, 5) : [],
      allowedCategories: Array.isArray(parsed.allowedCategories)
        ? parsed.allowedCategories.filter((c: string) => CATEGORIES.includes(c))
        : [],
      states: Array.isArray(parsed.states) ? parsed.states.slice(0, 10) : [],
      requiredSkills: Array.isArray(parsed.requiredSkills) ? parsed.requiredSkills.slice(0, 8) : [],
      minExperience: typeof parsed.minExperience === "number" ? parsed.minExperience : undefined,
      maxExperience: typeof parsed.maxExperience === "number" ? parsed.maxExperience : undefined,
    }
  } catch {
    return {}
  }
}

