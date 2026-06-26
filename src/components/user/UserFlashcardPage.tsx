'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Button, Spin, Modal, Select } from "antd";
import { App } from 'antd';
import {
  ArrowLeftOutlined,
  FireOutlined,
  SoundOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  LeftOutlined,
  RightOutlined,
  DeleteOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { flashcardService, type Flashcard, type FlashcardDeck, type FlashcardStats } from '@/lib/api-services';
import { useFlashcardStore } from '@/store/flashcard.store';
import { CreateFromVideoView } from './CreateFromVideoView';
import { DueCardsView } from './DueCardsView';

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

function KMateMascot({ messageApi }: { messageApi?: string }) {
  const displayMessage = messageApi ?? KMATE_MASCOT_MESSAGES[Math.floor(Math.random() * KMATE_MASCOT_MESSAGES.length)];
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

function FlashcardDisplay({ card, isRevealed, onReveal, deckColor }: { card: Flashcard; isRevealed: boolean; onReveal: () => void; deckColor?: string }) {
  const speak = (text: string) => {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  };

  const color = deckColor || '#7C4DFF';

  return (
    <div className="w-full flex flex-col items-center gap-4">
      <div
        className="relative w-full max-w-lg select-none cursor-pointer"
        style={{ perspective: 1200 }}
        onClick={onReveal}
      >
        <motion.div
          className="relative w-full user-glass-card p-10 flex flex-col items-center gap-3"
          style={{
            borderColor: color + '50',
            minHeight: 240,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
          animate={{ rotateY: isRevealed ? 180 : 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <div
            className="absolute inset-0 opacity-20 rounded-2xl pointer-events-none"
            style={{ background: `radial-gradient(ellipse at center, ${color}40 0%, transparent 70%)` }}
          />

          {/* Front face */}
          <span
            className="text-6xl font-bold text-white relative z-10 text-center leading-none"
            style={{ textShadow: `0 0 20px ${color}60` }}
          >
            {card.front}
          </span>
          {card.pronunciation && (
            <span className="text-lg text-slate-300 relative z-10 font-mono tracking-wide">
              /{card.pronunciation}/
            </span>
          )}
          <span className="text-xs text-slate-500 mt-1 relative z-10">Bấm để lật thẻ</span>
        </motion.div>

        {/* Back face */}
        <motion.div
          className="absolute inset-0 w-full user-glass-card p-10 flex flex-col items-center gap-3"
          style={{
            borderColor: color + '50',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            rotateY: 180,
          }}
          animate={{ rotateY: isRevealed ? 0 : -180 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <div
            className="absolute inset-0 opacity-20 rounded-2xl pointer-events-none"
            style={{ background: `radial-gradient(ellipse at center, ${color}40 0%, transparent 70%)` }}
          />
          <span
            className="text-xs font-bold uppercase tracking-wider relative z-10"
            style={{ color }}
          >
            Nghĩa
          </span>
          <span className="text-xl font-semibold text-white text-center relative z-10">
            {card.back}
          </span>
          {card.example && (
            <span className="text-sm text-slate-400 text-center mt-1 italic relative z-10">
              {card.example}
            </span>
          )}
        </motion.div>
      </div>

      {/* Nút phat am */}
      <Button
        type="text"
        icon={<SoundOutlined className="text-slate-400 text-2xl" />}
        onClick={(e) => { e.stopPropagation(); speak(card.front); }}
        className="!text-slate-400 hover:!text-white transition-colors !p-3 !rounded-full hover:!bg-white/5"
        title="Phat am"
      />
    </div>
  );
}

function DeckCard({ deck, onStart }: { deck: FlashcardDeck; onStart: () => void }) {
  const [hovered, setHovered] = useState(false);
  const color = deck.color || DECK_COLORS[0];

  return (
    <div
      className="user-glass-card p-6 flex flex-col gap-4 cursor-pointer transition-all duration-300 h-full"
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
        <span className="text-xs text-slate-400">
          <span className="font-bold text-white">{deck.cardCount}</span> thẻ
        </span>
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

// ── Save-progress modal ────────────────────────────────────────────────────────
interface SaveProgressModalProps {
  visible: boolean;
  /** deckName: passed only when isRandom=true (user chose to save as new deck) */
  onSave: (deckName?: string) => void;
  onDiscard: () => void;
  onCancel: () => void;
  hasProgress: boolean;
  deckName: string;
  /** True = session from "Ngẫu nhiên" tab — offer to save as new deck */
  isRandom: boolean;
}

function SaveProgressModal({ visible, onSave, onDiscard, onCancel, hasProgress, deckName, isRandom }: SaveProgressModalProps) {
  const [name, setName] = useState('Bộ thẻ ngẫu nhiên');

  useEffect(() => {
    if (visible) setName('Bộ thẻ ngẫu nhiên');
  }, [visible]);

  const canSaveDeck = hasProgress && (!isRandom || name.trim().length > 0);

  return (
    <Modal
      title="Lưu tiến độ học?"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="discard" onClick={onDiscard} className="!rounded-xl">
          Không lưu
        </Button>,
        <Button
          key="save"
          type="primary"
          disabled={!canSaveDeck}
          onClick={() => onSave(isRandom ? name.trim() : undefined)}
          className="!font-bold !rounded-xl"
        >
          Lưu tiến độ
        </Button>,
      ]}
      className="kmate-modal"
    >
      {hasProgress ? (
        <div className="space-y-4">
          <p className="text-slate-300">
            Bạn đã ôn dở <strong className="text-white">{deckName || 'bộ thẻ này'}</strong>.
            Lưu tiến độ để học tiếp sau?
          </p>
          {isRandom && (
            <div>
              <label className="text-xs text-slate-400 block mb-1.5">Lưu thành bộ thẻ mới</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập tên bộ thẻ..."
                className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}
          {!isRandom && (
            <p className="text-sm text-slate-500 italic">
              Tiến độ sẽ được lưu lại. Bạn có thể tiếp tục bất cứ lúc nào.
            </p>
          )}
        </div>
      ) : (
        <p className="text-slate-300">
          Bạn chưa ôn thẻ nào. Thoát mà không lưu?
        </p>
      )}
    </Modal>
  );
}

interface ReviewModeProps {
  cards: Flashcard[];
  deckId: string | null;
  deckName: string;
  streak: number;
  sessionId: string | null;
  initialIndex?: number;
  initialAnsweredIds?: string[];
  /** Called when user clicks the back button — parent shows the save-prompt modal. */
  onRequestExit: (hasProgress: boolean, answeredCount: number, currentIdx: number) => void;
}

function ReviewMode({ cards, deckId, deckName, streak, sessionId, initialIndex = 0, initialAnsweredIds = [], onRequestExit }: ReviewModeProps) {
  const { session, setSession, updateProgress } = useFlashcardStore();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isRevealed, setIsRevealed] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [mascotMsg, setMascotMsg] = useState<string>();
  const [direction, setDirection] = useState(0);
  const [showRating, setShowRating] = useState(false);

  const totalCards = cards.length;
  const currentCard = cards[currentIndex];
  const progressPercent = totalCards > 0 ? Math.round(((currentIndex + (completed ? 1 : 0)) / totalCards) * 100) : 0;

  const answeredIdsRef = useRef<string[]>(initialAnsweredIds);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        if (e.key === 'ArrowRight' && currentIndex < totalCards - 1) {
          goToCard(currentIndex + 1, 1);
        } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
          goToCard(currentIndex - 1, -1);
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentIndex, totalCards]);

  const goToCard = (idx: number, dir: number) => {
    if (idx < 0 || idx >= totalCards) return;
    setDirection(dir);
    setIsRevealed(false);
    setShowRating(false);
    setCurrentIndex(idx);
    const newAnsweredIds = answeredIdsRef.current;
    saveProgress(idx, newAnsweredIds);
  };

  // beforeunload — uses sessionId prop and store session for the beacon check
  useEffect(() => {
    const handleUnload = () => {
      const sid = sessionId ?? session?.sessionId;
      if (!sid) return;
      const state = useFlashcardStore.getState();
      if (state.session && state.session.status === 'IN_PROGRESS') {
        // Fire-and-forget: use sendBeacon for reliability
        const body = JSON.stringify({
          sessionId: sid,
          currentIndex: state.session.currentIndex,
          answeredIds: state.session.answeredIds ?? [],
        });
        navigator.sendBeacon('/api/flashcards/session/progress', body);
      }
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [sessionId, session]);

  const saveProgress = useCallback(async (idx: number, answered: string[]) => {
    const sid = sessionId ?? session?.sessionId;
    if (!sid) return;
    updateProgress(idx, answered);
    try {
      // Immediate save — no debounce so progress is never lost on rapid navigation
      await flashcardService.updateSessionProgress({
        sessionId: sid,
        currentIndex: idx,
        answeredIds: answered,
      });
    } catch {
      // Non-fatal — local state already updated via store
    }
  }, [sessionId, session, updateProgress]);

  const handleRating = async (rating: Rating) => {
    if (!currentCard) return;
    const quality = RATING_CONFIG[rating].quality;

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
      goToCard(currentIndex + 1, 1);
    } else {
      const sid = sessionId ?? session?.sessionId;
      if (sid) {
        try {
          await flashcardService.completeSession({ sessionId: sid });
          setSession(null);
        } catch { /* non-fatal */ }
      }
      setCompleted(true);
    }
  };

  useEffect(() => {
    return () => {
      // No-op cleanup — timer removed
    };
  }, []);

  const handleBack = () => {
    const answered = answeredIdsRef.current.length;
    const hasProgress = currentIndex > 0 || answered > 0;
    onRequestExit(hasProgress, answered, currentIndex);
  };

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
            setShowRating(false);
            answeredIdsRef.current = [];
          }}
            icon={<ReloadOutlined />}
            className="!bg-white/5 !text-white !border !border-white/10 !font-bold !rounded-xl hover:!bg-white/10 transition-all">
            Ôn lại
          </Button>
          <Button size="large" type="primary" onClick={handleBack}
            className="!font-bold !rounded-xl">
            Chọn bộ thẻ khác
          </Button>
        </div>
        <KMateMascot messageApi="Chúc mừng bạn! Tuyệt vời lắm!" />
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <p className="text-slate-400 text-lg">Không có thẻ nào cần ôn. Hãy tạo thẻ mới!</p>
        <Button type="primary" onClick={handleBack} className="!font-bold !rounded-xl">
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 pb-8 animate-fade-in">
      <div className="w-full flex items-center justify-between gap-4">
        <button onClick={handleBack}
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

      {/* Card with flip + slide animation + drag */}
      <div className="w-full flex flex-col items-center gap-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            initial={{ opacity: 0, x: direction * 120 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -120 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full flex flex-col items-center"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              const threshold = 80;
              if (info.offset.x < -threshold && currentIndex < totalCards - 1) {
                goToCard(currentIndex + 1, 1);
              } else if (info.offset.x > threshold && currentIndex > 0) {
                goToCard(currentIndex - 1, -1);
              }
            }}
          >
            <FlashcardDisplay
              card={currentCard}
              isRevealed={isRevealed}
              onReveal={() => setIsRevealed(r => !r)}
              deckColor={DECK_COLORS[currentIndex % DECK_COLORS.length]}
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation arrows */}
        <div className="flex items-center gap-6 mt-2">
          <button
            onClick={() => goToCard(currentIndex - 1, -1)}
            disabled={currentIndex === 0}
            className="flex items-center justify-center w-12 h-12 rounded-full border transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 active:scale-95 active:!bg-white/5"
            style={{ borderColor: 'rgba(124,77,255,0.4)', color: '#7C4DFF' }}
          >
            <LeftOutlined />
          </button>
          <span className="text-sm font-bold text-slate-400 min-w-[3rem] text-center">
            {currentIndex + 1} / {totalCards}
          </span>
          <button
            onClick={() => goToCard(currentIndex + 1, 1)}
            disabled={currentIndex === totalCards - 1}
            className="flex items-center justify-center w-12 h-12 rounded-full border transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-110 active:scale-95 active:!bg-white/5"
            style={{ borderColor: 'rgba(124,77,255,0.4)', color: '#7C4DFF' }}
          >
            <RightOutlined />
          </button>
        </div>
      </div>

      {/* Rating buttons — toggleable */}
      <div className="w-full max-w-lg">
        {!isRevealed ? null : (
          <>
            {!showRating ? (
              <div className="flex justify-center">
                <button
                  onClick={() => setShowRating(true)}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors underline underline-offset-2"
                >
                  Đánh giá thẻ này
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-3 w-full">
                  {(['again', 'hard', 'good', 'easy'] as Rating[]).map((rating) => (
                    <RatingButton key={rating} rating={rating} onClick={() => handleRating(rating)} />
                  ))}
                </div>
                <button
                  onClick={() => setShowRating(false)}
                  className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Ẩn đánh giá
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <KMateMascot messageApi={mascotMsg} />
    </div>
  );
}

// ── Video deck card ────────────────────────────────────────────────────────────
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
      <div className="w-28 h-20 rounded-lg overflow-hidden bg-dark-400 flex-shrink-0 flex items-center justify-center relative">
        {deck.youtubeId ? (
          <img
            src={`https://img.youtube.com/vi/${deck.youtubeId}/mqdefault.jpg`}
            alt={deck.videoTitle || deck.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-cyan-500/30 flex items-center justify-center">
            <span className="text-3xl animate-bounce" style={{ animationDuration: '2s' }}>🎬</span>
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

type SortOption = 'newest' | 'name_asc' | 'name_desc' | 'cards_asc' | 'cards_desc';
type ViewMode = 'grid' | 'list';

function DeckListView({ defaultDecks, videoDecks, stats, loading, onSelectDeck, hasInProgressSession, onResume, onDeleteDeck }: {
  defaultDecks: FlashcardDeck[];
  videoDecks: (FlashcardDeck & { youtubeId?: string; videoTitle?: string })[];
  stats: FlashcardStats | null;
  loading: boolean;
  onSelectDeck: (deck: FlashcardDeck) => void;
  hasInProgressSession: boolean;
  onResume: () => void;
  onDeleteDeck: (id: string, name: string) => void;
}) {
  const { message } = App.useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);
  const pageSize = 6;

  const allDecks = [...defaultDecks, ...videoDecks];

  const sorted = [...allDecks].sort((a, b) => {
    switch (sortBy) {
      case 'name_asc': return a.name.localeCompare(b.name);
      case 'name_desc': return b.name.localeCompare(a.name);
      case 'cards_asc': return a.cardCount - b.cardCount;
      case 'cards_desc': return b.cardCount - a.cardCount;
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);
  const startIdx = (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, sorted.length);

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
      <div className="grid grid-cols-4 gap-4">
        <div className="user-glass-card p-4 flex flex-col items-center gap-1">
          <span className="text-2xl font-extrabold text-white">{totalCards}</span>
          <span className="text-xs text-slate-400">Tổng thẻ</span>
        </div>
        <div className="user-glass-card p-4 flex flex-col items-center gap-1">
          <span className="text-2xl font-extrabold text-orange-400">{dueToday}</span>
          <span className="text-xs text-slate-400">Cần ôn hôm nay</span>
        </div>
        <div className="user-glass-card p-4 flex flex-col items-center gap-1">
          <span className="text-2xl font-extrabold text-emerald-400">{Math.max(totalCards - dueToday, 0)}</span>
          <span className="text-xs text-slate-400">Đã học</span>
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
            <h2 className="text-xl font-bold text-white">Bộ từ của tôi</h2>
            <div className="h-px flex-1 bg-dark-200" />
          </div>
          <div className={viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
          }>
            {defaultDecks.slice((page - 1) * pageSize, page * pageSize).map((deck, i) => {
              const color = deck.color || DECK_COLORS[i % DECK_COLORS.length];
              return (
                <div key={deck.id} className="relative group">
                  <DeckCard deck={{ ...deck, color }} onStart={() => onSelectDeck(deck)} />
                  {!deck.isDefault && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeleteDeck(deck.id, deck.name); }}
                      className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center
                        bg-red-500/0 text-slate-500 hover:bg-red-500/20 hover:text-red-400
                        transition-all opacity-0 group-hover:opacity-100"
                      title="Xóa bộ thẻ"
                    >
                      <DeleteOutlined style={{ fontSize: 14 }} />
                    </button>
                  )}
                </div>
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

          {/* Toolbar: view toggle + sort + pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {startIdx}-{endIdx} / {sorted.length} bộ
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={sortBy}
                onChange={(value) => { setSortBy(value as SortOption); setPage(1); }}
                className="min-w-[130px]"
                options={[
                  { value: 'newest', label: 'Mới nhất' },
                  { value: 'name_asc', label: 'Tên A→Z' },
                  { value: 'name_desc', label: 'Tên Z→A' },
                  { value: 'cards_desc', label: 'Nhiều thẻ nhất' },
                  { value: 'cards_asc', label: 'Ít thẻ nhất' },
                ]}
              />
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
                  <VideoDeckCard deck={deck} onStart={() => onSelectDeck(deck as FlashcardDeck)} />
                ) : (
                  <ListDeckRow deck={deck} onStart={() => onSelectDeck(deck as FlashcardDeck)} />
                )}
                {!deck.isDefault && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteDeck(deck.id, deck.name); }}
                    className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center
                      bg-red-500/0 text-slate-500 hover:bg-red-500/20 hover:text-red-400
                      transition-all opacity-0 group-hover:opacity-100"
                    title="Xóa bộ thẻ"
                  >
                    <DeleteOutlined style={{ fontSize: 14 }} />
                  </button>
                )}
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
      )}

      {/* Empty state */}
      {allDecks.length === 0 && (
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

// ── List-mode row for video decks ─────────────────────────────────────────────
function ListDeckRow({ deck, onStart }: { deck: FlashcardDeck & { youtubeId?: string; videoTitle?: string }; onStart: () => void }) {
  const color = deck.color || '#8B5CFA';
  return (
    <div
      className="user-glass-card p-4 flex items-center gap-4 cursor-pointer hover:border-primary/40 transition-all"
      onClick={onStart}
    >
      {/* Thumbnail */}
      <div className="w-24 h-16 rounded-lg overflow-hidden bg-dark-400 flex-shrink-0 flex items-center justify-center relative">
        {deck.youtubeId ? (
          <img
            src={`https://img.youtube.com/vi/${deck.youtubeId}/mqdefault.jpg`}
            alt={deck.videoTitle || deck.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/30 to-cyan-500/30 flex items-center justify-center">
            <span className="text-2xl" style={{ animationDuration: '2s' }}>🎬</span>
          </div>
        )}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
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
        <span className="text-xs text-slate-400 mt-1 block">{deck.cardCount} thẻ</span>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {deck.youtubeId ? (
          <Link
            href={`/learn/${deck.youtubeId}`}
            onClick={(e) => e.stopPropagation()}
            className="text-xs font-bold px-3 py-1.5 rounded-xl transition-colors"
            style={{ backgroundColor: color + '20', color }}>
            Học lại
          </Link>
        ) : (
          <button className="text-xs font-bold px-3 py-1.5 rounded-xl"
            style={{ backgroundColor: color + '20', color }}>
            Bắt đầu ôn
          </button>
        )}
      </div>
    </div>
  );
}

export default function UserFlashcardPage() {
  const { message } = App.useApp();
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCards, setActiveCards] = useState<Flashcard[] | null>(null);
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [activeSession, setActiveSession] = useState<{
    sessionId: string;
    deckId: string | null;
    cardIds: string[];
    currentIndex: number;
    answeredIds: string[];
  } | null>(null);
  const [streak, setStreak] = useState(0);
  const [resumeModalVisible, setResumeModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'decks' | 'create-from-video' | 'due'>('decks');

  /** True when the current session was started from the "Ngẫu nhiên" tab */
  const [isRandomSession, setIsRandomSession] = useState(false);

  /** State for the save-progress popup */
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [pendingExit, setPendingExit] = useState<{ hasProgress: boolean; answeredCount: number; currentIndex: number } | null>(null);

  /** State for delete-deck confirmation */
  const [deleteModal, setDeleteModal] = useState<{ id: string; name: string } | null>(null);

  const { session, setSession, clearSession } = useFlashcardStore();

  // Persists across renders within the same page lifetime.
  // True = user already saved this session → skip resume modal on next load.
  // Read directly from localStorage on mount to avoid Zustand async-rehydration lag.
  const skipResumeModalRef = useRef(
    (() => {
      try {
        const raw = localStorage.getItem('kmate-flashcard');
        const parsed = raw ? JSON.parse(raw) : null;
        return parsed?.state?.session?.saved === true;
      } catch {
        return false;
      }
    })()
  );

  // Load initial data + check for existing session
  useEffect(() => {
    Promise.all([
      flashcardService.getDecks().catch(() => null),
      flashcardService.getDue().catch(() => null),
      flashcardService.getStats().catch(() => null),
      flashcardService.getSession().catch(() => null),
    ]).then(([decksRes, dueRes, statsRes, sessionRes]) => {
      if (decksRes) setDecks(decksRes.data.data);
      if (dueRes) {
        const dueData = dueRes.data.data;
        setDueCards(dueData.flashcards);
      }
      if (statsRes) {
        setStats(statsRes.data.data);
        setStreak(statsRes.data.data.streak);
      }
      if (sessionRes?.data?.data) {
        const s = sessionRes.data.data;
        const sessionData = {
          sessionId: s.id,
          deckId: s.deckId as string | null,
          cardIds: s.cardIds as string[],
          currentIndex: s.currentIndex,
          answeredIds: s.answeredIds as string[],
          source: (s.deckId ? 'deck' : 'due_random') as 'deck' | 'due_random',
          saved: !!skipResumeModalRef.current,
          status: s.status as 'IN_PROGRESS' | 'ABANDONED' | 'COMPLETED',
        };
        // Populate BOTH React state and Zustand store so handleSelectDeck can see it
        setActiveSession(sessionData);
        setSession(sessionData);
        // Only show resume modal if user has not already saved this session
        // Use skipResumeModalRef (localStorage) instead of session?.saved (stale on first render)
        if (!skipResumeModalRef.current) {
          setResumeModalVisible(true);
        }
        // Reset the flag so the modal can appear again for a fresh session
        skipResumeModalRef.current = false;
      }
    }).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defaultDecks = decks.filter((d) => d.isDefault === true);
  const videoDecks = decks
    .filter((d) => d.isDefault !== true)
    .map((d) => d as FlashcardDeck & { youtubeId?: string; videoTitle?: string });

  const handleSelectDeck = async (deck: FlashcardDeck) => {
    setActiveDeck(deck);
    setIsRandomSession(false);

    // Check if there's a saved session for this deck in the store (from localStorage)
    const storeState = useFlashcardStore.getState();
    const savedSession = storeState.session;
    // Resume if session exists for this deck (regardless of saved flag — saved means user clicked Lưu)
    const isSavedForThisDeck = savedSession?.deckId === deck.id && !!savedSession?.sessionId;

    let cardsToStudy: Flashcard[] = dueCards;

    if (deck.dueCount > 0) {
      try {
        const res = await flashcardService.getFlashcards({ deckId: deck.id, limit: deck.dueCount });
        cardsToStudy = res.data.data;
      } catch {
        cardsToStudy = dueCards;
      }
    }

    const cardIds = cardsToStudy.map((c) => c.id);
    try {
      // Resume saved session if it belongs to this deck, otherwise start fresh
      const sessionRes = await flashcardService.startSession({
        deckId: deck.id,
        cardIds,
        ...(isSavedForThisDeck ? { sessionId: savedSession.sessionId! } : {}),
      });
      const sessionData = sessionRes.data.data;
      setSession({
        sessionId: sessionData.id,
        deckId: deck.id,
        cardIds,
        currentIndex: sessionData.currentIndex,
        answeredIds: sessionData.answeredIds as string[],
        source: 'deck',
        saved: false,
        status: 'IN_PROGRESS',
      });
      setActiveSession({
        sessionId: sessionData.id,
        deckId: deck.id,
        cardIds,
        currentIndex: sessionData.currentIndex,
        answeredIds: sessionData.answeredIds as string[],
      });
      setActiveCards(cardsToStudy);
    } catch {
      setActiveCards(cardsToStudy);
    }
  };

  const handleStartRandomReview = async (cards: Flashcard[]) => {
    setActiveDeck(null);
    setIsRandomSession(true);

    // Check if there's a saved random session in the store
    const storeState = useFlashcardStore.getState();
    const savedSession = storeState.session;
    // Resume if session exists for random deck (regardless of saved flag)
    const isSavedRandom = savedSession?.deckId === null && !!savedSession?.sessionId;

    const cardIds = cards.map((c) => c.id);
    try {
      // Resume saved random session if any, otherwise start fresh
      const sessionRes = await flashcardService.startSession({
        cardIds,
        ...(isSavedRandom ? { sessionId: savedSession.sessionId! } : {}),
      });
      const sessionData = sessionRes.data.data;
      setSession({
        sessionId: sessionData.id,
        deckId: null,
        cardIds,
        currentIndex: sessionData.currentIndex,
        answeredIds: sessionData.answeredIds as string[],
        source: 'due_random',
        saved: false,
        status: 'IN_PROGRESS',
      });
      setActiveSession({
        sessionId: sessionData.id,
        deckId: null,
        cardIds,
        currentIndex: sessionData.currentIndex,
        answeredIds: sessionData.answeredIds as string[],
      });
      setActiveCards(cards);
    } catch {
      setActiveCards(cards);
    }
  };

  const handleResumeSession = async () => {
    if (!activeSession) return;
    setResumeModalVisible(false);

    const matchedDeck = decks.find((d) => d.id === activeSession.deckId) ?? null;
    setActiveDeck(matchedDeck);

    const sessionCardIds = activeSession.cardIds;

    try {
      const resumeRes = await flashcardService.startSession({
        cardIds: sessionCardIds,
        sessionId: activeSession.sessionId,
      });
      const resumeData = resumeRes.data.data;

      // Fetch real card data for all cards in the session
      let fetchedCards: Flashcard[] = [];
      try {
        const cardsRes = await flashcardService.getSessionCards(sessionCardIds);
        fetchedCards = cardsRes.data.data;
      } catch {
        // Fallback: build placeholder cards if API fails
        fetchedCards = sessionCardIds.map((id) => ({
          id,
          front: '',
          back: '',
          deckId: resumeData.deckId ?? '',
          interval: 0,
          easeFactor: 2.5,
          repetitions: 0,
          nextReview: null,
          createdAt: '',
          updatedAt: '',
        }));
      }

      setActiveCards(fetchedCards);
      setActiveSession({
        sessionId: resumeData.id,
        deckId: resumeData.deckId,
        cardIds: resumeData.cardIds as string[],
        currentIndex: resumeData.currentIndex,
        answeredIds: resumeData.answeredIds as string[],
      });
      setSession({
        sessionId: resumeData.id,
        deckId: resumeData.deckId,
        cardIds: resumeData.cardIds as string[],
        currentIndex: resumeData.currentIndex,
        answeredIds: resumeData.answeredIds as string[],
        source: resumeData.deckId ? 'deck' : 'due_random',
        saved: false,
        status: 'IN_PROGRESS',
      });
      setIsRandomSession(!resumeData.deckId);
    } catch {
      message.error('Không thể tải lại phiên ôn tập');
    }
  };

  const handleDismissResume = () => {
    setResumeModalVisible(false);
    if (activeSession) {
      flashcardService.completeSession({ sessionId: activeSession.sessionId }).catch(() => {});
      setActiveSession(null);
    }
  };

  const handleRequestExit = (hasProgress: boolean, answeredCount: number, currentIdx: number) => {
    setPendingExit({ hasProgress, answeredCount, currentIndex: currentIdx });
    setSaveModalVisible(true);
  };

  const handleSaveProgress = async (deckName?: string) => {
    setSaveModalVisible(false);

    // Always read from the Zustand store — it always has the latest progress.
    // activeSession is React state and may be stale/null when user resumes after page reload.
    const storeState = useFlashcardStore.getState();
    const storeSession = storeState.session;
    const sessionId = storeSession?.sessionId ?? activeSession?.sessionId;

    // Always save current progress to the session
    if (sessionId) {
      try {
        await flashcardService.updateSessionProgress({
          sessionId,
          currentIndex: pendingExit?.currentIndex ?? storeSession?.currentIndex ?? 0,
          answeredIds: storeSession?.answeredIds ?? [],
        });
      } catch { /* non-fatal */ }
    }

    if (isRandomSession && deckName?.trim()) {
      // Random session: save the answered cards as a new deck
      try {
        await flashcardService.saveSessionAsDeck({ sessionId: sessionId ?? '', deckName: deckName.trim() });
        message.success(`Đã lưu "${deckName}" với ${pendingExit?.answeredCount ?? 0} thẻ!`);
        const [decksRes, statsRes] = await Promise.all([
          flashcardService.getDecks(),
          flashcardService.getStats(),
        ]);
        setDecks(decksRes.data.data);
        setStats(statsRes.data.data);
      } catch {
        message.error('Không thể lưu tiến độ');
      }
    } else {
      // Deck session (or cancelled random): just keep progress saved
      message.success(`Đã lưu tiến độ "${activeDeck?.name || deckName}" — ${pendingExit?.answeredCount ?? 0} thẻ đã ôn!`);
      // Reload decks and stats so dueCount reflects remaining cards
      const [decksRes, statsRes] = await Promise.all([
        flashcardService.getDecks(),
        flashcardService.getStats(),
      ]);
      setDecks(decksRes.data.data);
      setStats(statsRes.data.data);
    }

    // Mark the session as saved in the store instead of clearing it
    // so on next page load we know to skip the resume modal
    setSession({
      sessionId: sessionId ?? null,
      deckId: storeSession?.deckId ?? activeSession?.deckId ?? null,
      cardIds: storeSession?.cardIds ?? activeSession?.cardIds ?? [],
      currentIndex: pendingExit?.currentIndex ?? storeSession?.currentIndex ?? 0,
      answeredIds: storeSession?.answeredIds ?? [],
      source: isRandomSession ? 'due_random' : 'deck',
      saved: true,
      status: 'IN_PROGRESS',
    });

    // Mark in localStorage so skipResumeModalRef picks it up on next page load
    skipResumeModalRef.current = true;

    // Clear UI state but keep the store session alive
    setActiveSession(null);
    setActiveCards(null);
    setActiveDeck(null);
    setIsRandomSession(false);
  };

  const handleDiscardProgress = () => {
    setSaveModalVisible(false);
    const storeState = useFlashcardStore.getState();
    const sessionId = storeState.session?.sessionId ?? activeSession?.sessionId;
    if (sessionId) {
      flashcardService.completeSession({ sessionId }).catch(() => {});
    }
    clearSession();
    setActiveSession(null);
    setActiveCards(null);
    setActiveDeck(null);
    setIsRandomSession(false);
  };

  const handleBackToDeckList = () => {
    setActiveCards(null);
    setActiveDeck(null);
    setActiveSession(null);
    setIsRandomSession(false);
    clearSession();
  };

  const activeDeckName = activeDeck?.name ?? (isRandomSession ? 'Ngẫu nhiên' : '');
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

      {/* Save-progress modal */}
      <SaveProgressModal
        visible={saveModalVisible}
        hasProgress={pendingExit?.hasProgress ?? false}
        deckName={activeDeckName || 'Ngẫu nhiên'}
        isRandom={isRandomSession}
        onSave={handleSaveProgress}
        onDiscard={handleDiscardProgress}
        onCancel={() => setSaveModalVisible(false)}
      />

      {/* Delete-deck confirmation */}
      <Modal
        title={
          <span className="flex items-center gap-2 text-white">
            <span className="text-red-400">⚠</span>
            Xác nhận xóa
          </span>
        }
        open={!!deleteModal}
        onCancel={() => setDeleteModal(null)}
        footer={[
          <Button key="cancel" onClick={() => setDeleteModal(null)} className="!rounded-xl">
            Hủy
          </Button>,
          <Button
            key="delete"
            danger
            type="primary"
            onClick={async () => {
              if (!deleteModal) return;
              try {
                await flashcardService.deleteDeck(deleteModal.id);
                message.success('Đã xóa bộ thẻ!');
                const [decksRes, statsRes] = await Promise.all([
                  flashcardService.getDecks(),
                  flashcardService.getStats(),
                ]);
                setDecks(decksRes.data.data);
                if (statsRes.data.data) setStats(statsRes.data.data);
              } catch {
                message.error('Không thể xóa bộ thẻ');
              } finally {
                setDeleteModal(null);
              }
            }}
            className="!rounded-xl !font-bold"
          >
            Xóa
          </Button>,
        ]}
        className="kmate-modal"
      >
        <p className="text-gray-300">
          Bạn có muốn xóa bộ flashcard &quot;{deleteModal?.name}&quot;? Hành động này không thể hoàn tác.
        </p>
      </Modal>

      {activeCards !== null && activeCards.length > 0 ? (
        <ReviewMode
          cards={activeCards}
          deckId={activeDeck?.id ?? null}
          deckName={activeDeckName}
          streak={streak}
          sessionId={activeSession?.sessionId ?? session?.sessionId ?? null}
          initialIndex={resumeData.initialIndex ?? 0}
          initialAnsweredIds={resumeData.initialAnsweredIds ?? []}
          onRequestExit={handleRequestExit}
        />
      ) : (
        <>
          {/* Tab bar — renamed "Due" → "Ngẫu nhiên" */}
          <div className="flex gap-2 mb-6">
            {[
              { key: 'decks' as const, label: 'Bộ thẻ' },
              { key: 'create-from-video' as const, label: 'Tạo từ video' },
              { key: 'due' as const, label: `Ngẫu nhiên (${stats?.dueToday ?? 0})` },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* FAB — only in decks tab */}
          {activeTab === 'decks' && (
            <button
              onClick={() => setActiveTab('create-from-video')}
              className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-primary shadow-lg shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40"
              title="Tạo thẻ từ video"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          )}

          {activeTab === 'create-from-video' ? (
            <CreateFromVideoView />
          ) : (
            activeTab === 'due' ? (
              <DueCardsView
                dueCards={dueCards}
                onStartReview={(cards) => handleStartRandomReview(cards)}
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
                onDeleteDeck={(id: string, name: string) => setDeleteModal({ id, name })}
              />
            )
          )}
        </>
      )}
    </div>
  );
}
