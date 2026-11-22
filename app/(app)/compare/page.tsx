"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfileStore } from "@/store/useProfileStore";
import { OpportunityService } from "@/services/OpportunityService";
import { checkEligibility } from "@/services/EligibilityEngine";
import { getOpportunityFreshness } from "@/lib/utils";
import { Opportunity, EligibilityResult } from "@/types";

export default function ComparePage() {
  const searchParams = useSearchParams();
  const profile = useProfileStore(state => state.profile);
  
  const ids = useMemo(() => searchParams.get("ids")?.split(",") || [], [searchParams]);
  
  const [opportunities, setOpportunities] = useState<(Opportunity & { eligibility: EligibilityResult })[]>([]);
  const [isLoading, setIsLoading] = useState(ids.length > 0);

  useEffect(() => {
    const fetchOpps = async () => {
      setIsLoading(true);
      const results: (Opportunity & { eligibility: EligibilityResult })[] = [];
      
      // Limit to 3 items for comparison
      const oppIds = ids.slice(0, 3);
      
      for (const id of oppIds) {
        const opp = await OpportunityService.getOpportunityById(id);
        if (opp) {
          results.push({
            ...opp,
            eligibility: checkEligibility(opp.rules, profile || {})
          });
        }
      }
      
      setOpportunities(results);
      setIsLoading(false);
    };

    if (ids.length > 0) {
      fetchOpps();
    }
  }, [ids, profile]);

  if (isLoading && ids.length > 0) {
    return <div className="p-8 text-center font-bold text-[#52525b]">Loading comparison...</div>;
  }

  if (opportunities.length === 0) {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-20 font-sans">
        <h2 className="text-2xl font-bold text-[#fafafa] mb-4">Nothing to compare</h2>
        <p className="text-[#52525b] mb-6">Select opportunities from the explore page to compare them side-by-side.</p>
        <Link href="/explore" className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background h-10 py-2 px-4 bg-[#10b981] hover:bg-[#059669] text-white">
          Explore Opportunities
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto font-sans h-full overflow-y-auto">
      <Link href="/explore" className="inline-flex items-center text-sm font-semibold text-[#52525b] hover:text-[#fafafa] mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Search
      </Link>
      
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#fafafa] tracking-tight">Compare Opportunities</h1>
        <p className="text-[#52525b] mt-2 font-medium">Evaluate side-by-side to make the best choice.</p>
      </header>

      <div className="bg-[#18181b] border border-[#27272a] rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th className="p-4 border-b border-r border-[#27272a] bg-[#18181b] w-48 sticky left-0 z-10">Features</th>
              {opportunities.map((opp) => (
                <th key={opp.id} className="p-6 border-b border-[#27272a] bg-[#18181b] min-w-[300px] max-w-[400px] align-top">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#10b981] bg-[#064e3b] px-2 py-1 rounded border border-[#065f46] mb-3 inline-block">
                    {opp.type}
                  </span>
                  <h3 className="text-lg font-bold text-[#fafafa] mb-1 leading-tight">{opp.title}</h3>
                  <p className="text-sm font-medium text-[#52525b] mb-4">{opp.issuingAuthority}</p>
                  
                  <div className="flex gap-2">
                    <a href={opp.applicationLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-md text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background h-9 px-3 bg-[#10b981] hover:bg-[#059669] text-white flex-1 font-medium">
                      Apply
                    </a>
                    <Link href={`/opportunities/${opp.id}`} className="inline-flex items-center justify-center rounded-md text-sm transition-colors h-9 px-3 border border-[#27272a] hover:bg-[#27272a] text-[#a1a1aa] hover:text-[#fafafa] flex-1 font-bold">
                      Details
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm font-medium text-[#a1a1aa]">
            {/* Match Score */}
            <tr>
              <td className="p-4 border-b border-r border-[#27272a] bg-[#18181b] sticky left-0 font-bold text-[#a1a1aa]">Your Match</td>
              {opportunities.map((opp) => (
                <td key={opp.id} className="p-4 border-b border-[#27272a] bg-[#18181b]">
                  <div className="flex items-center gap-2">
                    <div className={`font-black text-xl ${opp.eligibility.matchScore > 80 ? 'text-[#10b981]' : opp.eligibility.matchScore > 50 ? 'text-amber-500' : 'text-red-500'}`}>
                      {opp.eligibility.isUnknown ? "—" : `${opp.eligibility.matchScore}%`}
                    </div>
                    {opp.eligibility.isEligible ? (
                      <span className="text-[10px] uppercase font-bold text-[#10b981] bg-[rgba(16,185,129,0.1)] px-2 py-0.5 rounded border border-[rgba(16,185,129,0.25)]">Eligible</span>
                    ) : opp.eligibility.isPartiallyEligible ? (
                      <span className="text-[10px] uppercase font-bold text-amber-400 bg-[rgba(245,158,11,0.1)] px-2 py-0.5 rounded border border-[rgba(245,158,11,0.25)]">Potential match</span>
                    ) : opp.eligibility.isUnknown ? (
                      <span className="text-[10px] uppercase font-bold text-[#a1a1aa] bg-[rgba(161,161,170,0.1)] px-2 py-0.5 rounded border border-[rgba(161,161,170,0.25)]">Not enough information</span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold text-[#ef4444] bg-[rgba(239,68,68,0.1)] px-2 py-0.5 rounded border border-[rgba(239,68,68,0.25)]">Ineligible</span>
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* Deadline */}
            <tr>
              <td className="p-4 border-b border-r border-[#27272a] bg-[#18181b] sticky left-0 font-bold text-[#a1a1aa]">Deadline</td>
              {opportunities.map((opp) => (
                <td key={opp.id} className="p-4 border-b border-[#27272a] bg-[#18181b]">
                  {opp.deadline ? new Date(opp.deadline).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : "Not listed"}
                </td>
              ))}
            </tr>

            <tr>
              <td className="p-4 border-b border-r border-[#27272a] bg-[#18181b] sticky left-0 font-bold text-[#a1a1aa]">Source freshness</td>
              {opportunities.map(opp => {
                const isPresentationRecord = opp.isDemoRecord === true || opp.id.startsWith("demo-");
                const freshness = getOpportunityFreshness(
                  opp.lastVerifiedAt,
                  opp.type,
                  undefined,
                  isPresentationRecord,
                );
                return <td key={opp.id} className={`p-4 border-b border-[#27272a] bg-[#18181b] ${freshness.isStale ? "text-amber-400" : "text-[#a1a1aa]"}`}>
                  {freshness.isStale ? `May be outdated · ${freshness.label.toLowerCase()}` : freshness.label}
                </td>;
              })}
            </tr>

            {/* Location */}
            <tr>
              <td className="p-4 border-b border-r border-[#27272a] bg-[#18181b] sticky left-0 font-bold text-[#a1a1aa]">Location</td>
              {opportunities.map((opp) => (
                <td key={opp.id} className="p-4 border-b border-[#27272a] bg-[#18181b]">
                  {opp.location || opp.state || "Pan-India"}
                </td>
              ))}
            </tr>

            {/* Documents */}
            <tr>
              <td className="p-4 border-b border-r border-[#27272a] bg-[#18181b] sticky left-0 font-bold text-[#a1a1aa]">Required Docs</td>
              {opportunities.map((opp) => (
                <td key={opp.id} className="p-4 border-b border-[#27272a] bg-[#18181b] align-top">
                  <ul className="space-y-1">
                    {opp.requiredDocuments.length > 0 ? opp.requiredDocuments.map(doc => (
                      <li key={doc.id} className="flex items-start gap-1.5 text-xs text-[#a1a1aa]">
                        {doc.required ? <Check className="h-3 w-3 text-[#10b981] mt-0.5 flex-shrink-0" /> : <AlertCircle className="h-3 w-3 text-[#52525b] mt-0.5 flex-shrink-0" />}
                        {doc.name}
                      </li>
                    )) : (
                      <li className="text-xs text-[#52525b] italic">None specified</li>
                    )}
                  </ul>
                </td>
              ))}
            </tr>
            
            {/* Description Snippet */}
            <tr>
              <td className="p-4 border-r border-[#27272a] bg-[#18181b] sticky left-0 font-bold text-[#a1a1aa]">Overview</td>
              {opportunities.map((opp) => (
                <td key={opp.id} className="p-4 bg-[#18181b] align-top">
                  <p className="text-xs text-[#52525b] line-clamp-4 leading-relaxed">{opp.description}</p>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}



