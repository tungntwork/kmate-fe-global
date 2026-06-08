'use client';

import { useState, useCallback, useMemo, memo } from 'react';
import { Button, Tooltip, message } from 'antd';
import { SoundOutlined, PlusOutlined, CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import { ConfirmModal } from '../common/confirm-modal';

interface VocabWord {
  id: string;
  word: string;
  meaning: string;
  romanization?: string;
  partOfSpeech?: string;
  difficulty?: string;
  example?: string;
  exampleTranslation?: string;
  frequency?: number;
  selected?: boolean;
}

function SectionHeader({
  title,
  count,
  open,
  onToggle,
}: {
  title: string;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-dark-400/40 transition-colors text-left"
    >
      {open ? (
        <CaretDownOutlined className="text-xs text-gray-500 flex-shrink-0" />
      ) : (
        <CaretRightOutlined className="text-xs text-gray-500 flex-shrink-0" />
      )}
      <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">{title}</span>
      <span className="text-xs text-gray-600">({count})</span>
    </button>
  );
}

function WordRow({
  word,
  onSpeak,
  onDelete,
}: {
  word: VocabWord;
  onSpeak: (text: string) => void;
  onDelete?: () => void;
}) {
  return (
    <div className="group px-4 py-2.5 flex flex-col gap-1 hover:bg-dark-400/30 transition-colors">
      {/* Line 1: Korean word + romanization + difficulty + actions */}
      <div className="flex items-center gap-2">
        {/* Korean word */}
        <span
          className="text-white font-semibold text-sm flex-shrink-0"
          style={{ fontFamily: 'Noto Sans KR, sans-serif', minWidth: 64 }}
        >
          {word.word}
        </span>

        {/* Romanization */}
        {word.romanization && (
          <span className="text-gray-500 text-xs italic flex-shrink-0">
            {word.romanization}
          </span>
        )}

        {/* Difficulty badge */}
        {word.difficulty && (
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
              word.difficulty === 'easy'
                ? 'bg-green-500/20 text-green-400'
                : word.difficulty === 'medium'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {word.difficulty}
          </span>
        )}

        {/* Spacer */}
        <span className="flex-1 min-w-0" />

        {/* TTS button */}
        <Tooltip title="Phát âm">
          <button
            onClick={() => onSpeak(word.word)}
            className="text-gray-400 hover:text-primary-400 transition-colors flex-shrink-0"
          >
            <SoundOutlined />
          </button>
        </Tooltip>

        {/* Delete button */}
        {onDelete && (
          <Tooltip title="Xóa">
            <button
              onClick={onDelete}
              className="text-gray-400 hover:text-red-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </Tooltip>
        )}
      </div>

      {/* Line 2: Vietnamese meaning — full width, never truncated */}
      <div className="pl-[72px] flex items-start gap-1">
        <span className="text-gray-600 text-xs flex-shrink-0">=</span>
        <span className="text-yellow-300/80 text-xs leading-snug">{word.meaning}</span>
      </div>
    </div>
  );
}

interface VocabularyPanelProps {
  videoId: string;
  videoTitle?: string;
  /** Words from the current subtitle segment */
  currentSegmentWords?: VocabWord[];
  /** AI-extracted vocabulary (fallback/pre-loaded) */
  initialWords?: VocabWord[];
  /** Words saved via "Lưu vào Flashcard" button (localStorage) */
  savedVocabItems?: VocabWord[];
  onWordDelete?: (id: string) => void;
  onCreateFlashcards?: (words: VocabWord[]) => void;
}

export const VocabularyPanel = memo(function VocabularyPanel({
  videoId,
  videoTitle,
  currentSegmentWords = [],
  initialWords = [],
  savedVocabItems = [],
  onWordDelete,
  onCreateFlashcards,
}: VocabularyPanelProps) {
  const [deleteTarget, setDeleteTarget] = useState<VocabWord | null>(null);

  // Collapsible section state
  const [segmentOpen, setSegmentOpen] = useState(true);
  const [savedOpen, setSavedOpen] = useState(true);

  // TTS
  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.8;
    window.speechSynthesis.speak(utterance);
  }, []);

  const handleDelete = useCallback((word: VocabWord) => {
    setDeleteTarget(word);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    onWordDelete?.(deleteTarget.id);
    setDeleteTarget(null);
    message.success(`Đã xóa từ "${deleteTarget.word}"`);
  }, [deleteTarget, onWordDelete]);

  // Deduplicate: saved items may overlap with segment words
  const segmentIds = new Set(currentSegmentWords.map((w) => w.id));
  const savedFiltered = savedVocabItems.filter((w) => !segmentIds.has(w.id));
  const savedFilteredIds = new Set(savedFiltered.map((w) => w.id));
  const initialFiltered = initialWords.filter(
    (w) => !segmentIds.has(w.id) && !savedFilteredIds.has(w.id),
  );

  const hasSegmentWords = currentSegmentWords.length > 0;
  const hasSavedWords = savedFiltered.length > 0;
  const hasInitialWords = initialFiltered.length > 0;
  const hasAnyWords = hasSegmentWords || hasSavedWords || hasInitialWords;

  const handleAddToFlashcard = useCallback(() => {
    if (savedFiltered.length === 0 && currentSegmentWords.length === 0) {
      message.info('Chưa có từ nào để tạo flashcard');
      return;
    }
    // Only pass saved words — segment/AI words are for reference only
    const wordsToSave = savedFiltered.length > 0 ? savedFiltered : currentSegmentWords;
    onCreateFlashcards?.(wordsToSave);
  }, [savedFiltered, currentSegmentWords, onCreateFlashcards]);

  return (
    <div className="flex flex-col h-full bg-dark-300 rounded-xl border border-dark-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-dark-200 flex-shrink-0">
        <h3 className="text-sm font-semibold text-white">Từ vựng từ video</h3>
      </div>

      {/* Word list */}
      <div className="flex-1 overflow-y-auto">

        {/* ── Section 1: Từ từ video (segment words) — always collapsible ── */}
        {hasSegmentWords && (
          <div className="divide-y divide-dark-200">
            <SectionHeader
              title="Từ từ video"
              count={currentSegmentWords.length}
              open={segmentOpen}
              onToggle={() => setSegmentOpen((v) => !v)}
            />
            {segmentOpen && (
              <>
                {/* Segment banner: full Korean text + translation */}
                <div className="px-4 py-2.5 bg-dark-400/40 border-b border-dark-200/50">
                  <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-1">Đoạn hiện tại</p>
                  <p
                    className="text-white text-sm leading-relaxed"
                    style={{ fontFamily: 'Noto Sans KR, sans-serif' }}
                  >
                    {currentSegmentWords.map((w) => w.word).join(' ')}
                  </p>
                  {currentSegmentWords[0]?.exampleTranslation && (
                    <p className="text-yellow-300/70 text-xs mt-1 italic">
                      {currentSegmentWords[0].exampleTranslation}
                    </p>
                  )}
                </div>
                {currentSegmentWords.map((word) => (
                  <WordRow
                    key={word.id}
                    word={word}
                    onSpeak={speak}
                    onDelete={onWordDelete ? () => handleDelete(word) : undefined}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* ── Section 2: Đã lưu (user-saved words) — collapsible ── */}
        {hasSavedWords && (
          <div className="divide-y divide-dark-200">
            <SectionHeader
              title="Đã lưu"
              count={savedFiltered.length}
              open={savedOpen}
              onToggle={() => setSavedOpen((v) => !v)}
            />
            {savedOpen && savedFiltered.map((word) => (
              <WordRow
                key={word.id}
                word={word}
                onSpeak={speak}
                onDelete={onWordDelete ? () => handleDelete(word) : undefined}
              />
            ))}
          </div>
        )}

        {/* ── Section 3: AI (initial words) — only when no segment/saved ── */}
        {hasInitialWords && !hasSegmentWords && !hasSavedWords && (
          <div className="divide-y divide-dark-200">
            <SectionHeader
              title="Từ vựng gợi ý"
              count={initialFiltered.length}
              open={true}
              onToggle={() => {}}
            />
            {initialFiltered.map((word) => (
              <WordRow
                key={word.id}
                word={word}
                onSpeak={speak}
                onDelete={onWordDelete ? () => handleDelete(word) : undefined}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!hasAnyWords && (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm gap-1 p-4">
            <p>Chưa có từ vựng trong đoạn này</p>
            <p className="text-xs text-center">Bấm vào từ tiếng Hàn trên phụ đề để xem nghĩa</p>
          </div>
        )}
      </div>

      {/* Bottom action: Add to flashcard */}
      <div className="px-4 py-3 border-t border-dark-200 flex-shrink-0">
        <Button
          block
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddToFlashcard}
          disabled={!hasAnyWords}
          className="!bg-primary-500 !border-primary-500 !text-white !font-semibold"
        >
          Thêm bộ flashcard
        </Button>
      </div>

      {/* Delete confirmation */}
      {deleteTarget && (
        <ConfirmModal
          title="Xóa từ"
          message={`Bạn có chắc muốn xóa từ "${deleteTarget.word}" khỏi danh sách không?`}
          confirmText="Xóa"
          danger
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
});
