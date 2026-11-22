import { SearchQuery, OpportunityType, EducationLevel, UserCategory, UserProfile } from "@/types";

const EDUCATION_MAP: Record<string, EducationLevel> = {
  "10th": "10th-pass", matric: "10th-pass", ssc: "10th-pass",
  "12th": "12th-pass", hsc: "12th-pass", inter: "12th-pass",
  undergraduate: "undergraduate", undergrad: "undergraduate", ug: "undergraduate",
  graduate: "graduate", graduation: "graduate", graduatee: "graduate", bachelors: "graduate", bachelor: "graduate", degree: "graduate",
  postgraduate: "postgraduate", postgrad: "postgraduate", pg: "postgraduate", masters: "postgraduate", master: "postgraduate",
  doctorate: "doctorate", doctoral: "doctorate", phd: "doctorate",
};

const CATEGORY_MAP: Record<string, UserCategory> = {
  obc: "OBC", sc: "SC", st: "ST", ews: "EWS", general: "General", ur: "General",
};

const TYPE_MAP: Record<string, OpportunityType> = {
  job: "job", jobs: "job", private: "job", government: "job", govt: "job", career: "job", role: "job", vacancy: "job", recruitment: "job",
  scholarship: "scholarship", scholarships: "scholarship", grant: "scholarship", funding: "scholarship", fellowship: "scholarship",
  scheme: "scheme", schemes: "scheme", yojana: "scheme", policy: "scheme", policies: "scheme",
  exam: "exam", exams: "exam", test: "exam", competitive: "exam",
  subsidy: "subsidy", loan: "subsidy", loans: "subsidy",
  internship: "internship", internships: "internship",
};

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi",
];

const STOP_WORDS = new Set([
  "i", "am", "a", "an", "the", "me", "my", "is", "are", "was", "have", "has", "had", "with", "for", "in", "on", "at", "of", "to", "and", "or", "show", "find", "get", "looking", "need", "want", "please", "opportunities", "opportunity", "things", "that", "which", "who", "from", "under", "below", "less", "than", "up", "around", "about", "income", "annual", "yearly", "family", "household", "age", "aged", "years", "year", "yrs", "old", "experience", "experienced", "private", "government", "govt", "job", "jobs", "exam", "exams", "scheme", "policy", "scholarship", "scholarships", "graduate", "graduation", "undergraduate", "postgraduate", "btech", "bsc", "bca", "bcom", "mba", "mca", "bachelor", "bachelors",
]);

function extractDegree(raw: string): string | undefined {
  const normalized = raw.toLowerCase().replace(/[.\s-]+/g, "");
  const patterns: Array<[RegExp, string]> = [
    [/\bbtech\b/, "B.Tech"], [/\bbe\b/, "B.E."], [/\bbsc\b/, "B.Sc"], [/\bbca\b/, "BCA"], [/\bbcom\b/, "B.Com"], [/\bba\b/, "BA"],
    [/\bmtech\b/, "M.Tech"], [/\bmca\b/, "MCA"], [/\bmba\b/, "MBA"], [/\bmsc\b/, "M.Sc"], [/\bmcom\b/, "M.Com"],
  ];
  for (const [pattern, degree] of patterns) if (pattern.test(normalized)) return degree;
  return undefined;
}

function extractIncome(raw: string): number | undefined {
  // Only create an income hint when the user explicitly mentions income.
  if (!/\b(?:income|earn|earning|salary)\b/i.test(raw)) return undefined;
  const match = raw.match(/(?:income|earnings?|salary)[^\d₹]{0,28}₹?\s*(\d[\d,]*(?:\.\d+)?)\s*(crore|cr|lakhs?|lacs?|lpa|l|thousands?|k)?/i)
    ?? raw.match(/₹\s*(\d[\d,]*(?:\.\d+)?)\s*(crore|cr|lakhs?|lacs?|lpa|l|thousands?|k)\s*(?:annual\s*)?income/i);
  if (!match) return undefined;
  const amount = Number(match[1].replace(/,/g, ""));
  if (!Number.isFinite(amount) || amount < 0) return undefined;
  const unit = (match[2] ?? "").toLowerCase();
  const multiplier = ["crore", "cr"].includes(unit) ? 10_000_000
    : unit === "lpa" ? 100_000
    : ["lakh", "lakhs", "lac", "lacs", "l"].includes(unit) ? 100_000
      : ["thousand", "thousands", "k"].includes(unit) ? 1_000 : 1;
  return Math.round(amount * multiplier);
}

export class QueryParser {
  public static parse(rawQuery: string): SearchQuery {
    const raw = rawQuery.trim();
    const lower = raw.toLowerCase();
    const tokens = lower.split(/[^\p{L}\p{N}.]+/u).filter(Boolean);
    const filters: SearchQuery["filters"] = { type: [], location: [], education: [], category: [], degree: [] };
    const profileHints: Partial<UserProfile> = {};
    const keywords: string[] = [];

    for (const token of tokens) {
      const type = TYPE_MAP[token];
      if (type) {
        if (!filters.type!.includes(type)) filters.type!.push(type);
        continue;
      }
      const education = EDUCATION_MAP[token];
      if (education) {
        if (!filters.education!.includes(education)) filters.education!.push(education);
        profileHints.educationLevel = education;
        continue;
      }
      const category = CATEGORY_MAP[token];
      if (category) {
        if (!filters.category!.includes(category)) filters.category!.push(category);
        profileHints.category = category;
        continue;
      }
      if (!STOP_WORDS.has(token) && token.length > 1) keywords.push(token);
    }

    const degree = extractDegree(raw);
    if (degree) {
      filters.degree!.push(degree);
      profileHints.degree = degree;
    }

    const income = extractIncome(raw);
    if (income !== undefined) profileHints.income = income;

    const ageMatch = lower.match(/\bage\s*(?:is|of|:)?\s*(\d{1,2})\b|\b(\d{1,2})\s*(?:years?|yrs?)\s*old\b/);
    const age = Number(ageMatch?.[1] ?? ageMatch?.[2]);
    if (Number.isInteger(age) && age >= 14 && age <= 100) profileHints.age = age;

    const experienceMatch = lower.match(/\b(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s+(?:of\s+)?experience\b/);
    if (experienceMatch) profileHints.yearsOfExperience = Number(experienceMatch[1]);

    const state = STATES.find(candidate => lower.includes(candidate.toLowerCase()));
    if (state) {
      filters.location!.push(state);
      profileHints.state = state;
    }

    const branchTerms = ["computer science", "information technology", "mechanical", "civil", "electronics", "electrical", "statistics", "mathematics", "data science", "economics", "physics", "chemistry", "biology"];
    const branch = branchTerms.find(candidate => lower.includes(candidate));
    if (branch) profileHints.branch = branch.replace(/\b\w/g, letter => letter.toUpperCase());

    const skillTerms = ["react", "javascript", "typescript", "python", "sql", "java", "communication", "networking", "data analysis", "testing", "automation", "digital literacy", "research"];
    profileHints.skills = skillTerms.filter(skill => new RegExp(`\\b${skill.replace(/\s+/g, "\\s+")}\\b`, "i").test(raw));
    if (profileHints.skills.length === 0) delete profileHints.skills;

    if (/\bprivate\s+(?:sector\s+)?jobs?\b/i.test(raw)) filters.demoSection = "private-job";
    else if (/\b(?:government|govt|public\s+sector)\s+jobs?\b/i.test(raw)) filters.demoSection = "government-job";
    else if (/\bpolic(?:y|ies)\b/i.test(raw)) filters.demoSection = "policy";
    else if (/\bscholarships?\b/i.test(raw)) filters.demoSection = "scholarship";
    else if (/\bexams?\b/i.test(raw)) filters.demoSection = "exam";
    else if (/\bschemes?\b/i.test(raw)) filters.demoSection = "scheme";

    const intent = filters.type?.[0];
    return {
      raw,
      intent,
      filters,
      keywords: [...new Set(keywords)],
      profileHints: Object.keys(profileHints).length ? profileHints : undefined,
    };
  }
}
