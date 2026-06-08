'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button, Spin, Modal, message } from 'antd';
import {
  ArrowLeftOutlined,
  FireOutlined,
  SoundOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { flashcardService, type Flashcard, type FlashcardDeck, type FlashcardStats } from '@/lib/api-services';
import { useFlashcardStore } from '@/store/flashcard.store';

type Rating = 'again' | 'hard' | 'good' | 'easy';
type RatingQuality = 0 | 1 | 2 | 3 | 4 | 5;

const RATING_CONFIG: Record<Rating, { quality: RatingQuality; label: string; sub: string; color: string; bgColor: string; borderColor: string }> = {
  again: { quality: 0, label: 'Lại', sub: '1m', color: '#ef4444', bgColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)' },
  hard:  { quality: 2, label: 'Khó', sub: '6m', color: '#f97316', bgColor: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.3)' },
  good:  { quality: 4, label: 'Tốt', sub: '1d', color: '#22c55e', bgColor: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.3)' },
  easy:  { quality: 5, label: 'Dễ',  sub: '4d', color: '#00e5ff', bgColor: 'rgba(0,229,255,0.1)', borderColor: 'rgba(0,229,255,0.3)' },
};

const DECK_COLORS = ['#00e5ff', '#7c4dff', '#f59e0b', '#22c55e', '#ef4444', '#ec4899'];

const KMATE_MASCOT_MESSAGES = [
  'Bạn làm tốt lắm! Tiến lên nào!',
  'Giỏi quá! Học tiếp thôi!',
  'Tuyệt vời! Bạn đang tiến bộ rất nhanh!',
  'Chính xác! Hãy giữ nhịp đều nhé!',
];

function KMateMascot({ message }: { message?: string }) {
  const displayMessage = message ?? KMATE_MASCOT_MESSAGES[Math.floor(Math.random() * KMATE_MASCOT_MESSAGES.length)];
  return (
    <div className="fixed bottom-8 right-8 z-40 flex flex-col items-end gap-2 animate-fade-in">
      <div className="relative bg-white/10 backdrop-blur-md border border-primary/30 rounded-2xl px-4 py-3 max-w-[220px] shadow-lg">
        <div className="absolute -right-2 bottom-4 w-4 h-4 bg-white/10 border-r border-b border-primary/30 rotate-45 transform translate-y-1" />
        <p className="text-xs text-white leading-relaxed font-medium relative z-10">{displayMessage}</p>
      </div>
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <div className="relative w-16 h-16 rounded-full border-2 border-primary/40 bg-primary/10 flex items-center justify-center overflow-hidden">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="8" y="14" width="24" height="20" rx="4" fill="#7C4DFF" />
            <rect x="12" y="8" width="16" height="8" rx="3" fill="#00e5ff" />
            <circle cx="15" cy="22" r="2" fill="#00e5ff" />
            <circle cx="25" cy="22" r="2" fill="#00e5ff" />
            <rect x="17" y="27" width="6" height="2" rx="1" fill="#ffffff" opacity="0.8" />
            <line x1="4" y1="20" x2="8" y2="20" stroke="#7C4DFF" strokeWidth="2" strokeLinecap="round" />
            <line x1="32" y1="20" x2="36" y2="20" stroke="#7C4DFF" strokeWidth="2" strokeLinecap="round" />
            <circle cx="20" cy="5" r="2" fill="#f59e0b" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function RatingButton({ rating, onClick }: { rating: Rating; onClick: () => void }) {
  const config = RATING_CONFIG[rating];
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center py-4 rounded-2xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
      style={{ backgroundColor: config.bgColor, border: `1px solid ${config.borderColor}`, color: config.color }}
    >
      <span className="text-sm font-bold">{config.label}</span>
      <span className="text-[10px] opacity-70 mt-0.5">{config.sub}</span>
    </button>
  );
}

function FlashcardDisplay({ card, isRevealed, onReveal }: { card: Flashcard; isRevealed: boolean; onReveal: () => void }) {
  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div
        className="relative w-full max-w-lg user-glass-card p-10 flex flex-col items-center gap-3 select-none"
        style={{ borderColor: 'rgba(124, 77, 255, 0.3)', minHeight: 240 }}
      >
        <div className="absolute inset-0 opacity-20 rounded-2xl pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at center, rgba(124,77,255,0.3) 0%, transparent 70%)' }}
        />
        <span className="text-6xl font-bold text-white relative z-10 text-center leading-none"
          style={{ textShadow: '0 0 20px rgba(124,77,255,0.4)' }}>
          {card.front}
        </span>
        {card.pronunciation && (
          <span className="text-lg text-slate-300 relative z-10 font-mono tracking-wide">
            /{card.pronunciation}/
          </span>
        )}
        <div className={`w-full mt-2 overflow-hidden transition-all duration-500 ease-in-out ${isRevealed ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-col items-center gap-1"
            style={{ borderColor: 'rgba(124, 77, 255, 0.2)' }}>
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Nghĩa</span>
            <span className="text-xl font-semibold text-white text-center">{card.back}</span>
            {card.example && (
              <span className="text-sm text-slate-400 text-center mt-1 italic">{card.example}</span>
            )}
          </div>
        </div>
      </div>
      {!isRevealed && (
        <Button type="primary" size="large" onClick={onReveal}
          className="!bg-primary/20 !text-primary !border !border-primary/30 !font-bold !rounded-2xl !px-8 hover:!bg-primary/30 hover:!scale-105 active:!scale-95 transition-all">
          XEM NGHĨA
        </Button>
      )}
      <Button type="text" icon={<SoundOutlined className="text-slate-400 text-lg" />}
        className="!text-slate-400 hover:!text-white transition-colors !p-2 !rounded-full hover:!bg-white/5"
        title="Phát âm" />
    </div>
  );
}

function DeckCard({ deck, onStart }: { deck: FlashcardDeck; onStart: () => void }) {
  const [hovered, setHovered] = useState(false);
  const color = deck.color || DECK_COLORS[0];

  return (
    <div
      className="user-glass-card p-6 flex flex-col gap-4 cursor-pointer transition-all duration-300"
      style={{
        borderColor: hovered ? color + '60' : 'rgba(255,255,255,0.1)',
        boxShadow: hovered ? `0 0 20px ${color}30` : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onStart}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}80` }} />
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
            style={{ color, backgroundColor: color + '15' }}>
            {deck.name}
          </span>
        </div>
        <span className="text-xs text-slate-400">{deck.cardCount} thẻ</span>
      </div>
      {deck.description && (
        <p className="text-sm text-slate-400 leading-relaxed">{deck.description}</p>
      )}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Cần ôn</span>
          <span className="text-xs font-bold" style={{ color }}>{deck.dueCount} thẻ</span>
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
          <span className="text-xs text-slate-400">
            <span className="font-bold text-orange-400">{deck.dueCount}</span> cần ôn
          </span>
        </div>
        <button
          className="text-xs font-bold px-4 py-2 rounded-xl transition-all hover:scale-105 active:scale-95"
          style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}
          onClick={(e) => { e.stopPropagation(); onStart(); }}>
          Bắt đầu ôn
        </button>
      </div>
    </div>
  );
}

interface ReviewModeProps {
  cards: Flashcard[];
  deckId: string | null;
  deckName: string;
  streak: number;
  initialIndex?: number;
  initialAnsweredIds?: string[];
  onBack: () => void;
}

function ReviewMode({ cards, deckId, deckName, streak, initialIndex = 0, initialAnsweredIds = [], onBack }: ReviewModeProps) {
  const { session, setSession, updateProgress } = useFlashcardStore();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isRevealed, setIsRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [mascotMsg, setMascotMsg] = useState<string>();

  const totalCards = cards.length;
  const currentCard = cards[currentIndex];
  const progressPercent = totalCards > 0 ? Math.round(((currentIndex + (completed ? 1 : 0)) / totalCards) * 100) : 0;

  const answeredIdsRef = useRef<string[]>(initialAnsweredIds);
  const sessionIdRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync store session ID
  useEffect(() => {
    if (session?.sessionId) {
      sessionIdRef.current = session.sessionId;
    }
  }, [session]);

  const saveProgress = useCallback(async (idx: number, answered: string[]) => {
    if (!sessionIdRef.current) return;
    updateProgress(idx, answered);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await flashcardService.updateSessionProgress({
          sessionId: sessionIdRef.current!,
          currentIndex: idx,
          answeredIds: answered,
        });
      } catch {
        // Non-fatal — local state already updated via store
      }
    }, 500);
  }, [updateProgress]);

  const handleRating = async (rating: Rating) => {
    if (!currentCard) return;
    const quality = RATING_CONFIG[rating].quality;

    // Call review API
    try {
      await flashcardService.review({ flashcardId: currentCard.id, quality });
    } catch {
      // Continue even if API call fails
    }

    setMascotMsg(rating === 'again' ? 'Đừng nản! Thử lại nhé!' : 'Tuyệt vời! Học tiếp nào!');
    setIsRevealed(false);

    const newAnsweredIds = [...answeredIdsRef.current, currentCard.id];
    answeredIdsRef.current = newAnsweredIds;

    if (currentIndex < totalCards - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      saveProgress(nextIdx, newAnsweredIds);
    } else {
      // Completed all cards
      if (sessionIdRef.current) {
        try {
          await flashcardService.completeSession({ sessionId: sessionIdRef.current });
          setSession(null);
        } catch { /* non-fatal */ }
      }
      setCompleted(true);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 animate-fade-in">
        <div className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(34,197,94,0.2)', border: '2px solid rgba(34,197,94,0.4)' }}>
          <CheckCircleOutlined style={{ fontSize: 48, color: '#22c55e' }} />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-white">Hoàn thành!</h2>
          <p className="text-slate-400">Bạn đã ôn xong {totalCards} thẻ.</p>
        </div>
        <div className="flex gap-3">
          <Button size="large" onClick={() => {
            setCurrentIndex(0);
            setCompleted(false);
            setIsRevealed(false);
            answeredIdsRef.current = [];
          }}
            icon={<ReloadOutlined />}
            className="!bg-white/5 !text-white !border !border-white/10 !font-bold !rounded-xl hover:!bg-white/10 transition-all">
            Ôn lại
          </Button>
          <Button size="large" type="primary" onClick={onBack}
            className="!font-bold !rounded-xl">
            Chọn bộ thẻ khác
          </Button>
        </div>
        <KMateMascot message="Chúc mừng bạn! Tuyệt vời lắm!" />
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <p className="text-slate-400 text-lg">Không có thẻ nào cần ôn. Hãy tạo thẻ mới!</p>
        <Button type="primary" onClick={onBack} className="!font-bold !rounded-xl">
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 pb-8 animate-fade-in">
      <div className="w-full flex items-center justify-between gap-4">
        <button onClick={onBack}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium !bg-transparent border-0 cursor-pointer">
          <ArrowLeftOutlined />
          <span>Quay lại</span>
        </button>
        <h2 className="text-base font-bold text-white">{deckName || 'Ôn tập'}</h2>
        <div className="flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-3 py-1.5 rounded-full">
          <FireOutlined className="text-orange-400 text-sm" />
          <span className="text-xs font-bold text-orange-400">{streak} Ngày liên tiếp!</span>
        </div>
      </div>

      <div className="w-full max-w-lg space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Tiến độ hôm nay</span>
          <span className="font-bold text-white">{currentIndex + 1} / {totalCards} từ</span>
        </div>
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #7C4DFF, #00e5ff)', boxShadow: '0 0 10px rgba(124,77,255,0.5)' }} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">{cards.length} thẻ trong phiên</span>
          <span className="text-primary font-bold">{progressPercent}%</span>
        </div>
      </div>

      <FlashcardDisplay card={currentCard} isRevealed={isRevealed} onReveal={() => setIsRevealed(true)} />

      <div className={`w-full max-w-lg flex gap-3 overflow-hidden transition-all duration-500 ease-in-out ${isRevealed ? 'max-h-24 opacity-100' : 'max-h-0 opacity-0'}`}>
        {(['again', 'hard', 'good', 'easy'] as Rating[]).map((rating) => (
          <RatingButton key={rating} rating={rating} onClick={() => handleRating(rating)} />
        ))}
      </div>

      <KMateMascot message={mascotMsg} />
    </div>
  );
}

// ── New: Video deck card with YouTube thumbnail ──────────────────────────────
function VideoDeckCard({ deck, onStart }: {
  deck: FlashcardDeck & { youtubeId?: string; videoTitle?: string };
  onStart: () => void;
}) {
  const color = deck.color || '#8B5CFA';
  return (
    <div
      className="user-glass-card p-4 flex gap-4 cursor-pointer hover:border-primary-500/40 transition-all"
      onClick={onStart}
    >
      {/* YouTube thumbnail */}
      <div className="w-28 h-20 rounded-lg overflow-hidden bg-dark-400 flex-shrink-0">
        {deck.youtubeId ? (
          <img
            src={`https://img.youtube.com/vi/${deck.youtubeId}/mqdefault.jpg`}
            alt={deck.videoTitle || deck.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ color, backgroundColor: color + '15' }}>
              {deck.name}
            </span>
          </div>
          {deck.videoTitle && (
            <p className="text-sm text-white truncate">{deck.videoTitle}</p>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{deck.cardCount} thẻ</span>
          {deck.youtubeId ? (
            <Link
              href={`/learn/${deck.youtubeId}`}
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-bold px-3 py-1 rounded-xl transition-colors"
              style={{ backgroundColor: color + '20', color }}>
              Học lại
            </Link>
          ) : (
            <button className="text-xs font-bold px-3 py-1 rounded-xl"
              style={{ backgroundColor: color + '20', color }}>
              Bắt đầu ôn
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DeckListView({ defaultDecks, videoDecks, stats, loading, onSelectDeck, hasInProgressSession, onResume }: {
  defaultDecks: FlashcardDeck[];
  videoDecks: (FlashcardDeck & { youtubeId?: string; videoTitle?: string })[];
  stats: FlashcardStats | null;
  loading: boolean;
  onSelectDeck: (deck: FlashcardDeck) => void;
  hasInProgressSession: boolean;
  onResume: () => void;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const totalCards = (stats?.totalCards ?? 0);
  const dueToday = (stats?.dueToday ?? 0);
  const streak = (stats?.streak ?? 0);

  return (
    <div className="space-y-10 animate-fade-in">
      {/* Page header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl lg:text-4xl font-extrabold text-white">
          Flashcard{' '}
          <span className="text-primary">Ôn tập</span>
        </h1>
        <p className="text-slate-400 text-sm">
          Chọn bộ thẻ phù hợp với trình độ của bạn để bắt đầu ôn tập từ vựng.
        </p>
      </div>

      {/* In-progress session banner */}
      {hasInProgressSession && (
        <div className="user-glass-card p-4 flex items-center justify-between gap-4 border border-primary/30">
          <div>
            <p className="text-white font-bold text-sm">Bạn có phiên ôn tập đang dở</p>
            <p className="text-slate-400 text-xs">Tiếp tục từ vị trí trước đó?</p>
          </div>
          <Button
            type="primary"
            size="small"
            className="!font-bold !rounded-xl !bg-primary/20 !text-primary !border-primary/30"
            onClick={onResume}
          >
            Tiếp tục ôn
          </Button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="user-glass-card p-4 flex flex-col items-center gap-1">
          <span className="text-2xl font-extrabold text-white">{totalCards}</span>
          <span className="text-xs text-slate-400">Tổng thẻ</span>
        </div>
        <div className="user-glass-card p-4 flex flex-col items-center gap-1">
          <span className="text-2xl font-extrabold text-orange-400">{dueToday}</span>
          <span className="text-xs text-slate-400">Cần ôn hôm nay</span>
        </div>
        <div className="user-glass-card p-4 flex flex-col items-center gap-1">
          <span className="text-2xl font-extrabold text-cyan-400">{streak}</span>
          <span className="text-xs text-slate-400">Ngày liên tiếp</span>
        </div>
      </div>

      {/* Default decks */}
      {defaultDecks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Bộ từ cơ bản</h2>
            <div className="h-px flex-1 bg-dark-200" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {defaultDecks.map((deck, i) => {
              const color = deck.color || DECK_COLORS[i % DECK_COLORS.length];
              return (
                <DeckCard key={deck.id} deck={{ ...deck, color }} onStart={() => onSelectDeck(deck)} />
              );
            })}
          </div>
        </div>
      )}

      {/* Video decks */}
      {videoDecks.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Từ video của tôi</h2>
            <span className="text-xs text-slate-500">{videoDecks.length} bộ</span>
            <div className="h-px flex-1 bg-dark-200" />
          </div>
          <div className="space-y-3">
            {videoDecks.map((deck) => (
              <VideoDeckCard key={deck.id} deck={deck} onStart={() => onSelectDeck(deck as FlashcardDeck)} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {defaultDecks.length === 0 && videoDecks.length === 0 && (
        <div className="user-glass-card p-8 text-center">
          <p className="text-slate-400 mb-4">Bạn chưa có bộ thẻ nào. Hãy tạo bộ thẻ đầu tiên!</p>
          <Button type="primary" className="!font-bold !rounded-xl"
            onClick={() => flashcardService.createDeck({ name: 'Bộ thẻ mới', description: '' }).then(() => window.location.reload())}>
            Tạo bộ thẻ mới
          </Button>
        </div>
      )}
    </div>
  );
}

export default function UserFlashcardPage() {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCards, setActiveCards] = useState<Flashcard[] | null>(null);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [activeSession, setActiveSession] = useState<{
    sessionId: string;
    cardIds: string[];
    currentIndex: number;
    answeredIds: string[];
  } | null>(null);
  const [streak, setStreak] = useState(0);
  const [resumeModalVisible, setResumeModalVisible] = useState(false);

  const { session, setSession, clearSession } = useFlashcardStore();

  // Load initial data + check for existing session
  useEffect(() => {
    Promise.all([
      flashcardService.getDecks().catch(() => null),
      flashcardService.getDue().catch(() => null),
      flashcardService.getStats().catch(() => null),
      flashcardService.getSession().catch(() => null),
    ]).then(([decksRes, dueRes, statsRes, sessionRes]) => {
      if (decksRes) setDecks(decksRes.data.data);
      if (dueRes) setDueCards(dueRes.data.data);
      if (statsRes) {
        setStats(statsRes.data.data);
        setStreak(statsRes.data.data.streak);
      }
      if (sessionRes?.data?.data) {
        const s = sessionRes.data.data;
        setActiveSession({
          sessionId: s.id,
          cardIds: s.cardIds as string[],
          currentIndex: s.currentIndex,
          answeredIds: s.answeredIds as string[],
        });
        setResumeModalVisible(true);
      }
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Split decks into default (pre-seeded) and video-linked
  const defaultDecks = decks.filter((d) => (d as any).isDefault === true);
  const videoDecks = decks
    .filter((d) => (d as any).isDefault !== true)
    .map((d) => d as FlashcardDeck & { youtubeId?: string; videoTitle?: string });

  const handleSelectDeck = async (deck: FlashcardDeck) => {
    setActiveDeck(deck);
    let cardsToStudy: Flashcard[] = dueCards;

    if (deck.dueCount > 0) {
      try {
        const res = await flashcardService.getFlashcards({ deckId: deck.id, limit: deck.dueCount });
        cardsToStudy = res.data.data;
      } catch {
        cardsToStudy = dueCards;
      }
    }

    // Start a new session via API
    const cardIds = cardsToStudy.map((c) => c.id);
    try {
      const sessionRes = await flashcardService.startSession({ deckId: deck.id, cardIds });
      const sessionData = sessionRes.data.data;
      setSession({
        sessionId: sessionData.id,
        deckId: deck.id,
        cardIds,
        currentIndex: 0,
        answeredIds: [],
      });
      setActiveSession({
        sessionId: sessionData.id,
        cardIds,
        currentIndex: 0,
        answeredIds: [],
      });
      setActiveCards(cardsToStudy);
    } catch {
      // Fallback: start without session persistence
      setActiveCards(cardsToStudy);
    }
  };

  const handleResumeSession = async () => {
    if (!activeSession) return;
    setResumeModalVisible(false);

    // Find the deck matching this session
    const matchedDeck = decks.find((d) => d.id === (activeSession as { deckId?: string }).deckId) ?? null;
    setActiveDeck(matchedDeck);

    // Load cards for this session
    const cardIds = activeSession.cardIds;
    try {
      const allCardsRes = await flashcardService.getFlashcards({ limit: 500 });
      const allCards = allCardsRes.data.data;
      const sessionCards = allCards.filter((c) => cardIds.includes(c.id));
      setActiveSession({
        ...activeSession,
        cardIds: sessionCards.map((c) => c.id),
      });
      setActiveCards(sessionCards);
      setSession({
        sessionId: activeSession.sessionId,
        deckId: (activeSession as { deckId?: string }).deckId ?? null,
        cardIds: activeSession.cardIds,
        currentIndex: activeSession.currentIndex,
        answeredIds: activeSession.answeredIds,
      });
    } catch {
      message.error('Không thể tải lại phiên ôn tập');
    }
  };

  const handleDismissResume = () => {
    setResumeModalVisible(false);
    // Mark session as abandoned
    if (activeSession) {
      flashcardService.completeSession({ sessionId: activeSession.sessionId }).catch(() => {});
      setActiveSession(null);
    }
  };

  const handleBackToDeckList = () => {
    setActiveCards(null);
    setActiveDeck(null);
    setActiveSession(null);
    clearSession();
  };

  const activeDeckName = activeDeck?.name ?? '';
  const resumeData = activeSession && activeCards
    ? {
        initialIndex: activeSession.currentIndex,
        initialAnsweredIds: activeSession.answeredIds,
      }
    : {};

  return (
    <div className="p-6 lg:p-10 min-h-full bg-gradient-cyber">
      {/* Resume session modal */}
      <Modal
        title="Tiếp tục phiên ôn tập?"
        open={resumeModalVisible}
        onCancel={handleDismissResume}
        footer={[
          <Button key="new" onClick={handleDismissResume}>
            Bắt đầu mới
          </Button>,
          <Button key="resume" type="primary" onClick={handleResumeSession} className="!font-bold !rounded-xl">
            Tiếp tục ôn
          </Button>,
        ]}
        className="kmate-modal"
      >
        <p className="text-slate-300">
          Bạn có một phiên ôn tập đang dở ({activeSession?.answeredIds.length ?? 0} thẻ đã ôn).
          Bạn có muốn tiếp tục không?
        </p>
      </Modal>

      {activeCards !== null && activeCards.length > 0 ? (
        <ReviewMode
          cards={activeCards}
          deckId={activeDeck?.id ?? null}
          deckName={activeDeckName}
          streak={streak}
          initialIndex={resumeData.initialIndex ?? 0}
          initialAnsweredIds={resumeData.initialAnsweredIds ?? []}
          onBack={handleBackToDeckList}
        />
      ) : (
        <DeckListView
          defaultDecks={defaultDecks}
          videoDecks={videoDecks}
          stats={stats}
          loading={loading}
          onSelectDeck={handleSelectDeck}
          hasInProgressSession={!!activeSession}
          onResume={handleResumeSession}
        />
      )}
    </div>
  );
}
