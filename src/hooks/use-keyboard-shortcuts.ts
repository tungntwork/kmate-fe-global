'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePlayerStore, PlaybackSpeed } from '@/store/player.store';

interface ShortcutConfig {
  key: string;
  action: () => void;
  description: string;
  whenPlaying?: boolean;
  whenPaused?: boolean;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  seekAmount?: number;
  volumeStep?: number;
  targetRef?: React.RefObject<HTMLElement | null>;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, seekAmount = 5, volumeStep = 0.1, targetRef } = options;

  const {
    togglePlay,
    seekRelative,
    setVolume,
    toggleMute,
    setSpeed,
    toggleSubtitle,
    setDisplayMode,
    showControls,
    hideControls,
  } = usePlayerStore();

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Stable refs for action callbacks (updated each render, read inside stable handler)
  const togglePlayRef    = useRef(togglePlay);
  const seekRelativeRef  = useRef(seekRelative);
  const setVolumeRef     = useRef(setVolume);
  const toggleMuteRef    = useRef(toggleMute);
  const setSpeedRef      = useRef(setSpeed);
  const toggleSubtitleRef = useRef(toggleSubtitle);
  const setDisplayModeRef = useRef(setDisplayMode);
  const resetControlsTimerRef = useRef<(() => void) | null>(null);
  const toggleFullscreenRef = useRef<(() => void) | null>(null);

  // Keep refs fresh
  togglePlayRef.current     = togglePlay;
  seekRelativeRef.current   = seekRelative;
  setVolumeRef.current      = setVolume;
  toggleMuteRef.current     = toggleMute;
  setSpeedRef.current       = setSpeed;
  toggleSubtitleRef.current = toggleSubtitle;
  setDisplayModeRef.current = setDisplayMode;

  const SPEEDS: PlaybackSpeed[] = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

  const resetControlsTimer = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    showControls();
    const { isPlaying } = usePlayerStore.getState();
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        hideControls();
      }, 3000);
    }
  }, [showControls, hideControls]);
  resetControlsTimerRef.current = resetControlsTimer;

  const toggleFullscreen = useCallback(() => {
    const container = document.querySelector('.player-container');
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, []);
  toggleFullscreenRef.current = toggleFullscreen;

  const cycleDisplayMode = useCallback(() => {
    const modes = ['bilingual', 'ko', 'vi'] as const;
    const { settings } = usePlayerStore.getState();
    const currentIndex = modes.indexOf(settings.displayMode);
    setDisplayMode(modes[(currentIndex + 1) % modes.length]);
    resetControlsTimer();
  }, [setDisplayMode, resetControlsTimer]);

  // The actual handler — completely stable (no deps that change per render)
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target as HTMLElement)?.isContentEditable
    ) {
      return;
    }

    const { settings, isPlaying } = usePlayerStore.getState();
    const currentSpeedIndex = SPEEDS.indexOf(settings.speed);

    const shortcuts: ShortcutConfig[] = [
      { key: ' ',   action: togglePlayRef.current!,   description: 'Play/Pause',         whenPlaying: true,  whenPaused: true },
      { key: 'k',   action: togglePlayRef.current!,   description: 'Play/Pause',         whenPlaying: true,  whenPaused: true },
      { key: 'K',   action: togglePlayRef.current!,   description: 'Play/Pause' },

      { key: 'ArrowLeft',  action: () => seekRelativeRef.current!(-seekAmount), description: `Rewind ${seekAmount}s` },
      { key: 'ArrowRight', action: () => seekRelativeRef.current!(seekAmount),  description: `Forward ${seekAmount}s` },
      { key: 'j', action: () => seekRelativeRef.current!(-seekAmount), description: `Rewind ${seekAmount}s` },
      { key: 'l', action: () => seekRelativeRef.current!(seekAmount),  description: `Forward ${seekAmount}s` },

      { key: 'ArrowUp',   action: () => setVolumeRef.current!(Math.min(1, settings.volume + volumeStep)), description: `Volume +${Math.round(volumeStep * 100)}%` },
      { key: 'ArrowDown', action: () => setVolumeRef.current!(Math.max(0, settings.volume - volumeStep)), description: `Volume -${Math.round(volumeStep * 100)}%` },
      { key: 'm', action: toggleMuteRef.current!, description: 'Mute/Unmute' },
      { key: 'M', action: toggleMuteRef.current!, description: 'Mute/Unmute' },

      { key: '>', action: () => { if (currentSpeedIndex < SPEEDS.length - 1) setSpeedRef.current!(SPEEDS[currentSpeedIndex + 1]); }, description: 'Speed up' },
      { key: '<', action: () => { if (currentSpeedIndex > 0) setSpeedRef.current!(SPEEDS[currentSpeedIndex - 1]); }, description: 'Speed down' },
      { key: '.', action: () => { if (currentSpeedIndex < SPEEDS.length - 1) setSpeedRef.current!(SPEEDS[currentSpeedIndex + 1]); }, description: 'Speed up' },
      { key: ',', action: () => { if (currentSpeedIndex > 0) setSpeedRef.current!(SPEEDS[currentSpeedIndex - 1]); }, description: 'Speed down' },

      { key: 'c', action: toggleSubtitleRef.current!,  description: 'Toggle subtitles' },
      { key: 'C', action: () => cycleDisplayMode(),    description: 'Cycle subtitle language' },

      { key: 'f',     action: toggleFullscreenRef.current!, description: 'Toggle fullscreen' },
      { key: 'F',     action: toggleFullscreenRef.current!, description: 'Toggle fullscreen' },
      { key: 'Escape', action: () => { if (document.fullscreenElement) document.exitFullscreen(); }, description: 'Exit fullscreen' },

      { key: '?', action: resetControlsTimerRef.current!, description: 'Show controls' },
    ];

    for (const shortcut of shortcuts) {
      if (event.key === shortcut.key) {
        if (shortcut.whenPlaying && !isPlaying) continue;
        if (shortcut.whenPaused && isPlaying) continue;

        event.preventDefault();
        event.stopPropagation();
        shortcut.action();
        return;
      }
    }
  }, [enabled, seekAmount, volumeStep, resetControlsTimer, cycleDisplayMode]);

  // Register listener — handleKeyDown is now stable, so this runs once
  useEffect(() => {
    if (!enabled) return;

    const target = (targetRef?.current ?? document) as EventTarget;
    target.addEventListener('keydown', handleKeyDown as EventListener, true);
    return () => {
      target.removeEventListener('keydown', handleKeyDown as EventListener, true);
    };
  }, [enabled, handleKeyDown, targetRef]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  return {
    resetControlsTimer,
  };
}
