import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PlaybackSpeed = 0.25 | 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;
export type DisplayMode = 'bilingual' | 'ko' | 'vi';
export type SubtitlePosition = 'bottom' | 'top';

export interface VideoInfo {
  id: string;
  slug?: string;
  youtubeId: string;
  title: string;
  channelName: string;
  thumbnail: string;
  duration: number;
  chapters?: Chapter[];
}

export interface Chapter {
  title: string;
  startTime: number;
  thumbnail?: string;
}

export interface PlaybackSettings {
  speed: PlaybackSpeed;
  volume: number;
  muted: boolean;
  displayMode: DisplayMode;
  subtitleVisible: boolean;
  subtitleOpacity: number;
  subtitleSize: number;
  subtitlePosition: SubtitlePosition;
}

interface PlayerState {
  // Video info
  video: VideoInfo | null;

  // Playback state
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  isLoading: boolean;
  pausedByHover: boolean; // true when video was auto-paused due to hover
  hasError: boolean;
  errorMessage: string;
  isFullscreen: boolean;
  
  // Settings
  settings: PlaybackSettings;
  
  // UI state
  controlsVisible: boolean;
  settingsPanelOpen: boolean;
  activeChapter: Chapter | null;
  
  // Video.js ref (stored as any since we don't want to import video.js in store)
  playerRef: unknown;
}

interface PlayerActions {
  // Video actions
  setVideo: (video: VideoInfo | null) => void;
  setPlayerRef: (ref: unknown) => void;

  // Hover pause actions
  pauseByHover: () => void;
  resumeFromHover: () => void;

  // Playback actions
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seek: (time: number) => void;
  seekRelative: (delta: number) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setBuffered: (buffered: number) => void;
  setIsLoading: (loading: boolean) => void;
  setHasError: (error: boolean, message?: string) => void;
  setIsFullscreen: (fullscreen: boolean) => void;
  toggleFullscreen: () => void;
  
  // Settings actions
  setSpeed: (speed: PlaybackSpeed) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setDisplayMode: (mode: DisplayMode) => void;
  toggleSubtitle: () => void;
  setSubtitleOpacity: (opacity: number) => void;
  setSubtitleSize: (size: number) => void;
  setSubtitlePosition: (position: SubtitlePosition) => void;
  
  // UI actions
  showControls: () => void;
  hideControls: () => void;
  toggleControls: () => void;
  openSettingsPanel: () => void;
  closeSettingsPanel: () => void;
  setActiveChapter: (chapter: Chapter | null) => void;
  
  // Reset
  reset: () => void;
}

const defaultSettings: PlaybackSettings = {
  speed: 1,
  volume: 1,
  muted: false,
  displayMode: 'bilingual',
  subtitleVisible: true,
  subtitleOpacity: 0.85,
  subtitleSize: 24,
  subtitlePosition: 'bottom',
};

const initialState: PlayerState = {
  video: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  buffered: 0,
  isLoading: false,
  pausedByHover: false,
  hasError: false,
  errorMessage: '',
  isFullscreen: false,
  settings: defaultSettings,
  controlsVisible: true,
  settingsPanelOpen: false,
  activeChapter: null,
  playerRef: null,
};

export const usePlayerStore = create<PlayerState & PlayerActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setVideo: (video) => set({ video, hasError: false }),
      setPlayerRef: (ref) => set({ playerRef: ref }),

      pauseByHover: () => {
        const player = get().playerRef as globalThis.YT.Player | null;
        if (!player) return;
        // YouTube IFrame API uses pauseVideo() — fallback to generic pause
        if (typeof player.pauseVideo === 'function') {
          player.pauseVideo();
        } else {
          (player as unknown as { pause: () => void }).pause?.();
        }
        set({ isPlaying: false, pausedByHover: true });
      },

      resumeFromHover: () => {
        const { pausedByHover } = get();
        if (!pausedByHover) return;
        const player = get().playerRef as globalThis.YT.Player | null;
        if (!player) return;
        if (typeof player.playVideo === 'function') {
          player.playVideo();
        } else {
          (player as unknown as { play: () => void }).play?.();
        }
        set({ isPlaying: true, pausedByHover: false });
      },

      play: () => {
        const player = get().playerRef as globalThis.YT.Player | null;
        if (!player) return;
        if (typeof player.playVideo === 'function') {
          player.playVideo();
        } else {
          (player as unknown as { play: () => void }).play?.();
        }
        set({ isPlaying: true, pausedByHover: false });
      },

      pause: () => {
        const player = get().playerRef as globalThis.YT.Player | null;
        if (!player) return;
        if (typeof player.pauseVideo === 'function') {
          player.pauseVideo();
        } else {
          (player as unknown as { pause: () => void }).pause?.();
        }
        set({ isPlaying: false, pausedByHover: false });
      },

      togglePlay: () => {
        const { isPlaying } = get();
        if (isPlaying) {
          get().pause();
        } else {
          get().play();
        }
      },

      seek: (time) => {
        const player = get().playerRef as globalThis.YT.Player | null;
        if (!player) return;
        const clampedTime = Math.max(0, Math.min(time, get().duration));
        // YouTube IFrame API: seekTo(seconds, allowSeekAhead)
        if (typeof (player as unknown as { seekTo: (t: number, a: boolean) => void }).seekTo === 'function') {
          (player as unknown as { seekTo: (t: number, a: boolean) => void }).seekTo(clampedTime, true);
        }
        set({ currentTime: clampedTime });
      },

      seekRelative: (delta) => {
        const { currentTime, duration } = get();
        const newTime = Math.max(0, Math.min(currentTime + delta, duration));
        get().seek(newTime);
      },

      setCurrentTime: (currentTime) => set({ currentTime }),
      setDuration: (duration) => set({ duration }),
      setBuffered: (buffered) => set({ buffered }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setHasError: (hasError, message = '') => set({ hasError, errorMessage: message }),
      setIsFullscreen: (isFullscreen) => set({ isFullscreen }),
      toggleFullscreen: () => {
        const container = document.querySelector('.player-container');
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else if (container) {
          container.requestFullscreen();
        }
        // Do NOT toggle optimistically — fullscreenchange event syncs the real state
      },

      setSpeed: (speed) => {
        const player = get().playerRef as globalThis.YT.Player | null;
        if (player && typeof player.setPlaybackRate === 'function') {
          player.setPlaybackRate(speed);
        }
        set((state) => ({
          settings: { ...state.settings, speed },
        }));
      },

      setVolume: (volume) => {
        const player = get().playerRef as globalThis.YT.Player | null;
        if (player && typeof player.setVolume === 'function') {
          player.setVolume(volume * 100);
        }
        set((state) => ({
          settings: { ...state.settings, volume, muted: volume === 0 },
        }));
      },

      toggleMute: () => {
        const player = get().playerRef as globalThis.YT.Player | null;
        const { muted, volume } = get().settings;
        if (player && typeof player.mute === 'function') {
          if (muted) {
            player.unMute();
          } else {
            player.mute();
          }
        }
        set((state) => ({
          settings: {
            ...state.settings,
            muted: !muted,
            volume: !muted ? 0 : volume || 1,
          },
        }));
      },

      setDisplayMode: (displayMode) =>
        set((state) => ({
          settings: { ...state.settings, displayMode },
        })),

      toggleSubtitle: () =>
        set((state) => ({
          settings: { ...state.settings, subtitleVisible: !state.settings.subtitleVisible },
        })),

      setSubtitleOpacity: (subtitleOpacity) =>
        set((state) => ({
          settings: { ...state.settings, subtitleOpacity },
        })),

      setSubtitleSize: (subtitleSize) =>
        set((state) => ({
          settings: { ...state.settings, subtitleSize },
        })),

      setSubtitlePosition: (subtitlePosition) =>
        set((state) => ({
          settings: { ...state.settings, subtitlePosition },
        })),

      showControls: () => set({ controlsVisible: true }),
      hideControls: () => set({ controlsVisible: false }),
      toggleControls: () => set((state) => ({ controlsVisible: !state.controlsVisible })),

      openSettingsPanel: () => set({ settingsPanelOpen: true }),
      closeSettingsPanel: () => set({ settingsPanelOpen: false }),

      setActiveChapter: (chapter) => set({ activeChapter: chapter }),

      reset: () => set(initialState),
    }),
    {
      name: 'kmate-player-settings',
      partialize: (state) => ({
        settings: {
          speed: state.settings.speed,
          volume: state.settings.volume,
          muted: state.settings.muted,
          displayMode: state.settings.displayMode,
          subtitleVisible: state.settings.subtitleVisible,
          subtitleOpacity: state.settings.subtitleOpacity,
          subtitleSize: state.settings.subtitleSize,
          subtitlePosition: state.settings.subtitlePosition,
        },
      }),
    }
  )
);
