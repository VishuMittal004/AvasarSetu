import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";

interface AuthState {
  isAuthenticated: boolean;
  userEmail: string | null;
  authProvider: "demo" | "supabase" | null;
  login: (email: string, provider?: "demo" | "supabase") => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      userEmail: null,
      authProvider: null,
      login: (email, authProvider = "demo") => set({ isAuthenticated: true, userEmail: email, authProvider }),
      logout: async () => {
        try {
          if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            await createSupabaseClient().auth.signOut();
          }
        } catch {
          // Clear local session state even when the network is unavailable.
        } finally {
          set({ isAuthenticated: false, userEmail: null, authProvider: null });
        }
      },
    }),
    {
      name: "cc-auth-storage",
    }
  )
);
