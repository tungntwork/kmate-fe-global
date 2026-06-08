import { api } from '@/lib/api';

// ============================================================
// AUTH
// ============================================================
export const authService = {
  login: (data: { email: string; password: string }) =>
    api.post<{ data: { user: AuthUser; accessToken: string; refreshToken: string } }>('/auth/login', data),

  register: (data: { email: string; password: string; name: string }) =>
    api.post<{ data: { user: AuthUser; accessToken: string; refreshToken: string } }>('/auth/register', data),

  logout: (refreshToken?: string) =>
    api.post('/auth/logout', { refreshToken }),

  me: () =>
    api.get<{ data: AuthUser }>('/auth/me'),

  refresh: (refreshToken: string) =>
    api.post<{ data: { accessToken: string; refreshToken: string } }>('/auth/refresh', { refreshToken }),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/password', data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  getSessions: () =>
    api.get<{ data: { sessions: AuthSession[]; total: number } }>('/auth/sessions'),

  revokeSession: (sessionId: string) =>
    api.delete(`/auth/sessions/${sessionId}`),

  getProviders: () =>
    api.get<{ data: { providers: AuthProvider[] } }>('/auth/providers'),
};

// ============================================================
// COIN / WALLET
// ============================================================
export const coinService = {
  getBalance: () =>
    api.get<{ data: CoinBalance }>('/coins/balance'),

  getHistory: (params?: { page?: number; limit?: number; type?: string }) =>
    api.get<{ data: CoinTransaction[]; pagination: Pagination }>('/coins/history', { params }),

  getPackages: () =>
    api.get<{ data: CoinPackage[] }>('/coins/packages'),

  getRewards: () =>
    api.get<{ data: CoinReward[] }>('/coins/rewards'),

  dailyLogin: () =>
    api.post<{ data: DailyLoginResponse }>('/coins/daily-login'),
};

// ============================================================
// USERS
// ============================================================
export const userService = {
  getProfile: () =>
    api.get<{ data: UserProfile }>('/users/profile'),

  updateProfile: (data: { name?: string; avatar?: string; preferences?: Record<string, unknown> }) =>
    api.put('/users/profile', data),

  getStatistics: () =>
    api.get<{ data: UserStatistics }>('/users/statistics'),

  getAchievements: () =>
    api.get<{ data: UserAchievement[] }>('/users/achievements'),

  updatePreferences: (preferences: Record<string, unknown>) =>
    api.put('/users/preferences', { preferences }),

  getHistory: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: LearningHistory[]; pagination: Pagination }>('/users/history', { params }),
};

// ============================================================
// NOTIFICATIONS
// ============================================================
export const notificationService = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: Notification[]; pagination: Pagination }>('/notifications', { params }),

  markAsRead: (ids?: string[]) =>
    api.put('/notifications/read', { notificationIds: ids }),

  markOneAsRead: (id: string) =>
    api.put(`/notifications/${id}/read`),

  delete: (id: string) =>
    api.delete(`/notifications/${id}`),
};

// ============================================================
// ADMIN
// ============================================================
export const adminService = {
  getDashboard: () =>
    api.get<{ data: AdminDashboard }>('/admin/dashboard'),

  getUsers: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get<{ data: AdminUser[]; pagination: Pagination }>('/admin/users', { params }),

  getUser: (id: string) =>
    api.get<{ data: AdminUserDetail }>(`/admin/users/${id}`),

  banUser: (id: string, reason?: string) =>
    api.post(`/admin/users/${id}/ban`, { reason }),

  unbanUser: (id: string) =>
    api.post(`/admin/users/${id}/unban`),

  grantCoins: (id: string, data: { amount: number; reason?: string }) =>
    api.post<{ data: { balance: number; amount: number; notificationId: string } }>(
      `/admin/users/${id}/grant-coins`,
      data,
    ),

  getTransactions: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: AdminTransaction[]; pagination: Pagination }>('/admin/transactions', { params }),

  getPayments: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get<{ data: AdminPayment[]; pagination: Pagination }>('/admin/payments', { params }),

  getAIQueue: (params?: { status?: string }) =>
    api.get<{ data: AIJob[] }>('/admin/ai-queue', { params }),

  retryAIJob: (id: string) =>
    api.post(`/admin/ai-queue/${id}/retry`),

  cancelAIJob: (id: string) =>
    api.post(`/admin/ai-queue/${id}/cancel`),

  getAchievements: () =>
    api.get<{ data: Achievement[] }>('/admin/achievements'),

  createAchievement: (data: AchievementInput) =>
    api.post<{ data: Achievement }>('/admin/achievements', data),

  updateAchievement: (id: string, data: Partial<AchievementInput>) =>
    api.put<{ data: Achievement }>(`/admin/achievements/${id}`, data),

  getPackages: () =>
    api.get<{ data: CoinPackageAdmin[] }>('/admin/packages'),

  createPackage: (data: PackageInput) =>
    api.post<{ data: CoinPackageAdmin }>('/admin/packages', data),

  updatePackage: (id: string, data: Partial<PackageInput>) =>
    api.put<{ data: CoinPackageAdmin }>(`/admin/packages/${id}`, data),

  getLogs: (params?: { page?: number; limit?: number; action?: string }) =>
    api.get<{ data: AdminLog[]; pagination: Pagination }>('/admin/logs', { params }),

  getAnalytics: () =>
    api.get<{ data: AdminAnalytics }>('/admin/analytics'),
};

// ============================================================
// TYPES
// ============================================================
export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: string;
  coinBalance: number;
  streak: number;
  isNewUser: boolean;
  preferences?: Record<string, unknown>;
  createdAt: string;
}

export interface AuthSession {
  id: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}

export interface AuthProvider {
  provider: string;
  email: string;
  name: string | null;
  linkedAt: string;
  isPrimary: boolean;
}

export interface CoinBalance {
  balance: number;
  lifetimeEarnings: number;
  lifetimeSpent: number;
}

export interface CoinTransaction {
  id: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string | null;
  status: string;
  createdAt: string;
}

export interface CoinPackage {
  id: string;
  name: string;
  description: string | null;
  coinAmount: number;
  bonusCoinAmount?: number;
  price: number;
  isActive: boolean;
  sortOrder?: number;
}

export interface CoinReward {
  id: string;
  type: string;
  name: string;
  description: string | null;
  coinAmount: number;
  maxClaims: number | null;
  currentClaims: number;
  isActive: boolean;
}

export interface DailyLoginResponse {
  message: string;
  reward: number;
  newBalance: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: string;
  coinBalance: number;
  streak: number;
  isNewUser: boolean;
  preferences: Record<string, unknown>;
  createdAt: string;
  userStreak: {
    currentStreak: number;
    longestStreak: number;
    lastActivityDate: string | null;
  };
  _count: {
    flashcards: number;
    quizzes: number;
    watchProgress: number;
  };
}

export interface UserStatistics {
  totalVideosWatched: number;
  totalFlashcards: number;
  totalFlashcardReviews: number;
  totalQuizzesTaken: number;
  totalMinutesLearned: number;
  totalWordsLookedUp: number;
  currentStreak: number;
  longestStreak: number;
  currentCoinBalance: number;
  joinedAt: string;
}

export interface UserAchievement {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  coinReward: number;
  xpReward: number;
  requirement: number;
  isActive: boolean;
  unlockedAt: string | null;
  progress: number;
  isUnlocked: boolean;
}

export interface LearningHistory {
  id: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  wordsLookedUp: number;
  video: {
    id: string;
    youtubeId: string;
    title: string;
    thumbnail: string | null;
  } | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  data?: Record<string, unknown>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Admin types
export interface AdminDashboard {
  totalUsers: number;
  activeUsers: number;
  totalVideos: number;
  totalPayments: number;
  totalRevenue: number;
  pendingAIJobs: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  role: string;
  isBanned: boolean;
  coinBalance: number;
  streak: number;
  createdAt: string;
  lastActiveAt: string | null;
  _count: {
    flashcards: number;
    quizzes: number;
  };
}

export interface AdminUserDetail extends AdminUser {
  preferences: Record<string, unknown>;
  _count: {
    flashcards: number;
    quizzes: number;
    watchProgress: number;
    payments: number;
  };
}

export interface AdminTransaction {
  id: string;
  userId: string;
  walletId: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: string;
  description: string | null;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
}

export interface AdminPayment {
  id: string;
  userId: string;
  amount: number;
  coinAmount: number;
  status: string;
  payosOrderCode: string | null;
  createdAt: string;
  paidAt: string | null;
  user: { id: string; email: string; name: string | null };
}

export interface AIJob {
  id: string;
  userId: string;
  videoId: string;
  type: string;
  status: string;
  progress: number;
  stage: string;
  retryCount: number;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
  user: { id: string; email: string; name: string | null };
  video: { id: string; title: string; youtubeId: string };
}

export interface Achievement {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: string;
  coinReward: number;
  xpReward: number;
  requirement: number;
  isActive: boolean;
  createdAt: string;
}

export type AchievementInput = Omit<Achievement, 'id' | 'createdAt'>;
export type PackageInput = Omit<CoinPackage, 'id'>;

export interface CoinPackageAdmin extends CoinPackage {
  sortOrder: number;
}

export interface AdminLog {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId: string;
  newData?: Record<string, unknown>;
  createdAt: string;
  admin: { id: string; email: string; name: string | null };
}

export interface AdminAnalytics {
  dailyStats: Array<{
    date: string;
    videosWatched: number;
    minutesLearned: number;
    flashcardsReviewed: number;
    quizzesTaken: number;
    coinsEarned: number;
    coinsSpent: number;
  }>;
  revenueStats: Array<{ date: string; amount: number }>;
  paymentBreakdown: Array<{ status: string; count: number; totalAmount: number }>;
  userStats: {
    total: number;
    newLast30d: number;
    activeLast7d: number;
    roleBreakdown: Array<{ role: string; count: number }>;
  };
  aiJobStats: {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    deadLetter: number;
    total: number;
    typeBreakdown: Array<{ type: string; count: number }>;
  };
  platformStats: Array<{
    date: string;
    newUsers: number;
    activeUsers: number;
    totalVideosWatched: number;
    totalMinutesLearned: number;
    totalRevenue: number;
  }>;
}

// ============================================================
// VIDEO DISCOVERY
// ============================================================
export interface VideoSearchResult {
  youtubeId: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: number;
  channelId: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: number;
  language: string;
  hasSubtitles: boolean;
  subtitleLanguages: string[];
  isKoreanVideo: boolean;
  relevanceScore: number;
  cachedAt: string;
}

export interface VideoDetailResult extends VideoSearchResult {
  tags: string[];
  category: string;
  likes?: number;
  comments?: number;
}

export const videoService = {
  discoverSearch: (params: {
    q: string;
    page?: number;
    limit?: number;
    sort?: string;
    duration?: string;
    subtitleFilter?: string;
    language?: string;
  }) =>
    api.get<{ data: { videos: VideoSearchResult[]; pagination: Pagination } }>('/videos/discover/search', { params }),

  discoverTrending: (params?: { page?: number; limit?: number; regionCode?: string }) =>
    api.get<{ data: { videos: VideoSearchResult[]; pagination: Pagination } }>('/videos/discover/trending', { params }),

  discoverVideo: (youtubeId: string) =>
    api.get<{ data: VideoDetailResult }>(`/videos/discover/${youtubeId}`),

  search: (params: { q: string; page?: number; limit?: number }) =>
    api.get<{ data: VideoSearchResult[] }>('/videos/search', { params }),

  getVideo: (id: string) =>
    api.get<{ data: unknown }>(`/videos/${id}`),

  unlockVideo: (id: string) =>
    api.post(`/videos/${id}/unlock`),

  getProgress: (id: string) =>
    api.get<{ data: unknown }>(`/videos/${id}/progress`),

  updateProgress: (id: string, data: { currentTime: number; duration: number }) =>
    api.put(`/videos/${id}/progress`, data),
};

// ============================================================
// SHORTS
// ============================================================
export interface Short {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  duration: number;
  viewCount: number;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
}

export const shortsService = {
  getFeed: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: Short[] }>('/shorts/feed', { params }),

  getShort: (id: string) =>
    api.get<{ data: Short }>(`/shorts/${id}`),

  recordView: (id: string) =>
    api.post(`/shorts/${id}/view`),

  toggleLike: (id: string) =>
    api.post(`/shorts/${id}/like`),

  list: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: Short[] }>('/shorts', { params }),
};

// ============================================================
// FLASHCARDS
// ============================================================
export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  example?: string;
  pronunciation?: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
  nextReview: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardDeck {
  id: string;
  name: string;
  description: string | null;
  cardCount: number;
  dueCount: number;
  color: string;
  createdAt: string;
}

export interface FlashcardStats {
  totalCards: number;
  dueToday: number;
  newCards: number;
  reviewedToday: number;
  streak: number;
}

export const flashcardService = {
  getDecks: () =>
    api.get<{ data: FlashcardDeck[] }>('/flashcards/decks'),

  createDeck: (data: { name: string; description?: string; color?: string }) =>
    api.post<{ data: FlashcardDeck }>('/flashcards/decks', data),

  updateDeck: (id: string, data: Partial<{ name: string; description: string; color: string }>) =>
    api.put<{ data: FlashcardDeck }>(`/flashcards/decks/${id}`, data),

  deleteDeck: (id: string) =>
    api.delete(`/flashcards/decks/${id}`),

  getFlashcards: (params?: { deckId?: string; page?: number; limit?: number }) =>
    api.get<{ data: Flashcard[]; pagination: Pagination }>('/flashcards', { params }),

  createFlashcard: (data: { word: string; meaning: string; exampleSentence?: string; exampleTranslation?: string; pronunciation?: string; deckId?: string; videoId?: string }) =>
    api.post<{ data: Flashcard }>('/flashcards', data),

  updateFlashcard: (id: string, data: Partial<{ front: string; back: string; example: string; pronunciation: string }>) =>
    api.put<{ data: Flashcard }>(`/flashcards/${id}`, data),

  deleteFlashcard: (id: string) =>
    api.delete(`/flashcards/${id}`),

  getDue: () =>
    api.get<{ data: Flashcard[] }>('/flashcards/due'),

  review: (data: { flashcardId: string; quality: number }) =>
    api.post<{ data: Flashcard }>('/flashcards/review', data),

  createFromVocabulary: (data: { videoId?: string; wordIds: string[]; deckName?: string; deckId?: string }) =>
    api.post<{ data: { deckId: string; createdCount: number } }>('/flashcards/from-vocabulary', data),

  getStats: () =>
    api.get<{ data: FlashcardStats }>('/flashcards/stats'),

  // ── Session progress ─────────────────────────────────────────────
  startSession: (data: { deckId?: string; cardIds: string[] }) =>
    api.post<{ data: { id: string; deckId: string | null; cardIds: string[]; currentIndex: number; status: string } }>('/flashcards/session/start', data),

  getSession: () =>
    api.get<{ data: { id: string; deckId: string | null; cardIds: string[]; currentIndex: number; answeredIds: string[]; status: string } | null }>('/flashcards/session'),

  updateSessionProgress: (data: { sessionId: string; currentIndex: number; answeredIds: string[] }) =>
    api.patch<{ data: { id: string; currentIndex: number; answeredIds: string[] } }>('/flashcards/session/progress', data),

  completeSession: (data: { sessionId: string }) =>
    api.post<{ data: { id: string; status: string } }>('/flashcards/session/complete', data),
};

// ============================================================
// QUIZ
// ============================================================
export interface QuizQuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  type: string;
  question: string;
  questionKorean: string | null;
  options: QuizQuestionOption[];
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
    options: QuizQuestionOption[];
    isCorrect: boolean;
  }>;
}

export interface QuizHistoryItem {
  id: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string | null;
  type: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
  timeSpent: number;
  status: string;
  createdAt: string;
}

export interface QuizDeck {
  id: string;
  deckId?: string;
  deckName?: string;
  mode: 'deck' | 'random' | 'ai';
  totalQuestions: number;
  timeLimit: number;
  expiresAt: string;
  questions: QuizQuestion[];
}

export const quizService = {
  // List quiz history
  getHistory: (params?: { page?: number; limit?: number }) =>
    api.get<{ data: { quizzes: QuizHistoryItem[]; pagination: Pagination } }>('/quiz', { params }),

  // Get user quiz stats
  getStats: () =>
    api.get<{ data: {
      totalQuizzes: number;
      avgScore: number;
      bestScore: number;
      bestCorrect: number;
      bestTotal: number;
      totalCorrect: number;
      totalAnswered: number;
    } }>('/quiz/stats'),

  // Create a new quiz from deck / random / ai
  createQuiz: (data: { deckId?: string; videoId?: string; mode?: 'deck' | 'random' | 'ai'; count?: number }) =>
    api.post<{ data: QuizDeck }>('/quiz', data),

  // Get quiz with questions by quizId
  getQuiz: (quizId: string) =>
    api.get<{ data: QuizDeck }>(`/quiz/${quizId}`),

  // Submit quiz answers
  submitQuiz: (data: {
    quizId: string;
    answers: Array<{ questionId: string; answer: string; timeSpent?: number }>;
  }) => api.post<{ data: QuizResult }>('/quiz/submit', data),

  // Retry a quiz
  retryQuiz: (quizId: string, data?: { count?: number }) =>
    api.post<{ data: QuizDeck }>(`/quiz/${quizId}/retry`, data ?? {}),

  // ── Progress tracking ─────────────────────────────────────────────
  resumeQuiz: (quizId: string) =>
    api.post<{ data: {
      quizId: string;
      currentQuestion: number;
      answersJson: Record<string, string>;
      questions: QuizQuestion[];
      expiresAt: string;
      startedAt: string;
      timeLimit: number;
    } }>(`/quiz/${quizId}/resume`),

  saveProgress: (quizId: string, data: { currentQuestion: number; answersJson: Record<string, string> }) =>
    api.patch<{ data: { saved: boolean; currentQuestion: number } }>(`/quiz/${quizId}/progress`, data),

  pauseQuiz: (quizId: string, data: { currentQuestion: number; answersJson: Record<string, string> }) =>
    api.patch<{ data: { paused: boolean } }>(`/quiz/${quizId}/pause`, data),
};

// ============================================================
// SUBTITLES
// ============================================================
export interface Subtitle {
  id: string;
  videoId: string;
  language: string;
  isAutoGenerated: boolean;
  subtitleContent: unknown; // JSON array from Prisma
  bilingualContent: unknown; // JSON array from Prisma
  source: string;
  createdAt: string;
}

export const subtitleService = {
  getSubtitles: (videoId: string) =>
    api.get<{ data: { videoId: string; subtitles: Subtitle[] } }>(`/subtitles/${videoId}`),

  requestGeneration: (data: { videoId: string; language?: string }) =>
    api.post<{ data: { jobId: string; videoId: string; status: string } }>('/subtitles/generate', data),

  getJobStatus: (jobId: string) =>
    api.get<{ data: { id: string; status: string; progress: number; stage: string } }>(`/subtitles/jobs/${jobId}`),

  listJobs: () =>
    api.get<{ data: unknown[] }>('/subtitles/jobs'),

  cancelJob: (jobId: string) =>
    api.delete(`/subtitles/jobs/${jobId}`),
};

// ============================================================
// WAITING / AI JOBS
// ============================================================
export interface WaitingJob {
  id: string;
  videoId: string;
  status: string;
  progress: number;
  stage: string;
  estimatedTime: number;
  createdAt: string;
}

export const waitingService = {
  getJobStatus: (jobId: string) =>
    api.get<{ data: WaitingJob }>(`/waiting/jobs/${jobId}`),

  getJobProgress: (jobId: string) =>
    api.get<{ data: { progress: number; stage: string; estimatedTime: number } }>(`/waiting/jobs/${jobId}/progress`),

  cancelJob: (jobId: string) =>
    api.post(`/waiting/jobs/${jobId}/cancel`),

  deleteJob: (jobId: string) =>
    api.delete(`/waiting/jobs/${jobId}`),
};
