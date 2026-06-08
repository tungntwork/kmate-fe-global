'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button, Spin, message, Modal } from 'antd';
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
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { quizService, flashcardService, type QuizDeck, type QuizQuestion } from '@/lib/api-services';
import { useQuizStore } from '@/store/quiz.store';

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

function QuizHomeScreen({
  decks,
  stats,
  loading,
  onStartQuiz,
}: {
  decks: DeckInfo[];
  stats: UserStats | null;
  loading: boolean;
  onStartQuiz: (mode: 'deck' | 'random' | 'ai', deckId?: string) => void;
}) {
  const [deckLoading, setDeckLoading] = useState<'random' | 'ai' | null>(null);

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

      {/* Flashcard decks */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spin size="large" />
        </div>
      ) : decks.length > 0 ? (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Bộ flashcard của bạn</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck, i) => (
              <motion.div
                key={deck.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
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
                    <p className="text-slate-500 text-xs">{deck.cardCount} từ</p>
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
            ))}
          </div>
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
}: {
  onBack: () => void;
}) {
  const { session, answerQuestion, nextQuestion, prevQuestion, goToQuestion } = useQuizStore();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());

  // Timer
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
  }, [session?.currentIndex]);

  if (!session || session.status !== 'taking') return null;

  const { questions, currentIndex, answers } = session;
  const total = questions.length;
  const currentQ = questions[currentIndex];
  const selectedAnswer = answers[currentQ.id] ?? null;
  const progress = total > 0 ? Math.round(((currentIndex + 1) / total) * 100) : 0;

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  const handleSelectOption = (optId: string) => {
    answerQuestion(currentQ.id, optId);
  };

  const handleNext = () => {
    if (currentIndex < total - 1) nextQuestion();
  };

  const handlePrev = () => {
    if (currentIndex > 0) prevQuestion();
  };

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === total;

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

        {/* Question navigator dots */}
        <div className="hidden md:flex items-center gap-1.5">
          {questions.map((q, i) => {
            const isAnswered = !!answers[q.id];
            const isCurrent = i === currentIndex;
            return (
              <button
                key={q.id}
                onClick={() => goToQuestion(i)}
                className="w-7 h-7 rounded-full text-[10px] font-bold transition-all cursor-pointer"
                style={{
                  background: isCurrent ? '#7C4DFF' : isAnswered ? '#22c55e30' : 'rgba(255,255,255,0.05)',
                  color: isCurrent ? 'white' : isAnswered ? '#22c55e' : '#6b7280',
                  border: isCurrent ? '2px solid #7C4DFF' : '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

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

        {/* Progress */}
        <div className="text-xs text-slate-400 font-medium">
          {currentIndex + 1} / {total}
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
          <div className="text-center text-slate-300 text-base mb-8">
            {currentQ.question}
          </div>

          {/* Options */}
          <div className="space-y-3">
            {currentQ.options.map((opt, i) => {
              const isSelected = selectedAnswer === opt.id;
              const label = OPTION_LABELS[i] ?? String(i);

              return (
                <motion.button
                  key={opt.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleSelectOption(opt.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl text-left transition-all border"
                  style={{
                    background: isSelected ? 'rgba(124,77,255,0.15)' : 'rgba(255,255,255,0.03)',
                    borderColor: isSelected ? '#7C4DFF' : 'rgba(255,255,255,0.08)',
                  }}
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
                  {isSelected && <CheckCircleOutlined style={{ color: '#7C4DFF', fontSize: 18 }} />}
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
            onClick={onBack}
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
  onRetry,
  onBack,
}: {
  onRetry: () => void;
  onBack: () => void;
}) {
  const { session } = useQuizStore();
  if (!session?.result) return null;

  const { result } = session;
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
              {feedback.strengths.map((s, i) => (
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
              {feedback.weaknesses.map((w, i) => (
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
              {feedback.recommendations.map((r, i) => (
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
            {result.review.map((item, i) => (
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
  const { session, startQuiz, resumeFromServer, setResult, setError, reset } = useQuizStore();

  const [screen, setScreen] = useState<Screen>('home');
  const [decks, setDecks] = useState<DeckInfo[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resumeModalVisible, setResumeModalVisible] = useState(false);
  const [resumeModalQuizId, setResumeModalQuizId] = useState<string | null>(null);
  const [inProgressCount, setInProgressCount] = useState(0);

  const saveProgressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load decks, stats, and check for persisted session on mount
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
  const handleStartQuiz = useCallback(async (mode: 'deck' | 'random' | 'ai', deckId?: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await quizService.createQuiz({
        deckId: mode === 'deck' ? deckId : undefined,
        mode,
        count: 20,
      });

      const data = res.data.data as QuizDeck & { timeLimit?: number; expiresAt?: string; questions?: QuizQuestion[] };
      const deckInfo = mode === 'deck' && deckId ? decks.find(d => d.id === deckId) : undefined;

      startQuiz({
        quizId: data.id,
        deckId: deckInfo?.id,
        deckName: deckInfo?.name,
        mode,
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
    if (!session || session.status !== 'taking') return;
    try {
      await quizService.saveProgress(session.quizId, {
        currentQuestion: session.currentIndex,
        answersJson: session.answers,
      });
    } catch {
      // Non-fatal
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

      setResult(res.data.data);
      setScreen('result');
      reset();

      // Reload stats
      try {
        const statsRes = await quizService.getStats();
        setStats(statsRes.data.data ?? null);
      } catch { /* non-fatal */ }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Lỗi khi nộp bài';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [session, setResult, reset]);

  // Retry
  const handleRetry = useCallback(async () => {
    if (!session) return;
    setSubmitting(true);
    try {
      const res = await quizService.retryQuiz(session.quizId, { count: session.questions.length });
      const data = res.data.data as QuizDeck & { questions?: QuizQuestion[]; timeLimit?: number; expiresAt?: string };

      startQuiz({
        quizId: data.id,
        deckId: session.deckId,
        deckName: session.deckName,
        mode: session.mode,
        questions: data.questions ?? session.questions,
        currentIndex: 0,
        timeLimit: data.timeLimit ?? session.timeLimit,
        expiresAt: data.expiresAt ?? session.expiresAt,
        startedAt: Date.now(),
        answers: {},
        questionTimes: {},
      });

      setScreen('quiz');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Lỗi khi làm lại';
      message.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [session, startQuiz]);

  // Resume quiz from backend
  const handleResumeQuiz = useCallback(async () => {
    if (!resumeModalQuizId) return;
    setResumeModalVisible(false);
    setLoading(true);
    try {
      const res = await quizService.resumeQuiz(resumeModalQuizId);
      const data = res.data.data;
      const matchedDeck = decks.find(d => d.id === (data as unknown as { deckId?: string }).deckId);

      resumeFromServer(data, matchedDeck?.name);
      setScreen('quiz');
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Không thể khôi phục quiz';
      message.error(msg);
      reset();
    } finally {
      setLoading(false);
      setResumeModalQuizId(null);
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
    if (session && session.status === 'taking') {
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
          <Button key="resume" type="primary" onClick={handleResumeQuiz} className="!font-bold !rounded-xl">
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-6">
              {screen === 'result' ? (
                <ResultScreen onRetry={handleRetry} onBack={() => { reset(); setScreen('home'); }} />
              ) : (
                <QuizTakingScreen onBack={handleExitQuiz} />
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
              />
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
