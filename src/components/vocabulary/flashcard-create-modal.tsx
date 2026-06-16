'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Button, Input, Select,  } from "antd";
import { App } from 'antd';
import { PlusOutlined, VideoCameraOutlined, CheckOutlined, XOutlined } from '@ant-design/icons';
import { flashcardService } from '@/lib/api-services';

interface FlashcardWord {
  id: string;
  word: string;
  meaning: string;
  romanization?: string;
  partOfSpeech?: string;
  example?: string;
  exampleTranslation?: string;
  /** Vietnamese meaning from the segment-level translation — shown side-by-side with English meaning */
  vietnameseMeaning?: string;
}

interface FlashcardCreateModalProps {
  open: boolean;
  videoId: string;
  videoTitle: string;
  words: FlashcardWord[];
  onClose: () => void;
  onCreated?: () => void;
}

export function FlashcardCreateModal({
  open,
  videoId,
  videoTitle,
  words,
  onClose,
  onCreated,
}: FlashcardCreateModalProps) {
  const { message } = App.useApp();
  const [deckName, setDeckName] = useState('');
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [decks, setDecks] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const prevOpenRef = useRef(false);

  // Reset state when modal opens — guard with ref to avoid effect firing on first render
  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      return;
    }
    if (open && !prevOpenRef.current) {
      prevOpenRef.current = true;
      setDeckName('');
      setSelectedDeckId(null);
      setMode('new');
      setSelectedIds(new Set(words.map((w) => w.id)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load existing decks
  useEffect(() => {
    if (!open) return;
    flashcardService.getDecks()
      .then((res) => setDecks(res.data.data ?? []))
      .catch(() => setDecks([]));
  }, [open]);

  // Load decks when switching to "existing" mode
  const handleSetMode = useCallback((newMode: 'new' | 'existing') => {
    setMode(newMode);
    if (newMode === 'existing' && decks.length === 0) {
      flashcardService.getDecks()
        .then((res) => setDecks(res.data.data ?? []))
        .catch(() => setDecks([]));
    }
  }, [decks.length]);

  const toggleWord = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(words.map((w) => w.id)));
  }, [words]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedWords = useMemo(
    () => words.filter((w) => selectedIds.has(w.id)),
    [words, selectedIds],
  );

  const handleSubmit = useCallback(async () => {
    if (selectedIds.size === 0) {
      message.warning('Chưa chọn từ nào');
      return;
    }
    if (mode === 'existing' && !selectedDeckId) {
      message.warning('Hãy chọn một deck');
      return;
    }

    setLoading(true);
    try {
      let targetDeckId: string;

      if (mode === 'existing' && selectedDeckId) {
        targetDeckId = selectedDeckId;
      } else {
        const deckRes = await flashcardService.createDeck({
          name: deckName || 'Bộ từ mới',
          description: '',
        });
        targetDeckId = deckRes.data.data.id;
      }

      const localSelected = selectedWords.filter(
        (w) => w.id.startsWith('vocab-') || w.id.startsWith('seg-') || w.id.startsWith('manual-'),
      );
      const serverSelected = selectedWords.filter(
        (w) => !localSelected.some((l) => l.id === w.id),
      );

      // Deduplicate by word text to prevent 409 conflicts when the same Korean word
      // appears across multiple segments (each gets a different ID prefix, e.g. seg-${id1}-0 vs seg-${id2}-0)
      const seenWords = new Set<string>();
      const uniqueLocal = localSelected.filter((item) => {
        const normalized = item.word.trim();
        if (seenWords.has(normalized)) return false;
        seenWords.add(normalized);
        return true;
      });

      let createdCount = 0;

      if (serverSelected.length > 0) {
        await flashcardService.createFromVocabulary({
          videoId,
          wordIds: serverSelected.map((w) => w.id),
          deckId: targetDeckId,
        });
        createdCount += serverSelected.length;
      }

      for (const item of uniqueLocal) {
        await flashcardService.createFlashcard({
          word: item.word,
          meaning: item.meaning,
          pronunciation: item.romanization,
          exampleSentence: item.example,
          exampleTranslation: item.exampleTranslation,
          deckId: targetDeckId,
          videoId,
        });
        createdCount++;
      }

      const displayName =
        mode === 'new'
          ? deckName || 'Bộ từ mới'
          : decks.find((d) => d.id === selectedDeckId)?.name;

      message.success(`Đã tạo ${createdCount} flashcard trong "${displayName}"!`);
      onCreated?.();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Lỗi khi tạo flashcard';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedIds, selectedWords, mode, deckName, selectedDeckId, videoId, decks, onCreated, onClose]);

  if (!open) return null;

  return (
    // Fixed overlay — sits above player controls (z-40) but below modals
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={(e) => {
        // Only close when clicking the backdrop, not the modal content
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal content — click does NOT bubble up to video player */}
      <div
        className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ backgroundColor: '#151c2a', border: '1px solid rgba(255,255,255,0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <PlusOutlined className="text-primary-400" />
            Tạo Flashcard
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-white/5"
          >
            <XOutlined className="text-base" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Selected words */}
          <div className="rounded-xl p-3" style={{ backgroundColor: '#1a2235' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs" style={{ color: '#9ca3af' }}>
                <span className="text-primary-400 font-semibold">{selectedIds.size}</span> / {words.length} từ đã chọn
              </p>
              <div className="flex gap-2">
                <button
                  onClick={selectAll}
                  className="text-xs text-primary-400 hover:underline bg-transparent border-none cursor-pointer"
                >
                  Chọn tất
                </button>
                <span style={{ color: '#4b5563' }}>·</span>
                <button
                  onClick={deselectAll}
                  className="text-xs text-gray-500 hover:underline bg-transparent border-none cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {words.map((w) => {
                const isSelected = selectedIds.has(w.id);
                return (
                  <button
                    key={w.id}
                    onClick={() => toggleWord(w.id)}
                    className="flex flex-col items-start gap-0.5 text-xs px-2 py-1.5 rounded border transition-colors cursor-pointer min-w-[80px]"
                    style={{
                      fontFamily: 'Noto Sans KR, sans-serif',
                      backgroundColor: isSelected ? 'rgba(124,77,255,0.15)' : '#0f1623',
                      borderColor: isSelected ? '#7C4DFF' : 'rgba(255,255,255,0.1)',
                      color: isSelected ? '#fff' : '#9ca3af',
                    }}
                  >
                    <span className="self-stretch text-center text-sm">{w.word}</span>
                    <span className="self-stretch text-center text-gray-400 text-[10px] leading-tight">{w.meaning || w.vietnameseMeaning}</span>
                    {w.meaning && w.vietnameseMeaning && w.meaning !== w.vietnameseMeaning && (
                      <span className="self-stretch text-center text-yellow-300/70 text-[10px] leading-tight">{w.vietnameseMeaning}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Video link */}
          <a
            href={`/learn/${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary-400 hover:underline"
          >
            <VideoCameraOutlined />
            Xem lại video: {videoTitle}
          </a>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSetMode('new')}
              className="flex-1 py-2 text-sm rounded-lg border transition-colors cursor-pointer"
              style={{
                borderColor: mode === 'new' ? '#7C4DFF' : 'rgba(255,255,255,0.1)',
                backgroundColor: mode === 'new' ? 'rgba(124,77,255,0.1)' : 'transparent',
                color: mode === 'new' ? '#a78bfa' : '#6b7280',
              }}
            >
              Tạo deck mới
            </button>
            <button
              onClick={() => handleSetMode('existing')}
              className="flex-1 py-2 text-sm rounded-lg border transition-colors cursor-pointer"
              style={{
                borderColor: mode === 'existing' ? '#7C4DFF' : 'rgba(255,255,255,0.1)',
                backgroundColor: mode === 'existing' ? 'rgba(124,77,255,0.1)' : 'transparent',
                color: mode === 'existing' ? '#a78bfa' : '#6b7280',
              }}
            >
              Thêm vào deck có sẵn
            </button>
          </div>

          {/* Deck name (new mode) */}
          {mode === 'new' ? (
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#9ca3af' }}>Tên deck</label>
              <Input
                value={deckName}
                onChange={(e) => setDeckName(e.target.value)}
                placeholder="VD: Bộ từ mới"
                className="w-full px-3 py-2 rounded-lg border text-white text-sm"
                style={{
                  backgroundColor: '#1a2235',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#fff',
                }}
              />
            </div>
          ) : (
            <div>
              <label className="text-xs mb-1 block" style={{ color: '#9ca3af' }}>Chọn deck</label>
              <Select
                value={selectedDeckId}
                onChange={setSelectedDeckId}
                placeholder="Chọn deck..."
                className="w-full"
                options={decks.map((d) => ({ value: d.id, label: d.name }))}
                classNames={{ popup: { root: 'kmate-dark-select' } }}
                style={{ width: '100%' }}
              />
            </div>
          )}

          {/* Submit */}
          <Button
            type="primary"
            block
            size="large"
            loading={loading}
            onClick={handleSubmit}
            disabled={selectedIds.size === 0}
            className="!bg-primary-500 !border-primary-500 !mt-2 !rounded-lg !h-12 !text-base !font-semibold"
          >
            Tạo bộ flashcard
          </Button>
        </div>
      </div>
    </div>
  );
}
