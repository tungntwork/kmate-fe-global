import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Flashcard {
  id: string;
  word: string;
  reading: string | null;
  meaning: string;
  masteryLevel: 'NEW' | 'LEARNING' | 'REVIEWING' | 'MASTERED';
  nextReview: Date;
}

export interface FlashcardSessionState {
  sessionId: string | null;
  deckId: string | null;
  cardIds: string[];
  currentIndex: number;
  answeredIds: string[];
}

interface FlashcardState {
  // Persisted progress state
  session: FlashcardSessionState | null;

  // Actions
  setSession: (session: FlashcardSessionState | null) => void;
  updateProgress: (currentIndex: number, answeredIds: string[]) => void;
  clearSession: () => void;
}

export const useFlashcardStore = create<FlashcardState>()(
  persist(
    (set) => ({
      session: null,

      setSession: (session) => set({ session }),

      updateProgress: (currentIndex, answeredIds) =>
        set((state) => ({
          session: state.session
            ? { ...state.session, currentIndex, answeredIds }
            : null,
        })),

      clearSession: () => set({ session: null }),
    }),
    {
      name: 'kmate-flashcard',
    }
  )
);
