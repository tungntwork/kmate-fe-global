'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface QuizQuestion {
  id: string;
  type: string;
  question: string;
  questionKorean: string | null;
  options: Array<{ id: string; text: string; isCorrect: boolean }>;
  correctAnswer?: string;
  explanation?: string;
}

export interface QuizResult {
  quizId: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  xpEarned: number;
  timeSpent: number;
  feedback: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    vocabularyToReview: Array<{ word: string; meaning: string; reason: string }>;
  };
  review: Array<{
    questionId: string;
    question: string;
    questionKorean: string | null;
    yourAnswer: string | null;
    correctAnswer: string;
    options: Array<{ id: string; text: string; isCorrect: boolean }>;
    isCorrect: boolean;
  }>;
}

export interface QuizSession {
  quizId: string;
  deckId?: string;
  deckName?: string;
  mode: 'deck' | 'random' | 'ai';
  sourceType?: 'deck' | 'wrong_answers' | 'all' | 'video';
  sourceIds?: { deckIds?: string[]; wrongQuizIds?: string[] };
  questions: QuizQuestion[];
  currentIndex: number;
  answers: Record<string, string>; // questionId → selected option id
  questionTimes: Record<string, number>; // questionId → ms spent
  startedAt: number;
  timeLimit: number;
  expiresAt: string;
  status: 'idle' | 'loading' | 'taking' | 'submitted' | 'error';
  result?: QuizResult;
  error?: string;
}

interface QuizStore {
  session: QuizSession | null;
  // Actions
  startQuiz: (session: Omit<QuizSession, 'status'>) => void;
  answerQuestion: (questionId: string, optionId: string) => void;
  nextQuestion: () => void;
  prevQuestion: () => void;
  goToQuestion: (index: number) => void;
  setResult: (result: QuizResult) => void;
  setError: (error: string) => void;
  setLoading: () => void;
  resumeFromServer: (data: {
    quizId: string;
    deckId?: string | null;
    currentQuestion: number;
    answersJson: Record<string, string>;
    questions: QuizQuestion[];
    expiresAt: string;
    startedAt: string;
    timeLimit: number;
    mode?: 'deck' | 'random' | 'ai';
    sourceType?: 'deck' | 'wrong_answers' | 'all' | 'video';
  }, deckName?: string) => void;
  reset: () => void;
}

export const useQuizStore = create<QuizStore>()(
  persist(
    (set, get) => ({
      session: null,

      startQuiz: (session) => {
        set({
          session: {
            ...session,
            status: 'taking',
            startedAt: Date.now(),
            answers: {},
            questionTimes: {},
          },
        });
      },

      answerQuestion: (questionId, optionId) => {
        const { session } = get();
        if (!session || session.status !== 'taking') return;

        set({
          session: {
            ...session,
            answers: { ...session.answers, [questionId]: optionId },
          },
        });
      },

      nextQuestion: () => {
        const { session } = get();
        if (!session || session.status !== 'taking') return;
        const max = session.questions.length - 1;
        if (session.currentIndex < max) {
          set({ session: { ...session, currentIndex: session.currentIndex + 1 } });
        }
      },

      prevQuestion: () => {
        const { session } = get();
        if (!session || session.status !== 'taking') return;
        if (session.currentIndex > 0) {
          set({ session: { ...session, currentIndex: session.currentIndex - 1 } });
        }
      },

      goToQuestion: (index) => {
        const { session } = get();
        if (!session || session.status !== 'taking') return;
        if (index >= 0 && index < session.questions.length) {
          set({ session: { ...session, currentIndex: index } });
        }
      },

      setResult: (result) => {
        const { session } = get();
        if (!session) return;
        set({ session: { ...session, status: 'submitted', result } });
      },

      setError: (error) => {
        const { session } = get();
        if (!session) return;
        set({ session: { ...session, status: 'error', error } });
      },

      setLoading: () => {
        const { session } = get();
        if (!session) return;
        set({ session: { ...session, status: 'loading' } });
      },

      resumeFromServer: (data, deckName) => {
        // Clear stale persisted state first to prevent Zustand persist from overwriting
        if (typeof window !== 'undefined') {
          localStorage.removeItem('kmate-quiz');
        }
        set({
          session: {
            quizId: data.quizId,
            deckId: data.deckId ?? undefined,
            deckName: deckName,
            mode: (data.mode as 'deck' | 'random' | 'ai') ?? 'deck',
            sourceType: (data.sourceType as 'deck' | 'wrong_answers' | 'all' | 'video') ?? undefined,
            questions: data.questions,
            currentIndex: data.currentQuestion,
            answers: typeof data.answersJson === 'string'
              ? (() => { try { return JSON.parse(data.answersJson); } catch { return {}; } })()
              : (data.answersJson ?? {}),
            questionTimes: {},
            startedAt: data.startedAt ? new Date(data.startedAt).getTime() : Date.now(),
            timeLimit: data.timeLimit,
            expiresAt: data.expiresAt,
            status: 'taking',
          },
        });
      },

      reset: () => {
        set({ session: null });
      },
    }),
    {
      name: 'kmate-quiz',
      onRehydrateStorage: () => (state) => {
        // Rehydrating from localStorage
      },
      partialize: (state) => ({
        session: state.session ? {
          quizId: state.session.quizId,
          deckId: state.session.deckId,
          deckName: state.session.deckName,
          mode: state.session.mode,
          sourceType: state.session.sourceType,
          sourceIds: state.session.sourceIds,
          questions: state.session.questions,
          currentIndex: state.session.currentIndex,
          answers: state.session.answers,
          questionTimes: state.session.questionTimes,
          startedAt: state.session.startedAt,
          timeLimit: state.session.timeLimit,
          expiresAt: state.session.expiresAt,
          status: state.session.status,
        } : null,
      }),
    }
  )
);
