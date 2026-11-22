import { EligibilityRules, UserProfile, EligibilityResult, EligibilityReason } from "@/types";
import { differenceInYears, isValid, parseISO } from "date-fns";

/**
 * Compare only explicit profile values with normalized opportunity rules.
 * Missing profile facts are unknown, never treated as passing criteria.
 */
export function checkEligibility(rules: EligibilityRules, profile: Partial<UserProfile>): EligibilityResult {
  const reasons: EligibilityReason[] = [];
  const failedCriteria: string[] = [];
  const matchedCriteria: string[] = [];
  const missingCriteria: string[] = [];

  let age = Number.isFinite(profile.age) ? profile.age : undefined;
  if (age === undefined && profile.dateOfBirth) {
    const parsedDate = parseISO(profile.dateOfBirth);
    if (isValid(parsedDate) && parsedDate.getTime() <= Date.now()) {
      age = differenceInYears(new Date(), parsedDate);
    }
  }

  const evaluate = (
    condition: boolean | undefined,
    passMessage: string,
    failMessage: string,
    criterion: string,
  ) => {
    if (condition === true) {
      reasons.push({ isMatch: true, criterion, message: passMessage });
      matchedCriteria.push(criterion);
    } else if (condition === false) {
      reasons.push({ isMatch: false, criterion, message: failMessage });
      failedCriteria.push(criterion);
    } else {
      reasons.push({ isMatch: false, isMissing: true, criterion, message: failMessage });
      missingCriteria.push(criterion);
    }
  };

  if (rules.minAge !== undefined || rules.maxAge !== undefined) {
    if (age === undefined) {
      evaluate(undefined, "", "Add your age or date of birth to check this requirement.", "Age");
    } else if (rules.minAge !== undefined && age < rules.minAge) {
      evaluate(false, "", `Age (${age}) is below the listed minimum of ${rules.minAge}.`, "Age");
    } else if (rules.maxAge !== undefined && age > rules.maxAge) {
      evaluate(false, "", `Age (${age}) is above the listed maximum of ${rules.maxAge}.`, "Age");
    } else {
      evaluate(true, `Age (${age}) matches the recorded age range.`, "", "Age");
    }
  }

  if (rules.maxIncome !== undefined) {
    const income = profile.income;
    if (income === undefined || !Number.isFinite(income) || income < 0) {
      evaluate(undefined, "", "Add your annual income to check the listed income limit.", "Income");
    } else {
      evaluate(
        income <= rules.maxIncome,
        `Annual income (₹${income.toLocaleString("en-IN")}) is within the recorded limit (₹${rules.maxIncome.toLocaleString("en-IN")}).`,
        `Annual income (₹${income.toLocaleString("en-IN")}) is above the recorded limit (₹${rules.maxIncome.toLocaleString("en-IN")}).`,
        "Income",
      );
    }
  }

  if (rules.allowedCategories?.length) {
    if (!profile.category) {
      evaluate(undefined, "", "Add your category to check this requirement.", "Category");
    } else {
      evaluate(
        rules.allowedCategories.includes(profile.category),
        `Your category (${profile.category}) matches a listed category.`,
        `Your category (${profile.category}) is not in the listed categories: ${rules.allowedCategories.join(", ")}.`,
        "Category",
      );
    }
  }

  if (rules.requiredEducation?.length) {
    if (!profile.educationLevel) {
      evaluate(undefined, "", "Add your education level to check this requirement.", "Education");
    } else {
      evaluate(
        rules.requiredEducation.includes(profile.educationLevel),
        `Your education level (${profile.educationLevel}) matches a recorded accepted level.`,
        `Your education level (${profile.educationLevel}) does not match the recorded accepted levels: ${rules.requiredEducation.join(", ")}.`,
        "Education",
      );
    }
  }

  if (rules.requiredDegrees?.length) {
    if (!profile.degree?.trim()) {
      evaluate(undefined, "", "Add your degree to check this requirement.", "Degree");
    } else {
      const degree = profile.degree.trim().toLowerCase();
      const matches = rules.requiredDegrees.some(required => degree.includes(required.toLowerCase()) || required.toLowerCase().includes(degree));
      evaluate(
        matches,
        `Your degree (${profile.degree}) matches a recorded accepted degree.`,
        `Your degree (${profile.degree}) does not match the recorded accepted degrees: ${rules.requiredDegrees.join(", ")}.`,
        "Degree",
      );
    }
  }

  if (rules.requiredBranches?.length) {
    if (!profile.branch?.trim()) {
      evaluate(undefined, "", "Add your branch or specialization to check this requirement.", "Branch");
    } else {
      const branch = profile.branch.trim().toLowerCase();
      const matches = rules.requiredBranches.some(required => branch.includes(required.toLowerCase()) || required.toLowerCase().includes(branch));
      evaluate(
        matches,
        `Your branch (${profile.branch}) matches a recorded accepted branch.`,
        `Your branch (${profile.branch}) does not match the recorded accepted branches: ${rules.requiredBranches.join(", ")}.`,
        "Branch",
      );
    }
  }

  if (rules.minExperience !== undefined || rules.maxExperience !== undefined) {
    const experience = profile.yearsOfExperience;
    if (experience === undefined || !Number.isFinite(experience) || experience < 0) {
      evaluate(undefined, "", "Add your years of experience to check this requirement.", "Experience");
    } else if (rules.minExperience !== undefined && experience < rules.minExperience) {
      evaluate(false, "", `Experience (${experience} years) is below the recorded minimum of ${rules.minExperience}.`, "Experience");
    } else if (rules.maxExperience !== undefined && experience > rules.maxExperience) {
      evaluate(false, "", `Experience (${experience} years) is above the recorded maximum of ${rules.maxExperience}.`, "Experience");
    } else {
      evaluate(true, `Experience (${experience} years) matches the recorded range.`, "", "Experience");
    }
  }

  const states = rules.states?.filter(state => state.toLowerCase() !== "pan-india") ?? [];
  if (states.length) {
    if (!profile.state?.trim()) {
      evaluate(undefined, "", "Add your state to check this requirement.", "State");
    } else {
      const profileState = profile.state.trim().toLowerCase();
      const matches = states.some(state => state.toLowerCase() === profileState);
      evaluate(
        matches,
        `Your state (${profile.state}) matches a listed location.`,
        `Your state (${profile.state}) is not in the listed locations: ${states.join(", ")}.`,
        "State",
      );
    }
  }

  if (rules.requiredSkills?.length) {
    if (!profile.skills?.length) {
      evaluate(undefined, "", `Add skills to check the listed skills: ${rules.requiredSkills.join(", ")}.`, "Skills");
    } else {
      const profileSkills = profile.skills.map(skill => skill.trim().toLowerCase());
      const matchingSkills = rules.requiredSkills.filter(skill => profileSkills.includes(skill.toLowerCase()));
      evaluate(
        matchingSkills.length > 0,
        `Your profile matches these listed skills: ${matchingSkills.join(", ")}.`,
        `No listed required skill matched your profile. Looking for: ${rules.requiredSkills.join(", ")}.`,
        "Skills",
      );
    }
  }

  const criteriaCount = matchedCriteria.length + failedCriteria.length + missingCriteria.length;
  const isEligible = criteriaCount > 0 && failedCriteria.length === 0 && missingCriteria.length === 0;
  const isPartiallyEligible = !isEligible && matchedCriteria.length > 0;
  const isUnknown = !isEligible && matchedCriteria.length === 0 && failedCriteria.length === 0;
  const matchScore = criteriaCount === 0 ? 0 : Math.round((matchedCriteria.length / criteriaCount) * 100);

  return {
    isEligible,
    isPartiallyEligible,
    isUnknown,
    matchScore,
    reasons,
    failedCriteria,
    matchedCriteria,
  };
}
