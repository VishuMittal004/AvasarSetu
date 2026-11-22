import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SavedOpportunity, ApplicationStatus } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

interface SavedState {
  saved: SavedOpportunity[];
  saveOpportunity: (opportunityId: string) => void;
  unsaveOpportunity: (opportunityId: string) => void;
  updateStatus: (opportunityId: string, status: ApplicationStatus) => void;
  clearAll: () => void;
  /** Call after Supabase sign-in to pull remote saved list */
  syncFromServer: () => Promise<void>;
}

/** Fire-and-forget Supabase sync — never throws, fails silently */
async function syncToServer(opportunityId: string, action: "save" | "unsave" | "status", status?: ApplicationStatus): Promise<boolean> {
  if (useAuthStore.getState().authProvider !== "supabase") return false;
  try {
    const response = await fetch("/api/saved", {
      method: action === "save" ? "POST" : action === "status" ? "PATCH" : "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ opportunityId, ...(status ? { status } : {}) }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set) => ({
      saved: [],

      saveOpportunity: (opportunityId) => {
        set((state) => {
          if (state.saved.some((s) => s.opportunityId === opportunityId)) return state;
          return {
            saved: [
              ...state.saved,
              {
                id: `saved-${Date.now()}`,
                opportunityId,
                savedAt: new Date().toISOString(),
                status: "saved" as ApplicationStatus,
              },
            ],
          };
        });
        // Best-effort server sync
        syncToServer(opportunityId, "save");
      },

      unsaveOpportunity: (opportunityId) => {
        set((state) => ({
          saved: state.saved.filter((s) => s.opportunityId !== opportunityId),
        }));
        syncToServer(opportunityId, "unsave");
      },

      updateStatus: (opportunityId, status) => {
        set((state) => ({
          saved: state.saved.map((s) =>
            s.opportunityId === opportunityId ? { ...s, status } : s
          ),
        }));
        syncToServer(opportunityId, "status", status);
      },

      clearAll: () => set({ saved: [] }),

      /** Pull server-side saved list (called once after Supabase login) */
      syncFromServer: async () => {
        try {
          const localSaved = useSavedStore.getState().saved;
          const syncResults = await Promise.all(localSaved.map(async item => ({
            item,
            synced: await syncToServer(item.opportunityId, "save", item.status),
          })));
          const res = await fetch("/api/saved");
          if (!res.ok) return;
          const { saved: serverSaved, demo } = await res.json();
          if (demo || !Array.isArray(serverSaved)) return;

          set((state) => {
            const synced: SavedOpportunity[] = serverSaved
              .map((s: { opportunity_id: string; saved_at: string; status: string }) => ({
                id: `saved-${s.opportunity_id}`,
                opportunityId: s.opportunity_id,
                savedAt: s.saved_at,
                status: (s.status ?? "saved") as ApplicationStatus,
              }));
            const remoteIds = new Set(synced.map(item => item.opportunityId));
            const pendingLocal = syncResults.filter(result => !result.synced && !remoteIds.has(result.item.opportunityId)).map(result => result.item);
            return { saved: [...synced, ...pendingLocal] };
          });
        } catch {
          /* offline or demo */
        }
      },
    }),
    { name: "cc-saved-storage" }
  )
);
