import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserProfile } from "@/types";

interface ProfileState {
  profile: Partial<UserProfile> | null;
  isProfileComplete: boolean;
  completenessScore: number;
  missingFields: string[];
  
  updateProfile: (data: Partial<UserProfile>) => void;
  clearProfile: () => void;
}

const calculateCompleteness = (profile: Partial<UserProfile> | null) => {
  if (!profile) return { score: 0, missing: ["Everything"], isComplete: false };
  
  const requiredFields = [
    { key: 'name', label: 'Full Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'dateOfBirth', label: 'Date of Birth' },
    { key: 'gender', label: 'Gender' },
    { key: 'category', label: 'Category' },
    { key: 'educationLevel', label: 'Education Level' },
    { key: 'employmentStatus', label: 'Employment Status' },
    { key: 'income', label: 'Annual Income' },
    { key: 'state', label: 'State' }
  ];

  const optionalImportantFields = [
    { key: 'degree', label: 'Degree' },
    { key: 'branch', label: 'Branch/Specialization' },
    { key: 'skills', label: 'Skills', isArray: true },
    { key: 'interests', label: 'Interests', isArray: true },
    { key: 'preferredLocations', label: 'Preferred Locations', isArray: true },
    { key: 'yearsOfExperience', label: 'Years of Experience' }
  ];

  const missing: string[] = [];
  let score = 0;
  
  // Base required: 60 points max
  const requiredWeight = 60 / requiredFields.length;
  requiredFields.forEach(field => {
    if (profile[field.key as keyof UserProfile] !== undefined && profile[field.key as keyof UserProfile] !== "") {
      score += requiredWeight;
    } else {
      missing.push(field.label);
    }
  });

  // Optional important: 40 points max
  const optionalWeight = 40 / optionalImportantFields.length;
  optionalImportantFields.forEach(field => {
    const val = profile[field.key as keyof UserProfile];
    if (field.isArray) {
      if (Array.isArray(val) && val.length > 0) {
        score += optionalWeight;
      } else {
        missing.push(field.label);
      }
    } else {
      if (val !== undefined && val !== "") {
        score += optionalWeight;
      } else {
        missing.push(field.label);
      }
    }
  });

  // Check if minimum core fields are present for boolean `isProfileComplete`
  const isComplete = requiredFields.every(field => profile[field.key as keyof UserProfile] !== undefined && profile[field.key as keyof UserProfile] !== "");

  return {
    score: Math.round(score),
    missing,
    isComplete
  };
};

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      isProfileComplete: false,
      completenessScore: 0,
      missingFields: ["Everything"],
      
      updateProfile: (data) =>
        set((state) => {
          const newProfile = { ...state.profile, ...data };
          const { score, missing, isComplete } = calculateCompleteness(newProfile);

          return { 
            profile: newProfile, 
            isProfileComplete: isComplete,
            completenessScore: score,
            missingFields: missing
          };
        }),
        
      clearProfile: () => set({ 
        profile: null, 
        isProfileComplete: false, 
        completenessScore: 0,
        missingFields: ["Everything"] 
      }),
    }),
    {
      name: "cc-profile-storage",
    }
  )
);
