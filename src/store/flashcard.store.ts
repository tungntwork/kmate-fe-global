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
  /** 'deck' = deck-based session; 'due_random' = shuffled due cards started from Ngẫu nhiên tab */
  source: 'deck' | 'due_random';
  /** True after user has clicked "Lưu tiến độ" — skip resume modal on next load */
  saved: boolean;
  /** Session status — used for beforeunload beacon logic */
  status?: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
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
