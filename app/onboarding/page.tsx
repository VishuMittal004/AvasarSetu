"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Compass, ArrowRight, ArrowLeft } from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";
import { useAuthStore } from "@/store/useAuthStore";
import { UserProfile } from "@/types";

const step1Schema = z.object({
  name: z.string().min(2, "Name is required"),
  dateOfBirth: z.string().min(1, "Date of Birth is required"),
  gender: z.enum(["male", "female", "other", "prefer-not"]),
});

const step2Schema = z.object({
  educationLevel: z.enum(["below-10th", "10th-pass", "12th-pass", "undergraduate", "graduate", "postgraduate", "doctorate"]),
  state: z.string().min(2, "State is required"),
  category: z.enum(["General", "OBC", "SC", "ST", "EWS"]),
  income: z.number().min(0),
});

export default function OnboardingPage() {
  const router = useRouter();
  const updateProfile = useProfileStore(state => state.updateProfile);
  const login = useAuthStore(state => state.login);
  const authProvider = useAuthStore(state => state.authProvider);
  const userEmail = useAuthStore(state => state.userEmail);
  const profile = useProfileStore(state => state.profile);
  const [step, setStep] = useState(1);
  const [saveError, setSaveError] = useState("");

  const form1 = useForm<z.infer<typeof step1Schema>>({
    resolver: zodResolver(step1Schema),
    defaultValues: { name: "", dateOfBirth: "", gender: "prefer-not" }
  });

  const form2 = useForm<z.infer<typeof step2Schema>>({
    resolver: zodResolver(step2Schema),
    defaultValues: { educationLevel: "undergraduate", state: "", category: "General", income: 0 }
  });

  const onStep1Submit = (data: z.infer<typeof step1Schema>) => {
    updateProfile(data);
    setStep(2);
  };

  const onStep2Submit = async (data: z.infer<typeof step2Schema>) => {
    const nextProfile = { ...profile, ...data, employmentStatus: "student" as const, skills: profile?.skills ?? [], interests: profile?.interests ?? [], dependents: profile?.dependents ?? [] };
    updateProfile(nextProfile as Partial<UserProfile>);
    if (authProvider === "supabase") {
      try {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(nextProfile),
        });
        if (!response.ok) throw new Error("Profile save failed");
      } catch {
        setSaveError("Your profile could not be saved. Check your connection and try again.");
        return;
      }
      login(userEmail ?? "", "supabase");
    } else {
      login("demo@avasarsetu.app", "demo");
    }
    router.push("/dashboard");
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-container">
        <div className="onboarding-header">
          <Link href="/" className="onboarding-logo">
            <div className="auth-logo-icon">
              <Compass size={18} />
            </div>
            <span className="auth-logo-text">AvasarSetu</span>
          </Link>
          <h1 className="onboarding-heading">Create Your Profile</h1>
          <p className="onboarding-subtext">Just a few details to unlock personalized opportunities.</p>
        </div>

        {/* Progress */}
        <div className="progress-track">
          <div className="progress-segment">
            <div className="progress-fill" style={{ width: "100%" }} />
          </div>
          <div className="progress-segment">
            <div className="progress-fill" style={{ width: step === 2 ? "100%" : "0%" }} />
          </div>
        </div>

        <div className="onboarding-card">
          <p className="step-title">{step === 1 ? "Step 1: Personal Details" : "Step 2: Education & Demographics"}</p>
          <p className="step-desc">{step === 1 ? "Let's get to know you." : "This helps us match you with the right opportunities."}</p>

          {step === 1 && (
            <form onSubmit={form1.handleSubmit(onStep1Submit)} className="auth-form">
              <div className="form-field">
                <label className="form-label">Full Name</label>
                <input className={`form-input${form1.formState.errors.name ? " error" : ""}`}
                  {...form1.register("name")} placeholder="Rahul Sharma" />
                {form1.formState.errors.name && <span className="form-error">{form1.formState.errors.name.message}</span>}
              </div>
              <div className="form-field">
                <label className="form-label">Date of Birth</label>
                <input className={`form-input${form1.formState.errors.dateOfBirth ? " error" : ""}`}
                  type="date" {...form1.register("dateOfBirth")} />
                {form1.formState.errors.dateOfBirth && <span className="form-error">{form1.formState.errors.dateOfBirth.message}</span>}
              </div>
              <div className="form-field">
                <label className="form-label">Gender</label>
                <select className="form-select" {...form1.register("gender")}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer-not">Prefer not to say</option>
                </select>
              </div>
              <div className="form-actions">
                <div />
                <button type="submit" className="btn-submit" style={{ width: "auto", paddingLeft: 24, paddingRight: 24 }}>
                  Continue <ArrowRight size={16} style={{ display: "inline", marginLeft: 6 }} />
                </button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={form2.handleSubmit(onStep2Submit)} className="auth-form">
              {saveError && <div className="error-box" role="alert">{saveError}</div>}
              <div className="form-field">
                <label className="form-label">Highest Education Level</label>
                <select className="form-select" {...form2.register("educationLevel")}>
                  <option value="below-10th">Below 10th</option>
                  <option value="10th-pass">10th Pass</option>
                  <option value="12th-pass">12th Pass</option>
                  <option value="undergraduate">Undergraduate (Ongoing)</option>
                  <option value="graduate">Graduate (Completed Degree)</option>
                  <option value="postgraduate">Postgraduate</option>
                  <option value="doctorate">Doctorate</option>
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">State of Domicile</label>
                <select className={`form-select${form2.formState.errors.state ? " error" : ""}`} {...form2.register("state")}>
                  <option value="">Select a state…</option>
                  <option value="Delhi">Delhi</option>
                  <option value="Haryana">Haryana</option>
                  <option value="Maharashtra">Maharashtra</option>
                  <option value="Karnataka">Karnataka</option>
                  <option value="Uttar Pradesh">Uttar Pradesh</option>
                  <option value="Tamil Nadu">Tamil Nadu</option>
                  <option value="West Bengal">West Bengal</option>
                  <option value="Rajasthan">Rajasthan</option>
                  <option value="Gujarat">Gujarat</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Other">Other</option>
                </select>
                {form2.formState.errors.state && <span className="form-error">{form2.formState.errors.state.message}</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="form-field">
                  <label className="form-label">Social Category</label>
                  <select className="form-select" {...form2.register("category")}>
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="EWS">EWS</option>
                  </select>
                </div>
                <div className="form-field">
                  <label className="form-label">Annual Income (₹)</label>
                  <input className="form-input" type="number" {...form2.register("income", { valueAsNumber: true })} placeholder="e.g. 300000" />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-back" onClick={() => setStep(1)}>
                  <ArrowLeft size={14} /> Back
                </button>
                <button type="submit" className="btn-submit" style={{ width: "auto", paddingLeft: 24, paddingRight: 24 }}>
                  Complete Profile
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
