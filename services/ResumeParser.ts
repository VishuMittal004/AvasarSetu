import { UserProfile, EducationLevel } from "@/types";

/**
 * A simulated local resume parser for the frontend demo.
 * In a real application, this would send the document to a backend NLP/LLM service.
 * Here, we use deterministic keyword extraction to simulate the AI.
 */
export class ResumeParser {
  private static readonly SKILLS_DB = [
    "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "C++", 
    "SQL", "MongoDB", "AWS", "Machine Learning", "Data Analysis", "Statistics",
    "Excel", "Tableau", "Project Management", "Communication", "Leadership"
  ];

  private static readonly DEGREE_DB = ["B.Tech", "M.Tech", "B.Sc", "M.Sc", "MBA", "B.A.", "B.Com"];
  
  private static readonly BRANCH_DB = [
    "Computer Science", "Information Technology", "Electronics", 
    "Mechanical", "Civil", "Nursing", "Statistics", "Economics"
  ];

  public static parse(text: string): Partial<UserProfile> {
    const raw = text.toLowerCase();
    const extracted: Partial<UserProfile> = {
      skills: [],
      interests: []
    };

    // Extract Skills
    this.SKILLS_DB.forEach(skill => {
      if (raw.includes(skill.toLowerCase())) {
        extracted.skills!.push(skill);
      }
    });

    // Extract Degrees
    this.DEGREE_DB.forEach(degree => {
      // Basic normalization
      const cleanDegree = degree.toLowerCase().replace(/\./g, "");
      const cleanRaw = raw.replace(/\./g, "");
      if (cleanRaw.includes(cleanDegree)) {
        extracted.degree = degree;
        
        // Map common degrees to Education Level
        if (degree.startsWith("B")) extracted.educationLevel = "graduate";
        if (degree.startsWith("M")) extracted.educationLevel = "postgraduate";
      }
    });

    // Extract Branches
    this.BRANCH_DB.forEach(branch => {
      if (raw.includes(branch.toLowerCase())) {
        extracted.branch = branch;
      }
    });

    // Extract Email
    const emailMatch = raw.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) extracted.email = emailMatch[0];

    // Extract Phone (simple 10-digit Indian pattern for demo)
    const phoneMatch = raw.match(/(?:\+91|0)?\s?[6-9]\d{9}/);
    if (phoneMatch) extracted.phone = phoneMatch[0];

    // Simple experience extraction (e.g., "5 years of experience")
    const expMatch = raw.match(/(\d+)\+?\s+years?(?:\s+of)?\s+experience/);
    if (expMatch) {
      extracted.yearsOfExperience = parseInt(expMatch[1], 10);
      extracted.employmentStatus = "employed";
    }

    return extracted;
  }
}
