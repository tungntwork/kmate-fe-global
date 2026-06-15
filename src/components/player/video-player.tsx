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
}

export function VideoPlayer({
  youtubeId,
  poster,
  startTime = 0,
  onReady,
  onPlay,
  onPause,
  onEnded,
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
  onReadyRef.current = onReady;
  onPlayRef.current = onPlay;
  onPauseRef.current = onPause;
  onEndedRef.current = onEnded;

  const { setIsFullscreen, setPlayerRef } = usePlayerStore();

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
          },
          onStateChange: (event) => {
            const yt = playerRef.current;
            switch (event.data) {
              case window.YT.PlayerState.PLAYING:
                usePlayerStore.getState().play();
                if (yt?.getCurrentTime) {
                  usePlayerStore.getState().setCurrentTime(yt.getCurrentTime());
                }
                onPlayRef.current?.();
                break;
              case window.YT.PlayerState.PAUSED:
                usePlayerStore.getState().pause();
                if (yt?.getCurrentTime) {
                  usePlayerStore.getState().setCurrentTime(yt.getCurrentTime());
                }
                onPauseRef.current?.();
                break;
              case window.YT.PlayerState.ENDED:
                onEndedRef.current?.();
                break;
            }
          },
        },
      });

      playerRef.current = player;

      // DOM-only update for progress bar — runs at display refresh rate via rAF,
      // bypasses React re-renders entirely so the progress bar never jitters.
      let rafId: number;
      const syncProgress = () => {
        if (playerRef.current?.getCurrentTime) {
          const time = playerRef.current.getCurrentTime();
          // Update store only when segment changes (subtitle sync handles this via useSubtitleSync)
          // Store update here is for display only — throttle to avoid cascading re-renders
          usePlayerStore.getState().setCurrentTime(time);
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
