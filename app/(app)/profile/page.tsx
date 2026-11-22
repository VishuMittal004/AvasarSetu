"use client";

import { useState } from "react";
import { User, GraduationCap, MapPin, CheckCircle2, ChevronRight, Save, FileUp, Sparkles, X } from "lucide-react";
import { useProfileStore } from "@/store/useProfileStore";
import { UserProfile } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

const C = {
  bg: "#09090b", surface: "#111113", elevated: "#18181b",
  border: "#27272a", text: "#fafafa", sec: "#a1a1aa", muted: "#52525b",
  accent: "#10b981", accentHover: "#059669",
};

const inp: React.CSSProperties = {
  display: "block", width: "100%", height: 44, padding: "0 14px",
  background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 10,
  color: C.text, fontSize: 14, fontFamily: "inherit", outline: "none",
  boxSizing: "border-box",
};

const sel: React.CSSProperties = {
  ...inp, appearance: "none", paddingRight: 36, cursor: "pointer",
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2352525b' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center",
};

const fld: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6 };
const lbl: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: C.sec, textTransform: "uppercase", letterSpacing: "0.5px" };
const saveBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, padding: "0 20px", height: 40, background: C.accent, color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit" };
const outBtn: React.CSSProperties = { ...saveBtn, background: "transparent", border: `1px solid ${C.border}`, color: C.sec };

const SECTIONS = [
  { id: "resume",       name: "Smart Resume",             icon: FileUp },
  { id: "basic",        name: "Basic Information",        icon: User },
  { id: "education",    name: "Education & Career",       icon: GraduationCap },
  { id: "demographics", name: "Demographics & Prefs",     icon: MapPin },
];

export default function ProfilePage() {
  const [activeSection, setActiveSection] = useState("resume");
  const profile = useProfileStore(s => s.profile) || {} as Partial<UserProfile>;
  const completeness = useProfileStore(s => s.completenessScore);
  const updateProfile = useProfileStore(s => s.updateProfile);
  const authProvider = useAuthStore(s => s.authProvider);

  const [resumeText, setResumeText] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [extractedData, setExtractedData] = useState<Partial<UserProfile> | null>(null);
  const [parseError, setParseError] = useState("");
  const [saveError, setSaveError] = useState("");

  const [formData, setFormData] = useState<Partial<UserProfile>>({
    name: profile.name || "",
    email: profile.email || "demo@avasarsetu.app",
    phone: profile.phone || "",
    dateOfBirth: profile.dateOfBirth || "",
    gender: profile.gender || "prefer-not",
    educationLevel: profile.educationLevel || "undergraduate",
    degree: profile.degree || "",
    branch: profile.branch || "",
    employmentStatus: profile.employmentStatus || "student",
    yearsOfExperience: profile.yearsOfExperience || 0,
    state: profile.state || "",
    category: profile.category || "General",
    income: profile.income || 0,
    skills: profile.skills || [],
    interests: profile.interests || [],
  });

  const upd = (field: keyof UserProfile, value: unknown) => setFormData(p => ({ ...p, [field]: value }));
  const handleSave = async () => {
    setSaveError("");
    if (authProvider === "supabase") {
      try {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        if (!response.ok) throw new Error("Profile could not be saved to your account.");
      } catch {
        setSaveError("We could not save your profile. Check your connection and try again.");
        return;
      }
    }
    updateProfile(formData);
    alert("Profile saved! The search engine will now use this updated data.");
  };
  const removeSkill = (s: string) => upd("skills", formData.skills?.filter(x => x !== s));

  const handleParse = async () => {
    if (!resumeText.trim()) return;
    setIsParsing(true);
    setParseError("");
    setExtractedData(null);
    try {
      const response = await fetch("/api/profile/parse-resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: resumeText }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Resume extraction failed. Try again.");

      const data = payload.extracted as Partial<UserProfile>;
      setExtractedData(data);
      setFormData(prev => ({
        ...prev,
        ...data,
        skills: Array.from(new Set([...(prev.skills || []), ...(data.skills || [])])),
      }));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Resume extraction failed. Try again.");
    } finally {
      setIsParsing(false);
    }
  };

  return (
    <div style={{ padding: "28px 24px", maxWidth: 1100, margin: "0 auto", fontFamily: "inherit", paddingBottom: 80 }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: "-0.5px" }}>Profile &amp; Preferences</h1>
        <p style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>The more complete your profile, the smarter our matching engine becomes.</p>
      </header>
      {saveError && <p role="alert" style={{ color: "#fca5a5", fontSize: 13, marginBottom: 16 }}>{saveError}</p>}

      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Sidebar nav */}
        <aside style={{ width: 220, flexShrink: 0 }}>
          {SECTIONS.map(sec => {
            const isActive = activeSection === sec.id;
            return (
              <button key={sec.id} onClick={() => setActiveSection(sec.id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                marginBottom: 4, borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                background: isActive ? C.accent : "transparent",
                color: isActive ? "#fff" : C.sec,
                fontWeight: 600, fontSize: 13, textAlign: "left",
                boxShadow: isActive ? "0 4px 12px rgba(16,185,129,0.25)" : "none",
                transition: "background 150ms ease, color 150ms ease",
              }}>
                <sec.icon size={16} />
                {sec.name}
              </button>
            );
          })}

          {/* Completeness */}
          <div style={{ marginTop: 20, padding: 16, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.8px", color: C.muted, marginBottom: 8 }}>Profile Completeness</div>
            <div style={{ width: "100%", height: 6, background: C.border, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
              <div style={{ width: `${completeness}%`, height: "100%", background: C.accent, borderRadius: 3, transition: "width 500ms ease" }} />
            </div>
            <p style={{ fontSize: 12, color: completeness === 100 ? C.accent : C.muted }}>
              {completeness === 100 ? "Fully optimized!" : `${completeness}% — finish to unlock better matches.`}
            </p>
          </div>
        </aside>

        {/* Form card */}
        <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 20, padding: 32 }}>

          {/* Smart Resume */}
          {activeSection === "resume" && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <Sparkles size={18} color="#818cf8" /> AI Resume Extractor
              </h2>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.6 }}>
                Paste resume text to extract profile details. Review the results below; your profile is saved only when you choose Save Profile.
              </p>
              <div style={fld}>
                <label style={lbl}>Paste Resume Text</label>
                <textarea rows={6} value={resumeText} onChange={e => setResumeText(e.target.value)}
                  style={{ ...inp, height: "auto", padding: "12px 14px", resize: "vertical", minHeight: 120 }}
                  placeholder="e.g. John Doe. B.Tech Computer Science. 3 years experience. Skills: React, Python, SQL." />
              </div>
              <button onClick={handleParse} disabled={isParsing || !resumeText.trim()}
                style={{ ...saveBtn, marginTop: 16, background: "#4f46e5", opacity: (isParsing || !resumeText.trim()) ? 0.5 : 1 }}>
                {isParsing ? "Analyzing resume..." : "Extract Profile Data"}
              </button>

              {parseError && <p role="alert" style={{ color: "#fca5a5", marginTop: 12, fontSize: 13 }}>{parseError}</p>}

              {extractedData && (
                <div style={{ marginTop: 20, padding: 16, background: "rgba(79,70,229,0.08)", border: "1px solid rgba(79,70,229,0.2)", borderRadius: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "#818cf8", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <CheckCircle2 size={14} /> {Object.keys(extractedData).length > 0 ? "Review extracted details" : "No profile details found"}
                  </h3>
                  {Object.keys(extractedData).length > 0 ? (
                    <>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13 }}>
                        {extractedData.name && <div><span style={{ color: C.muted, fontWeight: 600 }}>Name: </span>{extractedData.name}</div>}
                        {extractedData.educationLevel && <div><span style={{ color: C.muted, fontWeight: 600 }}>Education: </span>{extractedData.educationLevel}</div>}
                        {extractedData.degree && <div><span style={{ color: C.muted, fontWeight: 600 }}>Degree: </span>{extractedData.degree}</div>}
                        {extractedData.branch && <div><span style={{ color: C.muted, fontWeight: 600 }}>Branch: </span>{extractedData.branch}</div>}
                        {extractedData.graduationYear && <div><span style={{ color: C.muted, fontWeight: 600 }}>Graduation year: </span>{extractedData.graduationYear}</div>}
                        {extractedData.employmentStatus && <div><span style={{ color: C.muted, fontWeight: 600 }}>Employment: </span>{extractedData.employmentStatus}</div>}
                        {extractedData.yearsOfExperience !== undefined && <div><span style={{ color: C.muted, fontWeight: 600 }}>Experience: </span>{extractedData.yearsOfExperience} yrs</div>}
                        {extractedData.currentRole && <div><span style={{ color: C.muted, fontWeight: 600 }}>Current role: </span>{extractedData.currentRole}</div>}
                        {extractedData.institution && <div><span style={{ color: C.muted, fontWeight: 600 }}>Institution: </span>{extractedData.institution}</div>}
                        {extractedData.email && <div><span style={{ color: C.muted, fontWeight: 600 }}>Email: </span>{extractedData.email}</div>}
                        {extractedData.phone && <div><span style={{ color: C.muted, fontWeight: 600 }}>Phone: </span>{extractedData.phone}</div>}
                        {(extractedData.skills?.length ?? 0) > 0 && <div style={{ gridColumn: "1/-1" }}>
                          <span style={{ color: C.muted, fontWeight: 600, display: "block", marginBottom: 6 }}>Skills found:</span>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {extractedData.skills?.map(s => <span key={s} style={{ padding: "2px 10px", background: C.elevated, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: "#818cf8" }}>{s}</span>)}
                          </div>
                        </div>}
                      </div>
                      <p style={{ fontSize: 12, color: "#818cf8", marginTop: 10 }}>Details were added to the form. Review them in the sections below and save your profile.</p>
                    </>
                  ) : <p style={{ fontSize: 13, color: C.sec }}>Try pasting a resume section that includes education, work history, contact details, or skills.</p>}
                </div>
              )}

              <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => setActiveSection("basic")} style={outBtn}>Next Section <ChevronRight size={14} style={{ marginLeft: 4 }} /></button>
              </div>
            </div>
          )}

          {/* Basic Info */}
          {activeSection === "basic" && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>Basic Information</h2>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>Core identity details.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={fld}><label style={lbl}>Full Name</label><input style={inp} value={formData.name} onChange={e => upd("name", e.target.value)} /></div>
                <div style={fld}><label style={lbl}>Email Address</label><input style={inp} type="email" value={formData.email} onChange={e => upd("email", e.target.value)} /></div>
                <div style={fld}><label style={lbl}>Phone Number</label><input style={inp} type="tel" value={formData.phone || ""} onChange={e => upd("phone", e.target.value)} /></div>
                <div style={fld}><label style={lbl}>Date of Birth</label><input style={inp} type="date" value={formData.dateOfBirth} onChange={e => upd("dateOfBirth", e.target.value)} /></div>
                <div style={fld}>
                  <label style={lbl}>Gender</label>
                  <select style={sel} value={formData.gender} onChange={e => upd("gender", e.target.value)}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                    <option value="prefer-not">Prefer not to say</option>
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={handleSave} style={saveBtn}><Save size={14} /> Save Profile</button>
                <button onClick={() => setActiveSection("education")} style={outBtn}>Next <ChevronRight size={14} /></button>
              </div>
            </div>
          )}

          {/* Education */}
          {activeSection === "education" && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>Education &amp; Career</h2>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>Determines eligibility for jobs and higher education scholarships.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={fld}>
                  <label style={lbl}>Highest Education Level</label>
                  <select style={sel} value={formData.educationLevel} onChange={e => upd("educationLevel", e.target.value)}>
                    <option value="below-10th">Below 10th</option>
                    <option value="10th-pass">10th Pass</option>
                    <option value="12th-pass">12th Pass</option>
                    <option value="undergraduate">Undergraduate / Bachelor&apos;s</option>
                    <option value="graduate">Graduate</option>
                    <option value="postgraduate">Postgraduate / Master&apos;s</option>
                  </select>
                </div>
                <div style={fld}><label style={lbl}>Specific Degree (e.g. B.Tech)</label><input style={inp} value={formData.degree || ""} onChange={e => upd("degree", e.target.value)} /></div>
                <div style={fld}><label style={lbl}>Branch / Specialization</label><input style={inp} value={formData.branch || ""} placeholder="e.g. Computer Science" onChange={e => upd("branch", e.target.value)} /></div>
                <div style={fld}>
                  <label style={lbl}>Employment Status</label>
                  <select style={sel} value={formData.employmentStatus} onChange={e => upd("employmentStatus", e.target.value)}>
                    <option value="student">Student</option>
                    <option value="unemployed">Unemployed</option>
                    <option value="employed">Employed</option>
                    <option value="self-employed">Self Employed</option>
                  </select>
                </div>
                <div style={fld}><label style={lbl}>Years of Experience</label><input style={inp} type="number" value={formData.yearsOfExperience} onChange={e => upd("yearsOfExperience", parseInt(e.target.value) || 0)} /></div>
                <div style={{ ...fld, gridColumn: "1/-1" }}>
                  <label style={lbl}>Skills</label>
                  <div style={{ padding: 12, border: `1px solid ${C.border}`, borderRadius: 10, background: C.elevated, minHeight: 60 }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {formData.skills?.map(skill => (
                        <span key={skill} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", background: "#18181b", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 13, color: C.sec }}>
                          {skill}
                          <button onClick={() => removeSkill(skill)} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, display: "flex", padding: 0 }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
                            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      {(!formData.skills || formData.skills.length === 0) && <span style={{ fontSize: 13, color: C.muted }}>No skills added. Use Smart Resume extractor.</span>}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button onClick={handleSave} style={saveBtn}><Save size={14} /> Save Profile</button>
                <button onClick={() => setActiveSection("demographics")} style={outBtn}>Next <ChevronRight size={14} /></button>
              </div>
            </div>
          )}

          {/* Demographics */}
          {activeSection === "demographics" && (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>Demographics &amp; Financials</h2>
              <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>Crucial for government schemes, subsidies, and state-level quotas.</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div style={fld}>
                  <label style={lbl}>State of Residence</label>
                  <select style={sel} value={formData.state} onChange={e => upd("state", e.target.value)}>
                    <option value="">Select State</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Haryana">Haryana</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="West Bengal">West Bengal</option>
                    <option value="Gujarat">Gujarat</option>
                    <option value="Rajasthan">Rajasthan</option>
                    <option value="Punjab">Punjab</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div style={fld}>
                  <label style={lbl}>Social Category</label>
                  <select style={sel} value={formData.category} onChange={e => upd("category", e.target.value)}>
                    <option value="General">General</option>
                    <option value="OBC">OBC</option>
                    <option value="SC">SC</option>
                    <option value="ST">ST</option>
                    <option value="EWS">EWS</option>
                  </select>
                </div>
                <div style={{ ...fld, gridColumn: "1/-1" }}>
                  <label style={lbl}>Annual Family Income (₹)</label>
                  <input style={inp} type="number" value={formData.income} onChange={e => upd("income", parseInt(e.target.value) || 0)} />
                  <span style={{ fontSize: 11, color: C.muted }}>Used to match you with income-based financial aid.</span>
                </div>
              </div>
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleSave} style={saveBtn}><Save size={14} /> Save Profile</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
