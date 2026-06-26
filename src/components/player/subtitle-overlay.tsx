'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/store/player.store';
import { useSubtitleSync } from '@/hooks/use-subtitle-sync';
import { ClickableSubtitleText } from './vocabulary-overlay';

interface SubtitleOverlayProps {
  onWordClick?: (word: string, position: { x: number; y: number }) => void;
}

function isEmptyText(text: string | null | undefined): boolean {
  return !text || text.trim() === '' || /^[\s?]+$/.test(text);
}

export function SubtitleOverlay({ onWordClick }: SubtitleOverlayProps) {
  const {
    settings,
    pauseByHover,
    resumeFromHover,
  } = usePlayerStore();

  const {
    currentSegment,
    displayContent,
    subtitleVisible,
    subtitleOpacity,
    subtitleSize,
    subtitlePosition,
  } = useSubtitleSync();

  const isVisible = useMemo(() => {
    return subtitleVisible && currentSegment;
  }, [subtitleVisible, currentSegment]);

  const positionClasses = useMemo(() => {
    return subtitlePosition === 'top'
      ? 'top-8 bottom-auto'
      : 'bottom-20 top-auto';
  }, [subtitlePosition]);

  const subtitleStyle = useMemo(() => ({
    fontSize: `${subtitleSize}px`,
    fontFamily: "'Noto Sans KR', sans-serif",
    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
  }), [subtitleSize]);

  if (!isVisible || !displayContent) return null;

  const primaryText = displayContent.primary ?? '';
  const secondaryText = displayContent.secondary ?? null;

  // Skip animation when text is empty or garbled to prevent flickering
  const shouldAnimate = !isEmptyText(primaryText);

  const subtitleContent = (
    <div
      className="max-w-4xl w-full text-center pointer-events-auto bg-[#cccccc20] backdrop-blur-sm px-3 py-2 rounded-lg"
      style={{ opacity: subtitleOpacity }}
      onMouseEnter={() => pauseByHover()}
      onMouseLeave={() => resumeFromHover()}
    >
      {settings.displayMode === 'bilingual' ? (
        <div className="space-y-1">
          <ClickableSubtitleText
            text={primaryText}
            onWordClick={onWordClick}
            style={subtitleStyle}
          />
          <p
            className="text-yellow-300 drop-shadow-lg leading-relaxed"
            style={{ fontSize: `${Math.max(14, subtitleSize - 4)}px`, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
          >
            {secondaryText}
          </p>
        </div>
      ) : settings.displayMode === 'ko' ? (
        <ClickableSubtitleText
          text={primaryText}
          onWordClick={onWordClick}
          style={subtitleStyle}
        />
      ) : (
        <p
          className="text-yellow-300 drop-shadow-lg leading-relaxed"
          style={{ fontSize: `${subtitleSize}px`, textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
        >
          {primaryText}
        </p>
      )}
    </div>
  );

  const containerClass = `absolute left-0 right-0 flex justify-center px-4 z-[52] pointer-events-none ${positionClasses}`;

  if (shouldAnimate) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={containerClass}
        >
          {subtitleContent}
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className={containerClass}>
      {subtitleContent}
    </div>
  );
}
