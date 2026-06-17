'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Spin, Modal,  } from "antd";
import { App } from 'antd';
import {
  QuestionOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RightOutlined,
  ArrowLeftOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  BookOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  FireOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { quizService, flashcardService, type QuizDeck, type QuizQuestion, type QuizResult } from '@/lib/api-services';
import { useQuizStore } from '@/store/quiz.store';
import { ConfirmModal } from '@/components/common/confirm-modal';

type Screen = 'home' | 'quiz' | 'result';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DeckInfo {
  id: string;
  name: string;
  cardCount: number;
  dueCount: number;
  color: string;
  icon: string;
}

interface UserStats {
  totalQuizzes: number;
  avgScore: number;
  bestScore: number;
  bestCorrect: number;
  bestTotal: number;
}

const DECK_COLORS = ['#7C4DFF', '#00e5ff', '#f59e0b', '#22c55e', '#ec4899', '#06b6d4'];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

// ─── Score Circle ─────────────────────────────────────────────────────────────

function ScoreCircle({ score, size = 160 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (score / 100);
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={12} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={12}
          strokeDasharray={`${filled} ${circumference}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-black" style={{ color }}>{Math.round(score)}%</span>
        <span className="text-xs text-slate-400 mt-1">Điểm</span>
      </div>
    </div>
  );
}

// ─── Deck Card ───────────────────────────────────────────────────────────────

function DeckCard({
  deck,
  mode,
  color,
  onStart,
  loading,
}: {
  deck?: DeckInfo;
  mode: 'random' | 'ai';
  color: string;
  onStart: () => void;
  loading: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const isRandom = mode === 'random';
  const label = isRandom ? 'Quiz ngẫu nhiên' : 'Quiz thông minh (AI)';
  const sublabel = isRandom ? 'Hỏi từ tất cả các bộ thẻ' : 'Câu hỏi được tạo bởi AI';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      className="relative rounded-2xl p-6 cursor-pointer select-none"
      style={{
        background: 'rgba(21,28,42,0.8)',
        border: `1px solid ${hovered ? color + '60' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: hovered ? `0 0 24px ${color}25` : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onStart}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
          style={{ background: color + '20', border: `1px solid ${color}30` }}
        >
          {isRandom ? <ThunderboltOutlined style={{ color }} /> : <QuestionOutlined style={{ color }} />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-base mb-0.5">{label}</h3>
          <p className="text-slate-500 text-xs">{sublabel}</p>
        </div>
      </div>
      {loading ? (
        <div className="mt-4 flex justify-center">
          <Spin size="small" />
        </div>
      ) : (
        <Button
          type="primary"
          block
          className="mt-4 !font-bold !rounded-xl !h-10"
          style={{ background: color + '20', border: `1px solid ${color}40`, color }}
        >
          Bắt đầu quiz
        </Button>
      )}
    </motion.div>
  );
}

// ─── Quiz Home Screen ────────────────────────────────────────────────────────

type QuizSortOption = 'newest' | 'name_asc' | 'name_desc' | 'cards_desc' | 'cards_asc';

function QuizHomeScreen({
  decks,
  stats,
  loading,
  onStartQuiz,
  wrongAnswersData,
  loadingWrongAnswers,
  onDeleteDeck,
}: {
  decks: DeckInfo[];
  stats: UserStats | null;
  loading: boolean;
  onStartQuiz: (mode: 'deck' | 'random' | 'ai' | 'wrong_answers', deckId?: string, sourceType?: string, sourceIds?: { wrongQuizIds?: string[] }) => void;
  wrongAnswersData?: {
    totalWrongAnswers: number;
    totalUniqueWords: number;
    quizIds: string[];
  };
  loadingWrongAnswers?: boolean;
  onDeleteDeck: (id: string, name: string) => void;
}) {
  const { message } = App.useApp();
  const [deckLoading, setDeckLoading] = useState<'random' | 'ai' | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<QuizSortOption>('newest');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const sorted = [...decks].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc': return a.name.localeCompare(b.name);
      case 'name_desc': return b.name.localeCompare(a.name);
      case 'cards_desc': return b.cardCount - a.cardCount;
      case 'cards_asc': return a.cardCount - b.cardCount;
      default: return 0;
    }
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);
  const startIdx = sorted.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const endIdx = Math.min(page * pageSize, sorted.length);

  const handleSpecialStart = async (mode: 'random' | 'ai') => {
    setDeckLoading(mode);
    await onStartQuiz(mode);
    setDeckLoading(null);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl lg:text-4xl font-extrabold text-white">
          Luyện tập{' '}
          <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Quiz</span>
        </h1>
        <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
          <QuestionOutlined className="text-primary" />
          Kiểm tra kiến thức từ các bộ flashcard của bạn.
        </p>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="user-glass-card p-4 flex flex-col items-center gap-1">
            <TrophyOutlined className="text-lg text-amber-400" />
            <span className="text-2xl font-extrabold text-white">{stats.totalQuizzes}</span>
            <span className="text-xs text-slate-500">Tổng quiz</span>
          </div>
          <div className="user-glass-card p-4 flex flex-col items-center gap-1">
            <FireOutlined className="text-lg text-green-400" />
            <span className="text-2xl font-extrabold text-white">
              {stats.avgScore > 0 ? `${Math.round(stats.avgScore)}%` : '—'}
            </span>
            <span className="text-xs text-slate-500">Điểm TB</span>
          </div>
          <div className="user-glass-card p-4 flex flex-col items-center gap-1">
            <ClockCircleOutlined className="text-lg text-primary-400" />
            <span className="text-2xl font-extrabold text-white">
              {stats.bestScore > 0 ? `${Math.round(stats.bestScore)}%` : '—'}
            </span>
            <span className="text-xs text-slate-500">Điểm cao nhất</span>
          </div>
        </div>
      )}

      {/* Special quiz modes */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Chế độ đặc biệt</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DeckCard
            mode="random"
            color={DECK_COLORS[1]}
            onStart={() => handleSpecialStart('random')}
            loading={deckLoading === 'random'}
          />
          <DeckCard
            mode="ai"
            color={DECK_COLORS[0]}
            onStart={() => handleSpecialStart('ai')}
            loading={deckLoading === 'ai'}
          />
        </div>
      </div>

      {/* Quiz từ câu sai */}
      {wrongAnswersData && wrongAnswersData.totalUniqueWords >= 4 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl p-5 cursor-pointer select-none"
          style={{
            background: 'rgba(249,115,22,0.06)',
            border: '1px solid rgba(249,115,22,0.25)',
          }}
          whileHover={{ scale: 1.01, borderColor: 'rgba(249,115,22,0.5)' }}
          onClick={() =>
            onStartQuiz(
              'wrong_answers',
              undefined,
              'wrong_answers',
              { wrongQuizIds: wrongAnswersData.quizIds },
            )
          }
        >
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
              style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)' }}
            >
              <CloseCircleOutlined style={{ color: '#f59e0b' }} />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-sm">Quiz từ câu sai</h3>
              <p className="text-slate-400 text-xs">
                {wrongAnswersData.totalUniqueWords} từ cần ôn lại
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(249,115,22,0.12)', color: '#f59e0b', border: '1px solid rgba(249,115,22,0.3)' }}
            >
              {wrongAnswersData.totalWrongAnswers} câu sai
            </span>
            <Button
              size="small"
              className="!font-bold !rounded-lg !text-xs"
              style={{ background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', color: '#f59e0b' }}
            >
              Luyện lại
            </Button>
          </div>
        </motion.div>
      )}

      {/* Flashcard decks */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : decks.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">Bộ flashcard của bạn</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {startIdx}-{endIdx} / {sorted.length} bộ
              </span>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value as QuizSortOption); setPage(1); }}
                className="bg-white/5 border border-white/10 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary cursor-pointer"
              >
                <option value="newest">Mới nhất</option>
                <option value="name_asc">Tên A→Z</option>
                <option value="name_desc">Tên Z→A</option>
                <option value="cards_desc">Nhiều thẻ nhất</option>
                <option value="cards_asc">Ít thẻ nhất</option>
              </select>
              <div className="flex items-center rounded-lg border border-white/10 overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-2.5 py-1.5 text-xs transition-colors ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                >
                  <AppstoreOutlined style={{ fontSize: 14 }} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-2.5 py-1.5 text-xs transition-colors ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-white/5 text-slate-400 hover:text-white'}`}
                >
                  <UnorderedListOutlined style={{ fontSize: 14 }} />
                </button>
              </div>
            </div>
          </div>

          <div className={viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
          }>
            {paginated.map((deck) => (
              <div key={deck.id} className="relative group">
                {viewMode === 'grid' ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative rounded-2xl p-5 cursor-pointer select-none"
                    style={{
                      background: 'rgba(21,28,42,0.8)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    whileHover={{ scale: 1.02, borderColor: deck.color + '60' }}
                    onClick={() => onStartQuiz('deck', deck.id)}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                        style={{ background: deck.color + '20', color: deck.color }}
                      >
                        <BookOutlined />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-bold text-sm truncate">{deck.name}</h3>
                        <p className="text-slate-500 text-xs">
                          Tổng cộng <span className="font-bold text-white">{deck.cardCount}</span> từ
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      {deck.dueCount > 0 ? (
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: '#7C4DFF20', color: '#a78bfa', border: '1px solid #7C4DFF40' }}
                        >
                          {deck.dueCount} cần ôn
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-600">Không có từ cần ôn</span>
                      )}
                      <Button
                        size="small"
                        className="!font-bold !rounded-lg !text-xs"
                        style={{ background: deck.color + '20', border: `1px solid ${deck.color}40`, color: deck.color }}
                      >
                        Quiz
                      </Button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="user-glass-card p-4 flex items-center gap-4 cursor-pointer hover:border-primary/40 transition-all"
                    whileHover={{ scale: 1.01 }}
                    onClick={() => onStartQuiz('deck', deck.id)}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ background: deck.color + '20', color: deck.color }}
                    >
                      <BookOutlined />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-sm truncate">{deck.name}</h3>
                      <p className="text-slate-500 text-xs">
                        {deck.cardCount} từ {deck.dueCount > 0 ? `· ${deck.dueCount} cần ôn` : ''}
                      </p>
                    </div>
                    <Button
                      size="small"
                      className="!font-bold !rounded-lg !text-xs"
                      style={{ background: deck.color + '20', border: `1px solid ${deck.color}40`, color: deck.color }}
                    >
                      Quiz
                    </Button>
                  </motion.div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteDeck(deck.id, deck.name); }}
                  className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center
                    bg-red-500/0 text-slate-500 hover:bg-red-500/20 hover:text-red-400
                    transition-all opacity-0 group-hover:opacity-100"
                  title="Xóa bộ quiz"
                >
                  <DeleteOutlined style={{ fontSize: 14 }} />
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                size="small"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="!rounded-lg"
              >
                Trước
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${p === page
                    ? 'bg-primary text-white'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                >
                  {p}
                </button>
              ))}
              <Button
                size="small"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="!rounded-lg"
              >
                Sau
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="user-glass-card p-12 text-center">
          <BookOutlined className="text-4xl text-slate-600 mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Chưa có bộ flashcard nào</h3>
          <p className="text-slate-400 mb-4">Hãy xem video và lưu từ vựng để tạo bộ flashcard!</p>
        </div>
      )}

      <div className="pointer-events-none fixed -bottom-20 -right-20 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none fixed -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-secondary/5 blur-[120px]" />
    </div>
  );
}

// ─── Quiz Taking Screen ─────────────────────────────────────────────────────

function QuizTakingScreen({
  onBack,
  onSubmit,
}: {
  onBack: () => void;
  onSubmit: () => void;
}) {
  const { session, answerQuestion, nextQuestion, prevQuestion, goToQuestion } = useQuizStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Record<string, boolean>>({});

  // Timer display (no auto-submit on expiry — user must click "Nộp bài")
  useEffect(() => {
    if (!session || session.status !== 'taking') return;
    setTimeLeft(session.timeLimit);

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          timerRef.current && clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [session?.quizId, session?.status]);

  // Reset question timer when question changes
  useEffect(() => {
    setQuestionStartTime(Date.now());
    setShowFeedback(false);
  }, [session?.currentIndex]);

  if (!session || session.status !== 'taking') return null;

  const { questions, currentIndex, answers } = session;
  const total = questions.length;
  const currentQ = questions[currentIndex];
  const selectedAnswer = answers[currentQ.id] ?? null;
  const progress = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSelectOption = (optId: string) => {
    if (showFeedback) return;
    const isCorrect = currentQ.options.find(o => o.id === optId)?.isCorrect ?? false;

    answerQuestion(currentQ.id, optId);
    setSelectedFeedback(prev => ({ ...prev, [currentQ.id]: isCorrect }));
    setShowFeedback(true);
    // User controls navigation manually — no auto-advance
  };

  const handleNext = () => {
    if (currentIndex < total - 1) nextQuestion();
  };

  const handlePrev = () => {
    if (currentIndex > 0) prevQuestion();
  };

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === total;

  const getOptionStyle = (opt: { id: string; text: string; isCorrect: boolean }) => {
    const isSelected = selectedAnswer === opt.id;
    if (!showFeedback) {
      return {
        background: isSelected ? 'rgba(124,77,255,0.15)' : 'rgba(255,255,255,0.03)',
        borderColor: isSelected ? '#7C4DFF' : 'rgba(255,255,255,0.08)',
      };
    }
    if (opt.isCorrect) {
      return {
        background: 'rgba(34,197,94,0.15)',
        borderColor: '#22c55e',
      };
    }
    if (isSelected && !opt.isCorrect) {
      return {
        background: 'rgba(239,68,68,0.15)',
        borderColor: '#ef4444',
      };
    }
    return {
      background: 'rgba(255,255,255,0.03)',
      borderColor: 'rgba(255,255,255,0.08)',
    };
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium bg-transparent border-0 cursor-pointer"
        >
          <ArrowLeftOutlined />
          <span>Thoát</span>
        </button>

        <div className="flex-1" />

        {/* Timer */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold"
          style={{
            background: timeLeft < 60 ? 'rgba(239,68,68,0.15)' : 'rgba(124,77,255,0.15)',
            color: timeLeft < 60 ? '#ef4444' : '#a78bfa',
            border: `1px solid ${timeLeft < 60 ? 'rgba(239,68,68,0.3)' : 'rgba(124,77,255,0.3)'}`,
          }}
        >
          <ClockCircleOutlined />
          {fmtTime(timeLeft)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="px-6 pt-3">
        <div className="w-full h-1.5 bg-slate-800/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #7C4DFF, #00e5ff)' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-slate-600">{answeredCount}/{total} đã trả lời</span>
          <span className="text-[10px] text-slate-600">{progress}% hoàn thành</span>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-2xl">
          {/* Korean word */}
          {currentQ.questionKorean && (
            <div
              className="text-center text-3xl font-black mb-3"
              style={{ fontFamily: 'Noto Sans KR, sans-serif', color: '#e2e8f0' }}
            >
              {currentQ.questionKorean}
            </div>
          )}

          {/* Question text */}
          <div className="text-center text-slate-300 text-base mb-4">
            {currentQ.question}
          </div>

          {/* Feedback banner */}
          {showFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-sm font-bold"
              style={{
                background: selectedFeedback[currentQ.id]
                  ? 'rgba(34,197,94,0.12)'
                  : 'rgba(239,68,68,0.12)',
                color: selectedFeedback[currentQ.id] ? '#22c55e' : '#ef4444',
                border: `1px solid ${selectedFeedback[currentQ.id] ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              }}
            >
              {selectedFeedback[currentQ.id] ? (
                <><CheckCircleOutlined /> Chính xác!</>
              ) : (
                <><CloseCircleOutlined /> Sai rồi!</>
              )}
            </motion.div>
          )}

          {/* Options */}
          <div className="space-y-3">
            {currentQ.options.map((opt, i) => {
              const isSelected = selectedAnswer === opt.id;
              const label = OPTION_LABELS[i] ?? String(i);
              const style = getOptionStyle(opt);

              return (
                <motion.button
                  key={opt.id}
                  whileHover={!showFeedback ? { scale: 1.01 } : {}}
                  whileTap={!showFeedback ? { scale: 0.99 } : {}}
                  onClick={() => handleSelectOption(opt.id)}
                  disabled={showFeedback}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all border cursor-pointer disabled:cursor-default"
                  style={style}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                    style={{
                      background: isSelected ? '#7C4DFF' : 'rgba(255,255,255,0.08)',
                      color: isSelected ? 'white' : '#94a3b8',
                    }}
                  >
                    {label}
                  </div>
                  <span className="text-white font-medium text-sm flex-1">{opt.text}</span>
                  {showFeedback && opt.isCorrect && (
                    <CheckCircleOutlined style={{ color: '#22c55e', fontSize: 18 }} />
                  )}
                  {showFeedback && isSelected && !opt.isCorrect && (
                    <CloseCircleOutlined style={{ color: '#ef4444', fontSize: 18 }} />
                  )}
                  {!showFeedback && isSelected && (
                    <CheckCircleOutlined style={{ color: '#7C4DFF', fontSize: 18 }} />
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 pb-6 flex items-center justify-between">
        <Button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="!rounded-xl !h-11 !px-6 !font-bold !text-sm"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: currentIndex === 0 ? 'rgba(255,255,255,0.2)' : 'white',
          }}
        >
          <ArrowLeftOutlined /> Câu trước
        </Button>

        <span className="text-xs text-slate-500">Câu {currentIndex + 1} / {total}</span>

        {currentIndex < total - 1 ? (
          <Button
            onClick={handleNext}
            disabled={!selectedAnswer}
            className="!rounded-xl !h-11 !px-6 !font-bold !text-sm !border-0"
            style={{
              background: selectedAnswer ? 'linear-gradient(90deg, #7C4DFF, #00e5ff)' : 'rgba(255,255,255,0.05)',
              color: selectedAnswer ? 'white' : 'rgba(255,255,255,0.2)',
            }}
          >
            Câu tiếp <RightOutlined />
          </Button>
        ) : (
          <Button
            onClick={onSubmit}
            disabled={!allAnswered}
            className="!rounded-xl !h-11 !px-6 !font-bold !text-sm !border-0"
            style={{
              background: allAnswered ? 'linear-gradient(90deg, #22c55e, #16a34a)' : 'rgba(255,255,255,0.05)',
              color: allAnswered ? 'white' : 'rgba(255,255,255,0.2)',
            }}
          >
            Nộp bài <CheckCircleOutlined />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Result Screen ───────────────────────────────────────────────────────────

function ResultScreen({
  result,
  onRetry,
  onBack,
}: {
  result: QuizResult;
  onRetry: () => void;
  onBack: () => void;
}) {
  const { feedback } = result;
  const scorePct = result.score;

  const getMessage = () => {
    if (scorePct >= 80) return 'Xuất sắc! Bạn làm rất tốt!';
    if (scorePct >= 50) return 'Khá tốt! Hãy tiếp tục cố gắng!';
    return 'Cần luyện tập thêm. Đừng nản chí!';
  };

  return (
    <div className="animate-fade-in">
      {/* Top section */}
      <div className="flex flex-col items-center py-10 gap-6">
        <ScoreCircle score={scorePct} size={180} />

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-extrabold text-white">{getMessage()}</h2>
          <p className="text-slate-400">
            Bạn trả lời đúng{' '}
            <span className="text-green-400 font-bold">{result.correctAnswers}</span>{' '}
            / <span className="font-bold">{result.totalQuestions}</span> câu
          </p>
        </div>

        {/* XP earned */}
        <div
          className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold"
          style={{ background: '#7C4DFF20', border: '1px solid #7C4DFF40', color: '#a78bfa' }}
        >
          <ThunderboltOutlined />
          +{result.xpEarned} XP
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-2">
          <Button
            size="large"
            icon={<ReloadOutlined />}
            onClick={onRetry}
            className="!rounded-xl !h-12 !px-6 !font-bold"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          >
            Làm lại
          </Button>
          <Button
            size="large"
            type="primary"
            icon={<ArrowLeftOutlined />}
            onClick={onBack}
            className="!rounded-xl !h-12 !px-6 !font-bold"
          >
            Quay về
          </Button>
        </div>
      </div>

      {/* Feedback section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2">
        {feedback.strengths.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <h3 className="text-green-400 font-bold text-sm mb-2 flex items-center gap-1.5">
              <CheckCircleOutlined /> Điểm mạnh
            </h3>
            <ul className="space-y-1">
              {feedback.strengths.map((s: string, i: number) => (
                <li key={i} className="text-slate-300 text-xs">• {s}</li>
              ))}
            </ul>
          </div>
        )}
        {feedback.weaknesses.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
            <h3 className="text-amber-400 font-bold text-sm mb-2 flex items-center gap-1.5">
              <CloseCircleOutlined /> Cần cải thiện
            </h3>
            <ul className="space-y-1">
              {feedback.weaknesses.map((w: string, i: number) => (
                <li key={i} className="text-slate-300 text-xs">• {w}</li>
              ))}
            </ul>
          </div>
        )}
        {feedback.recommendations.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: 'rgba(124,77,255,0.08)', border: '1px solid rgba(124,77,255,0.2)' }}>
            <h3 className="text-primary-400 font-bold text-sm mb-2 flex items-center gap-1.5">
              <QuestionOutlined /> Gợi ý
            </h3>
            <ul className="space-y-1">
              {feedback.recommendations.map((r: string, i: number) => (
                <li key={i} className="text-slate-300 text-xs">• {r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Answer review */}
      {result.review && result.review.length > 0 && (
        <div className="mt-6">
          <h3 className="text-white font-bold text-base mb-3">Xem lại câu trả lời</h3>
          <div className="space-y-3">
            {result.review.map((item: { questionId: string; question: string; questionKorean: string | null; yourAnswer: string | null; correctAnswer: string; options: Array<{ id: string; text: string; isCorrect: boolean }>; isCorrect: boolean }, i: number) => (
              <div
                key={item.questionId}
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(21,28,42,0.8)',
                  border: `1px solid ${item.isCorrect ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}
              >
                <div className="flex items-start gap-3 mb-2">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
                    style={{ background: item.isCorrect ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)', color: item.isCorrect ? '#22c55e' : '#ef4444' }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    {item.questionKorean && (
                      <p className="text-white font-bold text-base" style={{ fontFamily: 'Noto Sans KR, sans-serif' }}>
                        {item.questionKorean}
                      </p>
                    )}
                    <p className="text-slate-400 text-xs">{item.question}</p>
                  </div>
                  {item.isCorrect ? (
                    <CheckCircleOutlined className="text-green-400 text-lg ml-auto shrink-0" />
                  ) : (
                    <CloseCircleOutlined className="text-red-400 text-lg ml-auto shrink-0" />
                  )}
                </div>

                {/* Your answer */}
                {item.yourAnswer && (
                  <div className="ml-10 mb-1.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Bạn chọn: </span>
                    <span
                      className="text-sm font-medium"
                      style={{ color: item.isCorrect ? '#22c55e' : '#ef4444' }}
                    >
                      {item.options.find(o => o.id === item.yourAnswer)?.text ?? item.yourAnswer}
                    </span>
                  </div>
                )}

                {/* Correct answer */}
                {!item.isCorrect && item.correctAnswer && (
                  <div className="ml-10">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider">Đáp án đúng: </span>
                    <span className="text-sm font-medium text-green-400">
                      {item.options.find(o => o.id === item.correctAnswer)?.text ?? item.correctAnswer}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function UserQuizPage() {
  const { message } = App.useApp();
  const { session, startQuiz, resumeFromServer, setResult, setError, reset } = useQuizStore();

  const [screen, setScreen] = useState<Screen>('home');
  const [decks, setDecks] = useState<DeckInfo[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resumeModalVisible, setResumeModalVisible] = useState(false);
  const [resumeModalQuizId, setResumeModalQuizId] = useState<string | null>(null);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [wrongAnswersData, setWrongAnswersData] = useState<{ totalWrongAnswers: number; totalUniqueWords: number; quizIds: string[] } | null>(null);
  const [loadingWrongAnswers, setLoadingWrongAnswers] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<QuizResult | null>(null);
  const [lastQuizInfo, setLastQuizInfo] = useState<{ quizId: string; mode: string; deckId?: string; deckName?: string; sourceType?: string; sourceIds?: object } | null>(null);
  // Used by handleRetry to inject a quiz session without going through Zustand persist
  const [pendingRetrySession, setPendingRetrySession] = useState<Omit<import('@/store/quiz.store').QuizSession, 'status'> | null>(null);

  const saveProgressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When pendingRetrySession is set, start the quiz immediately
  useEffect(() => {
    if (pendingRetrySession) {
      startQuiz(pendingRetrySession);
      setPendingRetrySession(null);
    }
  }, [pendingRetrySession, startQuiz]);  // Load decks, stats, wrong answers on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [decksRes, statsRes] = await Promise.allSettled([
          flashcardService.getDecks(),
          quizService.getStats(),
        ]);

        if (decksRes.status === 'fulfilled') {
          const raw = decksRes.value.data.data ?? [];
          setDecks(
            raw.map((d: any, i: number) => ({
              id: d.id,
              name: d.name,
              cardCount: d.cardCount ?? 0,
              dueCount: d.dueCount ?? 0,
              color: d.color ?? DECK_COLORS[i % DECK_COLORS.length],
              icon: d.icon ?? 'book',
            })),
          );
        }

        if (statsRes.status === 'fulfilled') {
          setStats(statsRes.value.data.data ?? null);
        }
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    };
    load();

    // Fetch wrong answers separately
    setLoadingWrongAnswers(true);
    quizService.getWrongAnswers()
      .then(res => {
        const data = res.data.data;
        if (data && data.totalUniqueWords >= 4) {
          setWrongAnswersData({
            totalWrongAnswers: data.totalWrongAnswers,
            totalUniqueWords: data.totalUniqueWords,
            quizIds: data.groups.map((g: { quizId: string }) => g.quizId),
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingWrongAnswers(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check persisted session from localStorage (via Zustand persist)
  useEffect(() => {
    const stored = session;
    if (stored && stored.status === 'taking' && screen === 'home') {
      setResumeModalQuizId(stored.quizId);
      setInProgressCount(Object.keys(stored.answers).length);
      setResumeModalVisible(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Start a quiz
  const handleStartQuiz = useCallback(async (
    mode: 'deck' | 'random' | 'ai' | 'wrong_answers',
    deckId?: string,
    sourceType?: string,
    sourceIds?: { wrongQuizIds?: string[] },
  ) => {
    setLoading(true);
    setError('');
    try {
      const res = await quizService.createQuiz({
        deckId: mode === 'deck' ? deckId : undefined,
        mode: mode === 'wrong_answers' ? 'random' : mode as 'deck' | 'random' | 'ai',
        count: 20,
        sourceType: sourceType as 'deck' | 'wrong_answers' | 'all' | 'video' | undefined,
        sourceIds: sourceIds as { deckIds?: string[]; wrongQuizIds?: string[] } | undefined,
      });

      const data = res.data.data as QuizDeck & { quizId?: string; timeLimit?: number; expiresAt?: string; questions?: QuizQuestion[] };
      const deckInfo = mode === 'deck' && deckId ? decks.find(d => d.id === deckId) : undefined;

      startQuiz({
        quizId: data.quizId ?? data.id,
        deckId: deckInfo?.id,
        deckName: deckInfo?.name,
        mode: mode === 'wrong_answers' ? 'random' : mode as 'deck' | 'random' | 'ai',
        sourceType: sourceType as 'deck' | 'wrong_answers' | 'all' | 'video' | undefined,
        sourceIds: sourceIds as { deckIds?: string[]; wrongQuizIds?: string[] } | undefined,
        questions: data.questions ?? [],
        currentIndex: 0,
        timeLimit: data.timeLimit ?? 300,
        expiresAt: data.expiresAt ?? new Date(Date.now() + 3600000).toISOString(),
        startedAt: Date.now(),
        answers: {} as Record<string, string>,
        questionTimes: {} as Record<string, number>,
      });

      setScreen('quiz');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Không thể tạo quiz';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [decks, startQuiz, setError]);

  // Save progress to backend (debounced)
  const saveProgressToBackend = useCallback(async () => {
    if (!session || session.status !== 'taking' || !session.quizId) return;
    try {
      await quizService.saveProgress(session.quizId, {
        currentQuestion: session.currentIndex,
        answersJson: session.answers,
      });
    } catch (err: any) {
      // If the session is invalid (not found or expired), clear it so the user
      // doesn't get stuck in a broken state. Show a warning to the user.
      const code = err?.response?.data?.error?.code;
      if (code === 'NOT_FOUND' || code === 'QUIZ_EXPIRED') {
        reset();
        message.warning('Phiên quiz đã hết hạn. Tiến trình không được lưu tự động.');
      }
    }
  }, [session]);

  // Debounced save on answer
  useEffect(() => {
    if (screen !== 'quiz' || !session) return;
    if (saveProgressDebounceRef.current) clearTimeout(saveProgressDebounceRef.current);
    saveProgressDebounceRef.current = setTimeout(() => {
      saveProgressToBackend();
    }, 2000);
    return () => {
      if (saveProgressDebounceRef.current) clearTimeout(saveProgressDebounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.answers, session?.currentIndex, screen]);

  // Submit quiz
  const handleSubmitQuiz = useCallback(async () => {
    if (!session) return;

    if (submitting) return;

    // Client-side expiration check (only if expiresAt is valid)
    if (session.expiresAt) {
      const expiresAtMs = new Date(session.expiresAt).getTime();
      if (isNaN(expiresAtMs)) {
        // invalid expiresAt, skip check
      } else if (Date.now() > expiresAtMs) {
        message.error('Quiz đã hết hạn! Thời gian làm bài là 30 phút. Vui lòng làm lại.');
        return;
      }
    }

    setSubmitting(true);

    try {
      const answers = Object.entries(session.answers).map(([questionId, answer]) => ({
        questionId,
        answer,
        timeSpent: 0,
      }));

      const res = await quizService.submitQuiz({
        quizId: session.quizId,
        answers,
      });

      const resultData = res.data.data as QuizResult;

      setSubmittedResult(resultData);
      setLastQuizInfo({
        quizId: session.quizId,
        mode: session.mode,
        deckId: session.deckId,
        deckName: session.deckName,
        sourceType: session.sourceType,
        sourceIds: session.sourceIds,
      });
      setScreen('result');

      // Reload stats
      try {
        const statsRes = await quizService.getStats();
        setStats(statsRes.data.data ?? null);
      } catch { /* non-fatal */ }

      // Reload wrong answers data
      try {
        const waRes = await quizService.getWrongAnswers();
        const waData = waRes.data.data;
        if (waData && waData.totalUniqueWords >= 4) {
          setWrongAnswersData({
            totalWrongAnswers: waData.totalWrongAnswers,
            totalUniqueWords: waData.totalUniqueWords,
            quizIds: waData.groups.map((g: { quizId: string }) => g.quizId),
          });
        } else {
          setWrongAnswersData(null);
        }
      } catch { /* non-fatal */ }

      reset();
    } catch (err: any) {
      const status = err?.response?.status;
      const code = err?.response?.data?.error?.code;
      const msg = err?.response?.data?.error?.message ?? err?.message;

      if (code === 'QUIZ_EXPIRED') {
        message.error('Quiz đã hết hạn! Thời gian làm bài là 30 phút. Vui lòng làm lại.');
      } else if (code === 'ALREADY_COMPLETED') {
        message.error('Quiz này đã được nộp rồi.');
      } else if (code === 'NOT_FOUND') {
        message.error('Quiz không tìm thấy. Vui lòng bắt đầu lại.');
      } else if (code === 'INVALID_ANSWERS') {
        message.error('Dữ liệu câu trả lời không hợp lệ.');
      } else if (status === 401 || status === 403) {
        message.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
      } else {
        message.error(msg || 'Lỗi khi nộp bài. Vui lòng thử lại.');
      }
    } finally {
      setSubmitting(false);
    }
  }, [session, reset]);

  // Retry — uses lastQuizInfo since session is reset after submit
  const handleRetry = useCallback(async () => {
    if (!lastQuizInfo) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await quizService.retryQuiz(lastQuizInfo.quizId, { count: 20 });
      const data = res.data.data as QuizDeck & { quizId?: string; questions?: QuizQuestion[]; timeLimit?: number; expiresAt?: string };

      const newQuizId = data.quizId ?? data.id;
      if (!newQuizId || !data.questions?.length) {
        message.error('Không lấy được quiz mới. Vui lòng thử lại.');
        return;
      }

      // Clear stale state before starting new quiz
      reset();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('kmate-quiz');
      }

      // Set pending session so useEffect triggers startQuiz cleanly
      setPendingRetrySession({
        quizId: newQuizId,
        deckId: lastQuizInfo.deckId,
        deckName: lastQuizInfo.deckName,
        mode: lastQuizInfo.mode as 'deck' | 'random' | 'ai',
        sourceType: lastQuizInfo.sourceType as 'deck' | 'wrong_answers' | 'all' | 'video' | undefined,
        sourceIds: lastQuizInfo.sourceIds as { deckIds?: string[]; wrongQuizIds?: string[] } | undefined,
        questions: data.questions ?? [],
        currentIndex: 0,
        timeLimit: data.timeLimit ?? 300,
        expiresAt: data.expiresAt ?? new Date(Date.now() + 3600000).toISOString(),
        startedAt: Date.now(),
        answers: {} as Record<string, string>,
        questionTimes: {} as Record<string, number>,
      });

      setSubmittedResult(null);
      setScreen('quiz');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Lỗi khi làm lại';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [lastQuizInfo, submitting]);

  // Resume quiz from backend
  const handleResumeQuiz = useCallback(async () => {
    if (!resumeModalQuizId) {
      message.error('Phiên quiz không hợp lệ. Vui lòng bắt đầu quiz mới.');
      setResumeModalVisible(false);
      return;
    }
    setResumeModalVisible(false); // Close modal immediately to prevent double-click
    setResumeLoading(true);
    try {
      const res = await quizService.resumeQuiz(resumeModalQuizId);
      const data = res.data.data;
      const matchedDeck = decks.find(d => d.id === (data as unknown as { deckId?: string }).deckId);

      resumeFromServer(data, matchedDeck?.name);
      setScreen('quiz');
      setResumeModalQuizId(null); // Only clear on success
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Không thể khôi phục quiz';
      message.error(msg);
      reset(); // Clear stale localStorage
      setScreen('home');
      // Leave resumeModalQuizId set so user can click "Bắt đầu mới"
    } finally {
      setResumeLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeModalQuizId, decks]);

  const handleDismissResume = useCallback(() => {
    setResumeModalVisible(false);
    reset();
    setResumeModalQuizId(null);
  }, [reset]);

  // Exit quiz — save progress, go back to home
  const handleExitQuiz = useCallback(async () => {
    if (session && session.status === 'taking' && session.quizId) {
      setSubmitting(true);
      try {
        await quizService.pauseQuiz(session.quizId, {
          currentQuestion: session.currentIndex,
          answersJson: session.answers,
        });
        message.success('Tiến trình đã được lưu!');
      } catch {
        // proceed even if save fails
      }
      setSubmitting(false);
    }
    reset();
    setScreen('home');
  }, [session, reset]);

  // Back button in quiz header — same as exit
  const handleBack = useCallback(() => {
    handleExitQuiz();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleExitQuiz]);

  // ── Render ──
  const isQuizActive = screen === 'quiz' || screen === 'result';

  return (
    <div
      className="min-h-full"
      style={{
        background: isQuizActive ? '#0B0B0F' : undefined,
        backgroundImage: isQuizActive ? undefined : 'radial-gradient(circle at 0% 0%, rgba(124,77,255,0.1) 0%, transparent 50%), radial-gradient(circle at 100% 100%, rgba(0,229,255,0.08) 0%, transparent 50%)',
      }}
    >
      {/* Resume modal */}
      <Modal
        title="Tiếp tục quiz đang dở?"
        open={resumeModalVisible}
        onCancel={handleDismissResume}
        footer={[
          <Button key="new" onClick={handleDismissResume}>
            Bắt đầu mới
          </Button>,
          <Button key="resume" type="primary" onClick={handleResumeQuiz} loading={resumeLoading} className="!font-bold !rounded-xl">
            Tiếp tục
          </Button>,
        ]}
        className="kmate-modal"
      >
        <p className="text-slate-300">
          Bạn có một quiz đang dở ({inProgressCount} câu đã trả lời).
          Bạn có muốn tiếp tục không?
        </p>
      </Modal>

      {/* Quiz layout — full height when taking */}
      {isQuizActive ? (
        <div className="min-h-screen flex flex-col max-w-3xl mx-auto">
          {/* Header when in quiz */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                style={{ background: 'rgba(124,77,255,0.15)', color: '#a78bfa' }}
              >
                <QuestionOutlined />
              </div>
              <div>
                <h2 className="text-white font-bold text-sm">
                  {session?.deckName ? `Quiz: ${session.deckName}` : 'Quiz'}
                </h2>
                <p className="text-slate-500 text-[10px]">
                  {session?.mode === 'random' ? 'Quiz ngẫu nhiên' : session?.mode === 'ai' ? 'Quiz thông minh (AI)' : 'Quiz theo bộ thẻ'}
                </p>
              </div>
            </div>
            {submitting && (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Spin size="small" />
                <span>Đang lưu...</span>
              </div>
            )}
          </div>

          {/* Loading overlay during resume */}
          {resumeLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4" style={{ background: 'rgba(11,11,15,0.85)', backdropFilter: 'blur(4px)' }}>
              <Spin size="large" />
              <p className="text-slate-400 text-sm font-medium">Đang khôi phục quiz...</p>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6">
              {screen === 'result' && submittedResult ? (
                <ResultScreen result={submittedResult} onRetry={handleRetry} onBack={() => { reset(); setSubmittedResult(null); setScreen('home'); }} />
              ) : (
                <QuizTakingScreen onBack={handleExitQuiz} onSubmit={handleSubmitQuiz} />
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Normal layout */
        <div className="p-6 lg:p-10 min-h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <QuizHomeScreen
                decks={decks}
                stats={stats}
                loading={loading}
                onStartQuiz={handleStartQuiz}
                wrongAnswersData={wrongAnswersData ?? undefined}
                loadingWrongAnswers={loadingWrongAnswers}
                onDeleteDeck={(id: string, name: string) => {
                  ConfirmModal.confirm({
                    title: 'Xác nhận xóa',
                    message: 'Bạn có muốn xóa bộ quiz "' + name + '"?',
                    danger: true,
                    confirmText: 'Xóa',
                    onConfirm: async () => {
                      try {
                        await flashcardService.deleteDeck(id);
                        message.success('Đã xóa bộ quiz!');
                        const decksRes = await flashcardService.getDecks();
                        const data = decksRes.data.data;
                        if (data) {
                          setDecks(data.map((d: any, i: number) => ({
                            id: d.id,
                            name: d.name,
                            cardCount: d.cardCount ?? 0,
                            dueCount: d.dueCount ?? 0,
                            color: d.color ?? DECK_COLORS[i % DECK_COLORS.length],
                            icon: d.icon ?? 'book',
                          })));
                        }
                        const statsRes = await quizService.getStats();
                        if (statsRes.data.data) setStats(statsRes.data.data);
                      } catch {
                        message.error('Không thể xóa bộ quiz');
                      }
                    },
                  });
                }}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
