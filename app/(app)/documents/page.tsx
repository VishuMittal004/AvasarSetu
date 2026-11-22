"use client";

import { useMemo, useEffect, useState } from "react";
import { FileText, CheckCircle2, Circle, UploadCloud, Archive, FileCheck2, Info } from "lucide-react";
import { useDocumentStore } from "@/store/useDocumentStore";
import { useSavedStore } from "@/store/useSavedStore";
import { OpportunityService } from "@/services/OpportunityService";
import { DocumentRequirement, Opportunity } from "@/types";

export default function DocumentsPage() {
  const { documents, markReady, removeDocument } = useDocumentStore();
  const { saved } = useSavedStore();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checklistMessage, setChecklistMessage] = useState("");

  const uploadedDocuments = documents;
  const toggleDocument = (id: string, checked: boolean, name: string, category: string) => {
    if (checked) {
      markReady(id, name, category);
      setChecklistMessage("");
    } else {
      removeDocument(id);
    }
  };

  useEffect(() => {
    const fetchOpps = async () => {
      setIsLoading(true);
      const data = await OpportunityService.getOpportunities();
      setOpportunities(data);
      setIsLoading(false);
    };
    fetchOpps();
  }, []);

  const requiredDocs = useMemo(() => {
    if (opportunities.length === 0) return [];
    const docsMap = new Map<string, DocumentRequirement & { relatedOpps: string[] }>();
    saved.forEach(item => {
      const opp = opportunities.find(o => o.id === item.opportunityId);
      if (opp && opp.requiredDocuments) {
        opp.requiredDocuments.forEach(doc => {
          if (!docsMap.has(doc.name)) {
            docsMap.set(doc.name, {
              ...doc,
              id: `required-${encodeURIComponent(doc.name)}`,
              relatedOpps: [opp.title],
            });
          } else {
            const existing = docsMap.get(doc.name)!;
            if (!existing.relatedOpps.includes(opp.title)) existing.relatedOpps.push(opp.title);
          }
        });
      }
    });
    return Array.from(docsMap.values());
  }, [saved, opportunities]);

  const generalDocs = [
    { id: "gen-1", name: "Aadhaar Card", category: "Identity Proof", required: true },
    { id: "gen-2", name: "Recent Passport Photo", category: "Media", required: true },
    { id: "gen-3", name: "Signature Scan", category: "Media", required: true },
    { id: "gen-4", name: "Bank Passbook / Cancelled Cheque", category: "Financial", required: true },
    { id: "gen-5", name: "10th Marksheet", category: "Education", required: false },
  ];

  const totalDocs = generalDocs.length + requiredDocs.filter(d => !generalDocs.some(gd => gd.name === d.name)).length;
  const uploadedCount = Object.values(uploadedDocuments).filter(Boolean).length;
  const progressPercent = totalDocs === 0 ? 0 : Math.round((uploadedCount / totalDocs) * 100);
  const circumference = 251.2;
  const offset = circumference - (circumference * progressPercent) / 100;

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px", padding: "32px" }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "900px", margin: "0 auto", fontFamily: "Inter, sans-serif", paddingBottom: "80px" }}>

      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "26px", fontWeight: 800, color: "#fafafa", letterSpacing: "-0.5px", display: "flex", alignItems: "center", gap: "12px", margin: 0 }}>
          <Archive size={26} style={{ color: "#10b981" }} />
          Document Checklist
        </h1>
        <p style={{ color: "#52525b", marginTop: "8px", fontSize: "14px", fontWeight: 500, maxWidth: "560px" }}>
          Keep track of documents you need for your saved applications. Check them off as you prepare them.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

        {/* Progress card */}
        <div style={{ background: "#111113", border: "1px solid #27272a", borderRadius: "16px", padding: "24px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "24px" }}>
          {/* Circular progress */}
          <div style={{ position: "relative", width: "80px", height: "80px", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }} viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="#27272a" strokeWidth="8" fill="none" />
              <circle
                cx="50" cy="50" r="40"
                stroke="#10b981" strokeWidth="8" fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 500ms ease" }}
              />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800, color: "#fafafa" }}>
              {progressPercent}%
            </div>
          </div>

          <div style={{ flex: 1, minWidth: "160px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#fafafa", margin: "0 0 4px" }}>Preparation Status</h3>
            <p style={{ fontSize: "13px", color: "#52525b", margin: 0 }}>
              {uploadedCount} of {totalDocs} documents prepared
            </p>
            {/* Progress bar */}
            <div style={{ marginTop: "12px", width: "100%", height: "4px", background: "#27272a", borderRadius: "2px", overflow: "hidden" }}>
              <div style={{ width: `${progressPercent}%`, height: "100%", background: "#10b981", borderRadius: "2px", transition: "width 500ms ease" }} />
            </div>
          </div>

          <button
            onClick={() => {
              const missing = generalDocs.find(doc => !uploadedDocuments[doc.id]);
              if (missing) toggleDocument(missing.id, true, missing.name, missing.category);
              else setChecklistMessage("All standard documents are marked ready.");
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", height: "40px", padding: "0 20px", background: "#10b981", color: "#fff", fontWeight: 700, fontSize: "13px", borderRadius: "10px", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            <UploadCloud size={16} /> Mark Next Ready
          </button>
        </div>
        {checklistMessage && <p role="status" style={{ color: "#a1a1aa", fontSize: 12, margin: "-8px 0 20px" }}>{checklistMessage}</p>}

        {/* Two-column grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>

          {/* Standard Documents */}
          <section style={{ background: "#111113", border: "1px solid #27272a", borderRadius: "16px", padding: "24px" }}>
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#fafafa", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                <FileCheck2 size={18} style={{ color: "#10b981" }} />
                Standard Documents
              </h2>
              <p style={{ fontSize: "12px", color: "#52525b", marginTop: "4px" }}>Commonly required across almost all applications.</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {generalDocs.map(doc => {
                const done = !!uploadedDocuments[doc.id];
                return (
                  <label
                    key={doc.id}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "14px", padding: "14px", borderRadius: "12px",
                      border: `1px solid ${done ? "#27272a" : "#27272a"}`,
                      background: done ? "rgba(16,185,129,0.04)" : "#18181b",
                      cursor: "pointer", transition: "border-color 150ms, background 150ms",
                    }}
                  >
                    <input type="checkbox" style={{ display: "none" }} checked={done} onChange={e => toggleDocument(doc.id, e.target.checked, doc.name, doc.category)} />
                    <div style={{ marginTop: "1px", flexShrink: 0 }}>
                      {done
                        ? <CheckCircle2 size={18} style={{ color: "#10b981" }} />
                        : <Circle size={18} style={{ color: "#3f3f46" }} />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontWeight: 700, fontSize: "14px", color: done ? "#52525b" : "#fafafa", textDecoration: done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {doc.name}
                      </span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#3f3f46", textTransform: "uppercase", letterSpacing: "0.8px" }}>
                        {doc.category}{done ? " · marked ready" : ""}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Application-Specific Documents */}
          <section style={{ background: "#111113", border: "1px solid #27272a", borderRadius: "16px", padding: "24px" }}>
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: 700, color: "#fafafa", display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                <FileText size={18} style={{ color: "#6366f1" }} />
                Application Specific
              </h2>
              <p style={{ fontSize: "12px", color: "#52525b", marginTop: "4px" }}>Based on your currently saved opportunities.</p>
            </div>

            {requiredDocs.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center", background: "#18181b", borderRadius: "12px", border: "1px dashed #27272a" }}>
                <Info size={28} style={{ color: "#3f3f46", marginBottom: "12px" }} />
                <h4 style={{ fontSize: "14px", fontWeight: 700, color: "#a1a1aa", marginBottom: "6px" }}>No pending requirements</h4>
                <p style={{ fontSize: "12px", color: "#52525b", maxWidth: "220px" }}>Save opportunities to see their specific document requirements here.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {requiredDocs.map(doc => {
                  if (generalDocs.some(gd => gd.name === doc.name)) return null;
                  const done = !!uploadedDocuments[doc.id];
                  return (
                    <label
                      key={doc.id}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: "14px", padding: "14px", borderRadius: "12px",
                        border: "1px solid #27272a",
                        background: done ? "rgba(16,185,129,0.04)" : "#18181b",
                        cursor: "pointer", transition: "border-color 150ms",
                      }}
                    >
                      <input type="checkbox" style={{ display: "none" }} checked={done} onChange={e => toggleDocument(doc.id, e.target.checked, doc.name, doc.category)} />
                      <div style={{ marginTop: "1px", flexShrink: 0 }}>
                        {done
                          ? <CheckCircle2 size={18} style={{ color: "#10b981" }} />
                          : <Circle size={18} style={{ color: "#3f3f46" }} />
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ display: "block", fontWeight: 700, fontSize: "14px", color: done ? "#52525b" : "#fafafa", textDecoration: done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {doc.name}
                          </span>
                          {!doc.required && <span style={{ fontSize: "10px", fontWeight: 700, color: "#3f3f46", textTransform: "uppercase", letterSpacing: "0.8px", whiteSpace: "nowrap" }}>(Optional)</span>}
                        </div>
                        <p style={{ fontSize: "11px", color: "#52525b", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          For: {doc.relatedOpps.join(", ")}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
