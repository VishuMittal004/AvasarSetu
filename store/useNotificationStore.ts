import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Notification, Opportunity } from "@/types";
import { useAuthStore } from "@/store/useAuthStore";

interface NotificationState {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, "id" | "createdAt" | "isRead">) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  generateDeadlineNotifications: (savedOpportunities: Opportunity[]) => void;
  syncFromServer: () => Promise<void>;
}

function syncNotification(id: string | undefined, method: "PATCH" | "DELETE") {
  if (useAuthStore.getState().authProvider !== "supabase") return;
  void fetch(`/api/notifications${method === "DELETE" && id ? `?id=${encodeURIComponent(id)}` : ""}`, {
    method,
    headers: method === "PATCH" ? { "Content-Type": "application/json" } : undefined,
    body: method === "PATCH" ? JSON.stringify(id ? { id } : { markAllRead: true }) : undefined,
  }).catch(() => {});
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [
        // Default initial notifications for demo purposes
        {
          id: "notif-system-1",
          type: "system",
          title: "Welcome to CareerCompass",
          message: "Complete your profile to get the most accurate personalized opportunity matches.",
          createdAt: new Date().toISOString(),
          isRead: false,
        }
      ],
      addNotification: (notif) =>
        set((state) => ({
          notifications: [
            {
              ...notif,
              id: `notif-${Date.now()}`,
              createdAt: new Date().toISOString(),
              isRead: false,
            },
            ...state.notifications,
          ],
        })),
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, isRead: true } : n
          ),
        }));
        syncNotification(id, "PATCH");
      },
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        }));
        syncNotification(undefined, "PATCH");
      },
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
        syncNotification(id, "DELETE");
      },
      clearAll: () => {
        set({ notifications: [] });
        if (useAuthStore.getState().authProvider === "supabase") void fetch("/api/notifications", { method: "DELETE" }).catch(() => {});
      },
      syncFromServer: async () => {
        if (useAuthStore.getState().authProvider !== "supabase") return;
        try {
          const response = await fetch("/api/notifications");
          if (!response.ok) return;
          const { notifications, demo } = await response.json();
          if (demo || !Array.isArray(notifications)) return;
          set({ notifications: notifications.map((item: { id: string; type: Notification["type"]; title: string; message: string; link?: string; is_read: boolean; created_at: string }) => ({
            id: item.id, type: item.type, title: item.title, message: item.message,
            link: item.link ?? undefined, isRead: item.is_read, createdAt: item.created_at,
          })) });
        } catch { /* offline */ }
      },
      generateDeadlineNotifications: (savedOpportunities: Opportunity[]) =>
        set((state) => {
          const now = Date.now();
          const newNotifs: Notification[] = [];

          for (const opp of savedOpportunities) {
            if (!opp?.deadline) continue;

            const deadlineTime = new Date(opp.deadline).getTime();
            const daysLeft = Math.ceil((deadlineTime - now) / 86400000);

            if (daysLeft <= 0 || daysLeft > 14) continue;

            // Don't add duplicate notification for the same opportunity
            const alreadyExists = state.notifications.some(
              (n) => n.link === `/opportunities/${opp.id}` && n.type === "deadline"
            );
            if (alreadyExists) continue;

            newNotifs.push({
              id: `notif-deadline-${opp.id}-${Date.now()}`,
              type: "deadline",
              title: `Deadline Alert: ${opp.title}`,
              message: `${opp.title} closes in ${daysLeft} day${daysLeft === 1 ? "" : "s"}. Don't miss your chance to apply!`,
              createdAt: new Date().toISOString(),
              isRead: false,
              link: `/opportunities/${opp.id}`,
            });
          }

          if (newNotifs.length === 0) return state;

          return {
            notifications: [...newNotifs, ...state.notifications],
          };
        }),
    }),
    {
      name: "cc-notification-storage",
    }
  )
);
