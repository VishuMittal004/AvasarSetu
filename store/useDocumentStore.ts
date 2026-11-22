import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DocumentChecklistItem {
  id: string;
  name: string;
  category: string;
  completedAt: string;
}

interface DocumentState {
  documents: Record<string, DocumentChecklistItem>;
  markReady: (id: string, name: string, category: string) => void;
  removeDocument: (id: string) => void;
  clearAll: () => void;
}

export const useDocumentStore = create<DocumentState>()(
  persist(
    (set, get) => ({
      documents: {},
      
      markReady: (id, name, category) => set(state => ({
        documents: { ...state.documents, [id]: { id, name, category, completedAt: new Date().toISOString() } },
      })),
      removeDocument: (id) => set((state) => {
        const newDocs = { ...state.documents };
        delete newDocs[id];
        return { documents: newDocs };
      }),
      clearAll: () => set({ documents: {} }),
    }),
    {
      name: "cc-document-metadata", // Store metadata in localStorage
    }
  )
);
