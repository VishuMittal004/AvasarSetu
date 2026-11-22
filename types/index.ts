// Enums & Literals
export type UserCategory = "General" | "OBC" | "SC" | "ST" | "EWS";
export type OpportunityType = "job" | "scholarship" | "scheme" | "college" | "exam" | "pension" | "subsidy" | "internship";
export type EmploymentStatus = "student" | "unemployed" | "employed" | "self-employed";
export type EducationLevel = "below-10th" | "10th-pass" | "12th-pass" | "undergraduate" | "graduate" | "postgraduate" | "doctorate";
export type DemoOpportunitySection = "private-job" | "government-job" | "exam" | "scheme" | "policy" | "scholarship";

// Profile Models
export interface Dependent {
  id: string;
  name: string;
  relation: string;
  age: number;
  educationLevel: EducationLevel;
  income: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  dateOfBirth: string; // ISO date
  /** Optional query-only age hint. Persisted profiles should use dateOfBirth. */
  age?: number;
  gender: "male" | "female" | "other" | "prefer-not";
  category: UserCategory;
  
  // Education
  educationLevel: EducationLevel;
  degree?: string;
  branch?: string;
  institution?: string;
  graduationYear?: number;
  cgpa?: number;

  // Career
  employmentStatus: EmploymentStatus;
  yearsOfExperience?: number;
  currentRole?: string;
  
  // Demographics
  income: number;
  state: string;
  district?: string;
  
  // Preferences & Skills
  skills: string[];
  interests: string[];
  preferredLocations?: string[];
  
  dependents: Dependent[];
}

// Opportunity Models
export interface DocumentRequirement {
  id: string;
  name: string;
  category: string;
  required: boolean;
  notes?: string;
}

export interface EligibilityRules {
  minAge?: number;
  maxAge?: number;
  maxIncome?: number;
  requiredEducation?: EducationLevel[];
  requiredDegrees?: string[];
  requiredBranches?: string[];
  allowedCategories?: UserCategory[];
  states?: string[];
  minExperience?: number;
  maxExperience?: number;
  requiredSkills?: string[];
}

export interface SourceInfo {
  name: string;
  url: string;
  type: "government" | "psu" | "private" | "ngo";
  trustLevel: "verified" | "unverified";
}

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  issuingAuthority: string;
  description: string;
  location: string;
  state?: string;
  deadline: string | null; // ISO date; null when the source does not publish a deadline
  
  rules: EligibilityRules;
  requiredDocuments: DocumentRequirement[];
  applicationSteps: string[];
  
  applicationLink: string;
  source: SourceInfo; // Use the structured source instead of raw strings
  lastVerifiedAt: string;
  tags: string[];
  
  vacancyCount?: number;
  salaryOrAmount?: string;
  
  // For the demo - explicit labels so we don't invent data
  isDemoRecord?: boolean;
  /** Subsection for clearly labeled synthetic presentation records. */
  demoSection?: DemoOpportunitySection;
}

// Tracking & Saved State Models
export type ApplicationStatus = "saved" | "applied" | "in-progress" | "expired";

export interface SavedOpportunity {
  id: string;
  opportunityId: string;
  savedAt: string; // ISO
  status: ApplicationStatus;
  notes?: string;
}

// Engine Output Models
export interface EligibilityReason {
  isMatch: boolean;
  isMissing?: boolean;
  criterion: string;
  message: string;
}

export interface EligibilityResult {
  isEligible: boolean;
  isPartiallyEligible: boolean; // True if some rules pass, some fail or are missing info
  isUnknown?: boolean; // No criteria could be assessed, or the opportunity defines no rules
  matchScore: number; // 0-100
  reasons: EligibilityReason[];
  failedCriteria: string[];
  matchedCriteria: string[];
}

// System Models
export type NotificationType = "deadline" | "match" | "system" | "update";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO
  isRead: boolean;
  link?: string; // Optional related resource
}

export interface SearchFilters {
  type?: OpportunityType[];
  location?: string[];
  category?: UserCategory[];
  education?: EducationLevel[];
  showOnlyEligible?: boolean;
  degree?: string[];
  demoSection?: DemoOpportunitySection;
}

export interface SearchQuery {
  raw: string;
  intent?: OpportunityType;
  filters: SearchFilters;
  keywords: string[];
  /** Facts explicitly stated in this search, used only for this search request. */
  profileHints?: Partial<UserProfile>;
}

export interface RankingReason {
  factor: string;
  score: number;
}

export interface SearchResult {
  opportunity: Opportunity;
  eligibility: EligibilityResult;
  relevanceScore: number;
  rankingReasons: RankingReason[];
}
