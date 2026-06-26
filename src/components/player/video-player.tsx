'use client';

import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/store/player.store';
import { PlayCircleOutlined } from '@ant-design/icons';

declare global {
  interface Window {
    YT: typeof YT;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

interface VideoPlayerProps {
  youtubeId?: string;
  poster?: string;
  autoPlay?: boolean;
  startTime?: number;
  onReady?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onTimeUpdate?: (time: number) => void;
  onError?: (error: string) => void;
  /** Called when the YouTube player fires its onReady event — use to dismiss loading spinners. */
  onPlayerReady?: () => void;
}

export function VideoPlayer({
  youtubeId,
  poster,
  startTime = 0,
  onReady,
  onPlay,
  onPause,
  onEnded,
  onError,
  onPlayerReady,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<globalThis.YT.Player | null>(null);
  const [hidePoster, setHidePoster] = useState(false);
  const apiReadyRef = useRef(false);

  // Stable refs for callbacks so we don't need them in the useEffect dependency array
  const onReadyRef = useRef(onReady);
  const onPlayRef = useRef(onPlay);
  const onPauseRef = useRef(onPause);
  const onEndedRef = useRef(onEnded);
  const onErrorRef = useRef(onError);
  const onPlayerReadyRef = useRef(onPlayerReady);
  onReadyRef.current = onReady;
  onPlayRef.current = onPlay;
  onPauseRef.current = onPause;
  onEndedRef.current = onEnded;
  onErrorRef.current = onError;
  onPlayerReadyRef.current = onPlayerReady;

  const { setIsFullscreen, setPlayerRef, playBlocked } = usePlayerStore();

  // ── Load YouTube IFrame API script ───────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('youtube-iframe-api')) {
      if (window.YT && window.YT.Player) apiReadyRef.current = true;
      return;
    }
    const script = document.createElement('script');
    script.id = 'youtube-iframe-api';
    script.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(script);
  }, []);

  // ── Sync fullscreen state ────────────────────────────────────────────────
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [setIsFullscreen]);

  // ── Initialize YouTube player when youtubeId is ready ───────────────────
  useEffect(() => {
    if (!youtubeId) return;

    const initPlayer = () => {
      if (!containerRef.current || playerRef.current) return;

      const player = new window.YT.Player(containerRef.current, {
        videoId: youtubeId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: {
          enablejsapi: 1,
          rel: 0,
          modestbranding: 1,
          controls: 0,
          showinfo: 0,
          iv_load_policy: 3,
          autoplay: 0,
          origin: window.location.origin,
          cc_load_policy: 0,   // disable YouTube native captions
          cc_lang_pref: 'ko',
          ...(startTime > 0 ? { start: Math.floor(startTime) } : {}),
        },
        events: {
            onReady: (event) => {
            const yt = event.target;
            setPlayerRef(yt);
            const duration = yt.getDuration();
            usePlayerStore.getState().setDuration(duration);
            setHidePoster(true);
            // Block YouTube's native iframe pointer events so clicks pass through
            // to our React overlay. The React overlay uses pointer-events-none
            // to let clicks through to the iframe for fullscreen. The poster
            // play button above the iframe is what users click to start playback.
            try {
              const iframe = yt.getIframe();
              iframe.style.pointerEvents = 'none';
            } catch (_) {}
            onReadyRef.current?.();
            onPlayerReadyRef.current?.();
          },
          onStateChange: (event) => {
            const yt = playerRef.current;
            switch (event.data) {
              case window.YT.PlayerState.PLAYING:
                // YouTube already playing — just sync store state, don't call playVideo() again
                usePlayerStore.setState({ isPlaying: true, pausedByUser: false, pausedByHover: false });
                if (yt?.getCurrentTime) {
                  usePlayerStore.getState().setCurrentTime(yt.getCurrentTime());
                }
                onPlayRef.current?.();
                break;
              case window.YT.PlayerState.PAUSED:
                // YouTube already paused — sync store without marking as user-initiated pause
                // (buffering / network stall also fires PAUSED; user pause sets pausedByUser via pause() action)
                usePlayerStore.setState({ isPlaying: false, pausedByUser: false, pausedByHover: false });
                if (yt?.getCurrentTime) {
                  usePlayerStore.getState().setCurrentTime(yt.getCurrentTime());
                }
                onPauseRef.current?.();
                break;
              case window.YT.PlayerState.ENDED:
                usePlayerStore.setState({ isPlaying: false, pausedByUser: true });
                onEndedRef.current?.();
                break;
              case -1: // UNSTARTED
                // Treat as a recoverable error — player may still load
                break;
              default:
                break;
            }
          },
          onError: (event) => {
            const errorCodes: Record<number, string> = {
              2: 'Video ID không hợp lệ',
              5: 'Lỗi tải video (HTML5)',
              100: 'Video không tồn tại hoặc đã bị gỡ',
              101: 'Video không cho phép nhúng',
              150: 'Video không cho phép nhúng',
            };
            const msg = errorCodes[event.data] ?? `Lỗi video (code: ${event.data})`;
            onErrorRef.current?.(msg);
          },
        },
      });

      playerRef.current = player;

      // DOM-only update for progress bar — runs at display refresh rate via rAF,
      // bypasses React re-renders entirely so the progress bar never jitters.
      let rafId: number;
      let lastSyncedTime = -1;
      const syncProgress = () => {
        if (playerRef.current?.getCurrentTime) {
          const { isSeeking } = usePlayerStore.getState();
          // Don't override currentTime while seek is in flight — let it settle
          // before the rAF loop resumes overwriting the user-seeked position.
          // Only update store when time has changed by at least 0.1s to avoid
          // triggering re-renders on every rAF frame with floating-point drift.
          if (!isSeeking) {
            const time = playerRef.current.getCurrentTime();
            if (Math.abs(time - lastSyncedTime) >= 0.1) {
              lastSyncedTime = time;
              usePlayerStore.getState().setCurrentTime(time);
            }
          }
        }
        rafId = requestAnimationFrame(syncProgress);
      };
      rafId = requestAnimationFrame(syncProgress);

      return () => {
        cancelAnimationFrame(rafId);
        playerRef.current?.destroy();
        playerRef.current = null;
      };
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        apiReadyRef.current = true;
        initPlayer();
      };
    }
  }, [youtubeId, startTime, setPlayerRef]);

  if (!youtubeId) return null;

  return (
    <div className="relative w-full aspect-video bg-black player-container">
      {/* Poster — shown until player is ready */}
      {poster && !hidePoster && (
        <img
          src={poster}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-10"
        />
      )}

      {/* Poster play button — large centered button users click to start */}
      {!hidePoster && (
        <button
          onClick={(e) => {
            e.stopPropagation(); // don't bubble to PlayerControls motion.div
            if (playBlocked) return;
            const player = playerRef.current;
            if (player && typeof player.playVideo === 'function') {
              player.playVideo();
            }
          }}
          className="absolute inset-0 z-20 flex items-center justify-center group"
          aria-label="Play video"
        >
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
          <PlayCircleOutlined className="text-white/90 text-7xl drop-shadow-2xl group-hover:scale-110 transition-transform" />
        </button>
      )}

      {/* YouTube IFrame — pointer-events-none so clicks pass through to poster/play button above */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full pointer-events-none" />
    </div>
  );
}
