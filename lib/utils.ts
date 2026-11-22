import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Opportunity, OpportunityType } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCurrentTimeMs() {
  return new Date().getTime();
}

export function getDeadlineDaysLeft(deadline: string | null | undefined, now = getCurrentTimeMs()) {
  if (!deadline) return null;
  const timestamp = new Date(deadline).getTime();
  if (!Number.isFinite(timestamp)) return null;
  return Math.ceil((timestamp - now) / 86400000);
}

export function isPresentationOpportunity(opportunity: Pick<Opportunity, "id" | "isDemoRecord">) {
  return opportunity.isDemoRecord === true || opportunity.id.startsWith("demo-");
}

export function getOpportunityFreshness(
  lastVerifiedAt: string | null | undefined,
  type: OpportunityType,
  now = getCurrentTimeMs(),
  isPresentationRecord = false,
) {
  if (!lastVerifiedAt) return { label: "Verification date unavailable", isStale: true }
  const timestamp = new Date(lastVerifiedAt).getTime()
  if (!Number.isFinite(timestamp)) return { label: "Verification date unavailable", isStale: true }
  const ageMs = Math.max(0, now - timestamp)
  const hours = Math.floor(ageMs / 3_600_000)
  const days = Math.floor(ageMs / 86_400_000)
  
  let label: string
  if (ageMs < 3_600_000) {
    const minutes = Math.floor(ageMs / 60_000)
    label = minutes <= 1 ? "Updated just now" : `Updated ${minutes} minutes ago`
  } else if (hours < 24) {
    label = `Updated ${hours} hour${hours === 1 ? "" : "s"} ago`
  } else if (days < 30) {
    label = `Updated ${days} day${days === 1 ? "" : "s"} ago`
  } else {
    const months = Math.floor(days / 30)
    label = `Updated ${months} month${months === 1 ? "" : "s"} ago`
  }

  const slowerChangingTypes: OpportunityType[] = ["scholarship", "scheme", "pension", "subsidy"]
  const staleAfterMs = (slowerChangingTypes.includes(type) ? 30 : 7) * 86_400_000
  return { label, isStale: !isPresentationRecord && ageMs > staleAfterMs }
}
