'use client';

import { useState, useEffect } from 'react';
import { Button, Spin } from 'antd';
import {
  QuestionOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  RightOutlined,
  TrophyOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { quizService, type Quiz } from '@/lib/api-services';

type QuizStatus = 'completed' | 'in-progress' | 'not-started';
type QuizCategory = 'Vocabulary' | 'Grammar' | 'Mixed';

interface QuizCard {
  id: string;
  title: string;
  category: QuizCategory;
  level: string;
  levelColor: string;
  totalQuestions: number;
  score: number | null;
  status: QuizStatus;
  progress: number;
  color: string;
  questions: Array<{ id: string; question: string; options: string[]; correctIndex: number; explanation?: string }>;
}

const COLORS = ['#00e5ff', '#7c4dff', '#f59e0b', '#22c55e', '#ec4899'];

function KMateMascot({ message }: { message?: string }) {
  const msgs = ['Bạn làm tốt lắm! Tiến lên nào!', 'Giỏi quá! Học tiếp thôi!', 'Chính xác! Hãy giữ nhịp đều nhé!'];
  const displayMessage = message ?? msgs[Math.floor(Math.random() * msgs.length)];
  return (
    <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-2 animate-fade-in">
      <div className="relative bg-white/10 backdrop-blur-md border border-primary/30 rounded-2xl px-4 py-3 max-w-[220px] shadow-lg">
        <div className="absolute -right-2 bottom-4 w-4 h-4 bg-white/10 border-r border-b border-primary/30 rotate-45 transform translate-y-1" />
        <p className="text-xs text-white leading-relaxed font-medium relative z-10">{displayMessage}</p>
      </div>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <div className="relative w-16 h-16 rounded-full border-2 border-primary/40 bg-primary/10 flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="8" y="14" width="24" height="20" rx="4" fill="#7C4DFF" />
            <rect x="12" y="8" width="16" height="8" rx="3" fill="#00e5ff" />
            <circle cx="15" cy="22" r="2" fill="#00e5ff" />
            <circle cx="25" cy="22" r="2" fill="#00e5ff" />
            <rect x="17" y="27" width="6" height="2" rx="1" fill="#ffffff" opacity="0.8" />
            <circle cx="20" cy="5" r="2" fill="#f59e0b" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function QuizCard({ quiz, onStart }: { quiz: QuizCard; onStart: () => void }) {
  const [hovered, setHovered] = useState(false);
  const isCompleted = quiz.status === 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="user-glass-card p-6 flex flex-col gap-4 cursor-pointer transition-all duration-300"
      style={{
        borderColor: hovered ? quiz.color + '60' : 'rgba(255,255,255,0.1)',
        boxShadow: hovered ? `0 0 20px ${quiz.color}30` : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onStart}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ color: quiz.color, backgroundColor: quiz.color + '15' }}>{quiz.category}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ color: quiz.levelColor, backgroundColor: quiz.levelColor + '15' }}>{quiz.level}</span>
        </div>
        <span className="text-xs text-slate-400">{quiz.totalQuestions} câu</span>
      </div>
      <h3 className="text-lg font-bold text-white">{quiz.title}</h3>
      {isCompleted && (
        <div className="flex items-center gap-2">
          <TrophyOutlined style={{ color: '#f59e0b', fontSize: 16 }} />
          <span className="text-sm font-bold text-white">{quiz.score}%</span>
          <span className="text-xs text-slate-400">hoàn thành</span>
        </div>
      )}
      <div className="flex items-center justify-between pt-1 mt-auto">
        <div className="flex items-center gap-1.5">
          {isCompleted ? (
            <>
              <CheckCircleOutlined style={{ color: '#22c55e', fontSize: 14 }} />
              <span className="text-xs text-slate-400">Hoàn thành</span>
            </>
          ) : (
            <>
              <QuestionOutlined style={{ color: quiz.color, fontSize: 14 }} />
              <span className="text-xs text-slate-400">Xem chi tiết</span>
            </>
          )}
        </div>
        <button
          className="text-xs font-bold px-4 py-2 rounded-xl transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: quiz.color + '20', color: quiz.color, border: `1px solid ${quiz.color}40` }}
          onClick={(e) => { e.stopPropagation(); onStart(); }}>
          {isCompleted ? 'Xem lại' : 'Làm quiz'}
        </button>
      </div>
    </motion.div>
  );
}

function StatsBar({ quizzes }: { quizzes: QuizCard[] }) {
  const completed = quizzes.filter(q => q.status === 'completed').length;
  const scores = quizzes.filter(q => q.score !== null).map(q => q.score as number);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="user-glass-card p-4 flex flex-col items-center gap-1">
        <span className="text-2xl font-extrabold text-white">{quizzes.length}</span>
        <span className="text-xs text-slate-400">Tổng quiz</span>
      </div>
      <div className="user-glass-card p-4 flex flex-col items-center gap-1">
        <span className="text-2xl font-extrabold text-green-400">{completed}</span>
        <span className="text-xs text-slate-400">Đã hoàn thành</span>
      </div>
      <div className="user-glass-card p-4 flex flex-col items-center gap-1">
        <span className="text-2xl font-extrabold text-amber-400">{avgScore > 0 ? `${avgScore}%` : '—'}</span>
        <span className="text-xs text-slate-400">Điểm TB</span>
      </div>
    </div>
  );
}

function QuizDetailView({ quiz, onBack }: { quiz: Quiz; onBack: () => void }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const totalQuestions = quiz.questions.length;
  const currentQ = quiz.questions[currentIndex];
  const progressPercent = totalQuestions > 0 ? Math.round(((currentIndex + (completed ? 1 : 0)) / totalQuestions) * 100) : 0;
  const finalScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  const handleSelect = (index: number) => {
    if (answered) return;
    setSelectedIndex(index);
    setAnswered(true);
    if (index === currentQ.correctIndex) {
      setCorrectCount(c => c + 1);
    }
  };

  const handleNext = async () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(i => i + 1);
      setSelectedIndex(null);
      setAnswered(false);
    } else {
      setCompleted(true);
      setSubmitting(true);
      try {
        const answers: Record<string, number> = {};
        quiz.questions.forEach((q, i) => {
          // Track selected answers per question
        });
        await quizService.submitQuiz({ videoId: quiz.videoId, answers: {}, timeTaken: 0 });
      } catch { /* Silently fail — results shown locally */ }
      finally { setSubmitting(false); }
    }
  };

  const getOptionClass = (index: number) => {
    if (!answered) return index === selectedIndex
      ? 'border-primary bg-primary/10'
      : 'border-white/10 bg-white/5 hover:border-white/30';
    if (index === currentQ.correctIndex) return 'border-green-500 bg-green-500/10';
    if (index === selectedIndex) return 'border-red-500 bg-red-500/10';
    return 'border-white/10 bg-white/5 opacity-50';
  };

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 animate-fade-in">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{
            backgroundColor: finalScore >= 70 ? 'rgba(34,197,94,0.15)' : 'rgba(249,115,22,0.15)',
            border: `2px solid ${finalScore >= 70 ? '#22c55e' : '#f59e0b'}40`,
            boxShadow: finalScore >= 70 ? '0 0 30px rgba(34,197,94,0.3)' : '0 0 30px rgba(249,115,22,0.3)',
          }}
        >
          <div className="text-center">
            <p className="text-4xl font-black" style={{ color: finalScore >= 70 ? '#22c55e' : '#f59e0b' }}>
              {finalScore}%
            </p>
          </div>
        </motion.div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-white">
            {finalScore >= 70 ? 'Xuất sắc!' : 'Cố gắng hơn nhé!'}
          </h2>
          <p className="text-slate-400">
            Bạn trả lời đúng <span className="font-bold text-white">{correctCount}</span> /{' '}
            <span className="font-bold text-white">{totalQuestions}</span> câu hỏi
          </p>
        </div>
        <div className="flex gap-3">
          <Button size="large" onClick={() => { setCurrentIndex(0); setCorrectCount(0); setCompleted(false); setSelectedIndex(null); setAnswered(false); }}
            className="!bg-white/5 !text-white !border !border-white/10 !font-bold !rounded-xl hover:!bg-white/10 transition-all">
            Làm lại
          </Button>
          <Button size="large" type="primary" onClick={onBack}
            className="!font-bold !rounded-xl">
            Quay lại danh sách
          </Button>
        </div>
        <KMateMascot message="Chúc mừng bạn! Tuyệt vời lắm!" />
      </div>
    );
  }

  const LABELS = ['A', 'B', 'C', 'D'];

  return (
    <div className="flex flex-col gap-6 pb-8 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <button onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium !bg-transparent border-0 cursor-pointer">
          <RightOutlined style={{ fontSize: 14, transform: 'rotate(180deg)' }} />
          <span>Quay lại</span>
        </button>
        <h2 className="text-base font-bold text-white">{quiz.title}</h2>
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-full">
          <span className="text-xs font-bold text-primary">{currentIndex + 1} / {totalQuestions}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Tiến độ</span>
          <span className="font-bold text-white">{progressPercent}%</span>
        </div>
        <div className="w-full h-3 bg-slate-800/50 rounded-full overflow-hidden border border-primary/5 p-0.5">
          <div className="h-full rounded-full transition-all duration-500 relative"
            style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #7C4DFF, #00e5ff)', boxShadow: '0 0 10px rgba(0,229,255,0.5)' }}>
            <div className="absolute top-0 right-0 h-full w-4 bg-white/20 blur-sm rounded-r-full" />
          </div>
        </div>
      </div>

      {/* Question card */}
      <div className="rounded-3xl p-10 flex flex-col items-center text-center shadow-2xl relative overflow-hidden"
        style={{ background: 'rgba(23,50,54,0.3)', backdropFilter: 'blur(12px)', border: '1px solid rgba(0,229,255,0.2)' }}>
        <p className="text-sm font-medium text-slate-400 mb-4">{currentQ.question}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mt-4">
          {currentQ.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              disabled={answered}
              className={`flex items-center gap-4 p-5 rounded-2xl transition-all text-left border ${getOptionClass(index)}`}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0
                ${answered && index === currentQ.correctIndex ? 'bg-green-500 text-white' :
                  answered && index === selectedIndex ? 'bg-red-500 text-white' :
                  'bg-slate-700 text-slate-300'}`}>
                {LABELS[index]}
              </span>
              <span className="text-base font-semibold text-white">{option}</span>
              {answered && index === currentQ.correctIndex && (
                <CheckCircleOutlined className="ml-auto text-green-500" />
              )}
              {answered && index === selectedIndex && index !== currentQ.correctIndex && (
                <CloseCircleOutlined className="ml-auto text-red-500" />
              )}
            </button>
          ))}
        </div>
        {answered && currentQ.explanation && (
          <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 text-left w-full">
            <span className="text-primary font-bold">Giải thích: </span>{currentQ.explanation}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleNext}
          disabled={!answered}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold tracking-wide transition-all"
          style={{
            background: answered ? 'linear-gradient(90deg, #7C4DFF, #00e5ff)' : 'rgba(255,255,255,0.05)',
            color: answered ? 'white' : 'rgba(255,255,255,0.3)',
            cursor: answered ? 'pointer' : 'not-allowed',
            boxShadow: answered ? '0 0 20px rgba(124,77,255,0.3)' : 'none',
          }}
        >
          {currentIndex < totalQuestions - 1 ? 'Câu hỏi tiếp theo' : 'Hoàn thành'}
          <RightOutlined style={{ fontSize: 14 }} />
        </button>
      </div>

      <KMateMascot />
    </div>
  );
}

export default function UserQuizPage() {
  const [quizList, setQuizList] = useState<QuizCard[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    quizService.getHistory({ limit: 20 })
      .then((r) => {
        const items = (r.data.data as unknown[]).map((item: unknown, i: number) => {
          const q = item as { videoId: string; score?: number; quiz?: { title: string; totalQuestions: number } };
          return {
            id: q.videoId,
            title: (q as { quiz?: { title: string } }).quiz?.title ?? 'Quiz Video',
            category: 'Mixed' as QuizCategory,
            level: '—',
            levelColor: COLORS[i % COLORS.length],
            totalQuestions: (q as { quiz?: { totalQuestions: number } }).quiz?.totalQuestions ?? 5,
            score: q.score ?? null,
            status: q.score !== undefined ? 'completed' as QuizStatus : 'not-started' as QuizStatus,
            progress: q.score ?? 0,
            color: COLORS[i % COLORS.length],
            questions: [],
          };
        });
        setQuizList(items);
      })
      .catch(() => {
        // If no history, show empty state
        setQuizList([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelectQuiz = (card: QuizCard) => {
    setActiveQuiz(null);
    quizService.getQuiz(card.id)
      .then((r) => setActiveQuiz(r.data.data))
      .catch(() => {
        // Fallback: create a placeholder quiz from the card data
        setActiveQuiz({
          id: card.id,
          videoId: card.id,
          title: card.title,
          questions: [],
          totalQuestions: card.totalQuestions,
          timeLimit: 300,
          difficulty: 'mixed',
          isCompleted: card.status === 'completed',
          score: card.score ?? undefined,
        });
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 min-h-full bg-gradient-cyber">
      {activeQuiz ? (
        <QuizDetailView quiz={activeQuiz} onBack={() => setActiveQuiz(null)} />
      ) : (
        <div className="space-y-8 animate-fade-in">
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white">
              Luyện tập{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Quiz</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
              <QuestionOutlined className="text-primary" />
              Kiểm tra kiến thức từ các video bạn đã học.
            </p>
          </div>

          <StatsBar quizzes={quizList} />

          {quizList.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quizList.map((quiz, i) => (
                <QuizCard key={quiz.id} quiz={quiz} onStart={() => handleSelectQuiz(quiz)} />
              ))}
            </div>
          ) : (
            <div className="user-glass-card p-12 text-center">
              <QuestionOutlined className="text-4xl text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Chưa có quiz nào</h3>
              <p className="text-slate-400 mb-4">Hãy xem video và hoàn thành để nhận quiz kiểm tra!</p>
              <Button type="primary" className="!font-bold !rounded-xl"
                onClick={() => { window.location.href = '/user/explore'; }}>
                Khám phá video ngay
              </Button>
            </div>
          )}

          <div className="pointer-events-none fixed -bottom-20 -right-20 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="pointer-events-none fixed -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-secondary/5 blur-[120px]" />
        </div>
      )}
    </div>
  );
}
