'use client';

import { useState, useEffect } from 'react';
import { Button, Spin } from 'antd';
import { FireOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { flashcardService, type Flashcard } from '@/lib/api-services';

interface DueCardsViewProps {
  dueCards: Flashcard[];
  /** Called when user wants to start a review session.
   *  opts.isRandom is true when started from the Ngẫu nhiên tab. */
  onStartReview: (cards: Flashcard[], opts?: { isRandom?: boolean }) => void;
  loading?: boolean;
}

const PRESET_COUNTS = [10, 20, 50];

export function DueCardsView({ dueCards, onStartReview, loading }: DueCardsViewProps) {
  const [loadingStart, setLoadingStart] = useState(false);

  const safeCards: Flashcard[] = Array.isArray(dueCards) ? dueCards : [];
  const maxCount = safeCards.length;

  // Default to min(20, maxCount) so the UI never shows a count exceeding available cards
  const [selectedCount, setSelectedCount] = useState(Math.min(20, maxCount));

  // Derive the shuffled slice whenever count or source cards change
  const shuffledCards = safeCards
    .slice()
    .sort(() => Math.random() - 0.5)
    .slice(0, selectedCount);

  // Clamp selectedCount when total due cards shrinks
  useEffect(() => {
    if (selectedCount > maxCount) setSelectedCount(maxCount);
  }, [maxCount, selectedCount]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  if (safeCards.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
          <FireOutlined style={{ fontSize: 36, color: '#7C4DFF' }} />
        </div>
        <div>
          <p className="text-white font-bold text-lg">Không có thẻ cần ôn hôm nay!</p>
          <p className="text-slate-400 text-sm mt-2">
            Bạn đã hoàn thành hết các thẻ. Hãy tạo thêm thẻ từ video nhé!
          </p>
        </div>
      </div>
    );
  }

  // Group by deck for preview display
  const byDeck = new Map<string, { deckId: string | null; deckName: string; cards: Flashcard[] }>();
  for (const card of safeCards) {
    const key = card.deckId ?? '__none__';
    if (!byDeck.has(key)) {
      byDeck.set(key, { deckId: card.deckId ?? null, deckName: 'Chưa phân loại', cards: [] });
    }
    byDeck.get(key)!.cards.push(card);
  }

  const handleStart = async () => {
    setLoadingStart(true);
    const cardsToStudy = shuffledCards.length > 0 ? shuffledCards : safeCards;
    try {
      await flashcardService.startSession({ cardIds: cardsToStudy.map((c) => c.id) });
    } catch {
      // Non-fatal — continue with the cards anyway
    } finally {
      setLoadingStart(false);
    }
    onStartReview(cardsToStudy, { isRandom: true });
  };

  const handleGroupStart = async (groupCards: Flashcard[]) => {
    setLoadingStart(true);
    try {
      await flashcardService.startSession({ cardIds: groupCards.map((c) => c.id) });
    } catch {
      // Non-fatal
    } finally {
      setLoadingStart(false);
    }
    // Group-level start is also considered random since it's a subset
    onStartReview(groupCards, { isRandom: true });
  };

  const presets = PRESET_COUNTS.filter((n) => n <= maxCount);
  const hasAll = maxCount <= 50; // hide "All" if > 50 to avoid huge sessions

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Quantity picker card ─────────────────────────────────────── */}
      <div className="user-glass-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
            <svg
              width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Học ngẫu nhiên</h2>
            <p className="text-slate-400 text-sm">{safeCards.length} thẻ có sẵn</p>
          </div>
        </div>

        {/* Preset buttons */}
        <div className="space-y-2">
          <p className="text-xs text-slate-400">Chọn số lượng thẻ:</p>
          <div className="flex items-center gap-2 flex-wrap">
            {presets.map((n) => (
              <button
                key={n}
                onClick={() => setSelectedCount(n)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedCount === n
                    ? 'bg-primary text-white shadow shadow-primary/30'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {n}
              </button>
            ))}
            {!hasAll && (
              <button
                onClick={() => setSelectedCount(maxCount)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  selectedCount === maxCount
                    ? 'bg-primary text-white shadow shadow-primary/30'
                    : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                Tất cả ({maxCount})
              </button>
            )}
          </div>

          {/* Manual number input */}
          <div className="flex items-center gap-3">
            <div>
              <label className="text-xs text-slate-500 block mb-1">Tùy chỉnh:</label>
              <input
                type="number"
                min={1}
                max={maxCount}
                value={selectedCount}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val)) setSelectedCount(Math.min(maxCount, Math.max(1, val)));
                }}
                className="w-24 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm text-center focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <span className="text-slate-500 text-xs self-end pb-2.5">/ {maxCount} thẻ</span>
          </div>
        </div>
      </div>

      {/* ── Cards grouped by deck (preview) ─────────────────────────── */}
      <div className="space-y-3">
        {Array.from(byDeck.values()).map((group, i) => (
          <div key={group.deckId ?? `none-${i}`} className="user-glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-white font-medium text-sm">{group.deckName}</span>
              </div>
              <span className="text-slate-500 text-xs">{group.cards.length} thẻ</span>
            </div>

            {/* Preview strip */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {group.cards.slice(0, 6).map((card) => (
                <div
                  key={card.id}
                  className="flex-shrink-0 px-3 py-2 rounded-xl bg-white/5 border border-white/10 max-w-[160px]"
                >
                  <p
                    className="text-white text-xs font-medium truncate leading-snug"
                    style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
                  >
                    {card.front}
                  </p>
                  <p className="text-slate-500 text-xs truncate mt-0.5">{card.back}</p>
                </div>
              ))}
              {group.cards.length > 6 && (
                <div className="flex-shrink-0 px-3 py-2 flex items-center text-slate-500 text-xs">
                  +{group.cards.length - 6} thẻ
                </div>
              )}
            </div>

            <Button
              type="primary"
              size="small"
              block
              loading={loadingStart}
              onClick={() => handleGroupStart(group.cards)}
              className="!font-bold !rounded-xl !bg-primary/20 !text-primary !border-primary/30 hover:!bg-primary/30"
            >
              Ôn {group.cards.length} thẻ <ArrowRightOutlined />
            </Button>
          </div>
        ))}
      </div>

      {/* ── Master start button ──────────────────────────────────── */}
      <Button
        type="primary"
        size="large"
        block
        loading={loadingStart}
        onClick={handleStart}
        className="!font-bold !rounded-xl !h-12"
      >
        Học {shuffledCards.length} thẻ ngẫu nhiên <ArrowRightOutlined />
      </Button>
    </div>
  );
}
