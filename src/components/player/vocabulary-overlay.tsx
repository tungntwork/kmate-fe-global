'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button, Tooltip } from 'antd';
import { HeartOutlined, HeartFilled, SoundOutlined, CloseOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useVocabulary } from '@/hooks/use-vocabulary';
import { usePlayerStore } from '@/store/player.store';

interface WordPopupProps {
  word: string;
  meaning: string;
  reading?: string;
  context?: string;
  contextTranslation?: string;
  position: { x: number; y: number };
  onClose: () => void;
}

export function WordPopup({
  word,
  meaning,
  reading,
  context,
  contextTranslation,
  position,
  onClose,
}: WordPopupProps) {
  const { saveWord, isWordSaved, isSaving } = useVocabulary();
  const { video } = usePlayerStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const [isSaved, setIsSaved] = useState(isWordSaved(word));
  const [showMeaning, setShowMeaning] = useState(false);

  const handleSave = useCallback(async () => {
    if (isSaved) return;

    const result = await saveWord({
      word,
      meaning,
      reading,
      segmentId: 'current',
      context: context || '',
      contextTranslation: contextTranslation || '',
    });

    if (result) {
      setIsSaved(true);
    }
  }, [isSaved, saveWord, word, meaning, reading, context, contextTranslation]);

  const handlePlayAudio = useCallback(() => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    }
  }, [word]);

  const popup = (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -8 }}
      transition={{ duration: 0.15 }}
      className="absolute w-72 bg-[#1e293b] rounded-xl border border-white/20 shadow-2xl overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, 0)',
        zIndex: 99999,
      }}
      onMouseEnter={() => {
        const { pauseByHover } = usePlayerStore.getState();
        pauseByHover();
      }}
    >
      {/* Arrow — points UP to the clicked word */}
      <div
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          top: '-8px',
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderBottom: '8px solid #1e293b',
        }}
      />
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#253349]">
        <div className="flex items-center gap-2">
          <span
            className="text-xl font-bold text-white"
            style={{ fontFamily: 'Noto Sans KR, sans-serif' }}
          >
            {word}
          </span>
          {reading && (
            <span className="text-gray-400 text-sm">{reading}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip title="Phát âm">
            <button
              onClick={handlePlayAudio}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <SoundOutlined />
            </button>
          </Tooltip>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <CloseOutlined />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Meaning */}
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Nghĩa</p>
          <p className="text-yellow-300 font-medium text-sm">{meaning}</p>
        </div>

        {/* Context */}
        {context && (
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">Ngữ cảnh</p>
            <p
              className="text-white text-sm"
              style={{ fontFamily: 'Noto Sans KR, sans-serif' }}
            >
              {context}
            </p>
            {contextTranslation && (
              <p className="text-gray-400 text-sm mt-1">{contextTranslation}</p>
            )}
          </div>
        )}

        {/* Save */}
        <div className="pt-2">
          <Button
            type={isSaved ? 'primary' : 'default'}
            icon={isSaved ? <HeartFilled /> : <HeartOutlined />}
            onClick={handleSave}
            loading={isSaving}
            disabled={isSaved}
            size="small"
            className={`w-full ${isSaved ? 'bg-primary-500 border-primary-500' : ''}`}
          >
            {isSaved ? 'Đã lưu' : 'Lưu vào Flashcard'}
          </Button>
        </div>
      </div>
    </motion.div>
  );

  if (!mounted || typeof document === 'undefined') return null;
  return createPortal(popup, document.body);
}

// Component for clickable Korean words in subtitles
interface ClickableTextProps {
  text: string;
  onWordClick?: (word: string, position: { x: number; y: number }) => void;
  style?: React.CSSProperties;
}

export function ClickableSubtitleText({ text, onWordClick, style }: ClickableTextProps) {
  const { pauseByHover, resumeFromHover } = usePlayerStore();
  const { getItemByWord } = useVocabulary();

  // Build a stable tooltip overlay ref so multiple words don't fight z-index
  const [hoveredWord, setHoveredWord] = useState<{
    word: string;
    meaning: string;
    x: number;
    y: number;
  } | null>(null);

  const hideTooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!onWordClick) {
    return <span style={style}>{text}</span>;
  }

  const words = text.split(/(\s+)/);

  const handleMouseEnter = useCallback(
    (word: string, e: React.MouseEvent<HTMLSpanElement>) => {
      pauseByHover();
      if (hideTooltipTimeout.current) clearTimeout(hideTooltipTimeout.current);
      const trimmed = word.trim();
      const saved = getItemByWord(trimmed);
      if (saved) {
        const rect = e.currentTarget.getBoundingClientRect();
        setHoveredWord({
          word: trimmed,
          meaning: saved.meaning,
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
        });
      }
    },
    [pauseByHover, getItemByWord],
  );

  const handleMouseLeave = useCallback(() => {
    resumeFromHover();
    hideTooltipTimeout.current = setTimeout(() => {
      setHoveredWord(null);
    }, 150);
  }, [resumeFromHover]);

  return (
    <>
      {words.map((word, index) => {
        const isKorean = /[\uAC00-\uD7AF]/.test(word);
        if (!isKorean || word.trim() === '') {
          return <span key={index}>{word}</span>;
        }
        const trimmed = word.trim();

        return (
          <span
            key={index}
            className="cursor-pointer hover:text-primary-300 transition-colors"
            style={style}
            onMouseEnter={(e) => handleMouseEnter(word, e)}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => {
              pauseByHover();
              const rect = e.currentTarget.getBoundingClientRect();
              onWordClick(trimmed, {
                x: rect.left + rect.width / 2,
                y: rect.top - 12 - window.innerHeight * 0.36,
              });
            }}
          >
            {word}
          </span>
        );
      })}

      {/* Hover tooltip — rendered via portal so z-index is reliable */}
      {hoveredWord && typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed bg-[#1e293b] border border-primary/40 rounded-xl px-3 py-2 shadow-xl pointer-events-none"
            style={{
              left: hoveredWord.x,
              top: hoveredWord.y,
              transform: 'translate(-50%, -100%)',
              zIndex: 99998,
              maxWidth: 260,
            }}
          >
            <p
              className="text-sm font-bold text-white"
              style={{ fontFamily: 'Noto Sans KR, sans-serif' }}
            >
              {hoveredWord.word}
            </p>
            <p className="text-xs text-yellow-300 mt-0.5">{hoveredWord.meaning}</p>
            {/* Tiny arrow */}
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{
                bottom: '-6px',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderTop: '6px solid #1e293b',
              }}
            />
          </div>,
          document.body,
        )}
    </>
  );
}
