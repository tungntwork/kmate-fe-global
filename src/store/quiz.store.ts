'use client';

import { create } from 'zustand';

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
  reset: () => void;
}

export const useQuizStore = create<QuizStore>((set, get) => ({
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

  reset: () => {
    set({ session: null });
  },
}));
