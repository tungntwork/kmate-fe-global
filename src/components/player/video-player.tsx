'use client';

import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/store/player.store';

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
  const [playerReady, setPlayerReady] = useState(false);
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
            setPlayerReady(true);
            setHidePoster(true);
            // Block YouTube's native iframe pointer events so our React popup/controls
            // can render and interact on top without being intercepted by the iframe.
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

      // Sync currentTime to store every 100ms while playing (was 250ms — too coarse for short subtitle segments)
      const interval = setInterval(() => {
        if (playerRef.current?.getCurrentTime) {
          usePlayerStore.getState().setCurrentTime(playerRef.current.getCurrentTime());
        }
      }, 100);

      return () => {
        clearInterval(interval);
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
    <div className="relative w-full aspect-video bg-black">
      {/* Poster — hidden once player is ready */}
      {poster && !hidePoster && (
        <img
          src={poster}
          alt=""
          className="absolute inset-0 w-full h-full object-cover z-10"
        />
      )}

      {/* YouTube IFrame — replaced by IFrame API player */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
