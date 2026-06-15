'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button, Drawer, Typography, Tooltip, Spin, Modal, message } from 'antd';
import {
  ArrowLeftOutlined,
  MenuOutlined,
  QuestionCircleOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayerStore } from '@/store/player.store';
import { useSubtitleStore } from '@/store/subtitle.store';
import { useWatchHistoryStore } from '@/store/watch-history.store';
import { useVocabularyStore } from '@/store/vocabulary.store';
import { useTracking } from '@/hooks/use-tracking';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useVocabulary } from '@/hooks/use-vocabulary';
import { useSubtitleSocket } from '@/hooks/use-subtitle-socket';
import { SubtitleGenerationModal } from '@/components/subtitle/subtitle-generation-modal';
import { VocabularyPanel } from '@/components/vocabulary/vocabulary-panel';
import { FlashcardCreateModal } from '@/components/vocabulary/flashcard-create-modal';
import { videoService, subtitleService, flashcardService } from '@/lib/api-services';
import { api } from '@/lib/api';
import type { VideoDetailResult } from '@/lib/api-services';
import {
  VideoPlayer,
  SubtitleOverlay,
  PlayerControls,
  SubtitleSettingsPanel,
} from '@/components/player';

const { Title, Text } = Typography;

// ── Robust segment field mapper ────────────────────────────────────────────────
// Handles every possible field name variant the backend might send for both
// original text and translation, so translations never silently disappear.
function mapSegment(seg: any) {
  const ko = seg.korean ?? seg.text ?? seg.original ?? '';
  const vi = seg.vietnamese ?? seg.translation ?? seg.translatedText ?? '';
  return {
    id: seg.id || String(seg.start ?? seg.startTime ?? 0),
    startTime: seg.start ?? seg.startTime ?? 0,
    endTime: seg.end ?? seg.endTime ?? 0,
    text: ko,
    translation: vi,
  };
}

export default function LearningPlayerPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const videoId = params.videoId as string;
  const startTimeParam = searchParams.get('t');

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [vocabDrawerOpen, setVocabDrawerOpen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // true = show "no subtitles" prompt; transitions to "processing" via SubtitleGenerationModal
  const [showSubtitleModal, setShowSubtitleModal] = useState(false);
  const [subtitleGenerated, setSubtitleGenerated] = useState(false);
  const [selectedWord, setSelectedWord] = useState<{
    word: string;
    position: { x: number; y: number };
    meaning?: string;
    romanization?: string;
    partOfSpeech?: string;
    example?: string;
    exampleTranslation?: string;
    isLoading?: boolean;
  } | null>(null);
  const [savingWord, setSavingWord] = useState(false);
  const [flashcardDecks, setFlashcardDecks] = useState<any[]>([]);
  const [addingToFlashcard, setAddingToFlashcard] = useState<string | null>(null); // vocab item id being added

  // AI vocabulary panel state
  const [vocabWords, setVocabWords] = useState<any[]>([]);
  const [vocabExtracting, setVocabExtracting] = useState(false);
  const [vocabExtractionProgress, setVocabExtractionProgress] = useState(0);
  const [vocabJobId, setVocabJobId] = useState<string | null>(null);
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [selectedVocabIds, setSelectedVocabIds] = useState<string[]>([]);

  // Stable ref to current segment — used by handleWordClick to get context for lookup API
  const currentSegmentRef = useRef<typeof currentSegment>(null);


  const containerRef = useRef<HTMLDivElement>(null);

  const {
    video,
    setVideo,
    controlsVisible,
    settings,
    isPlaying,
    currentTime,
    reset: resetPlayer,
  } = usePlayerStore();

  const {
    segments,
    setSegments,
    currentSegment,
    clearSegments,
    setIsLoading: setSubtitleLoading,
  } = useSubtitleStore();

  // Keep currentSegmentRef in sync with the store without triggering re-renders
  useEffect(() => {
    currentSegmentRef.current = currentSegment;
  }, [currentSegment]);

  const { loadProgress } = useWatchHistoryStore();

  const { resumeFromLastPosition, stats } = useTracking({
    videoId,
    autoStart: true,
  });

  useKeyboardShortcuts({ enabled: true });

  const { items: vocabItems, totalCount: vocabCount, saveWord } = useVocabulary();

  // Real-time subtitle processing via Socket.IO
  const subtitleSocket = useSubtitleSocket({ videoId, enabled: !!videoId });

  // When subtitles are ready via socket, fetch and load them
  useEffect(() => {
    if (subtitleSocket.ready && subtitleSocket.ready.videoId === videoId) {
      subtitleService.getSubtitles(videoId)
        .then((r) => {
          if (r.data.data.subtitles.length > 0) {
            const subData = r.data.data.subtitles[0];
            if (subData.bilingualContent && Array.isArray(subData.bilingualContent)) {
              setSegments(subData.bilingualContent.map(mapSegment), videoId, subData.language);
              setSubtitleLoading(false);
            } else if (subData.subtitleContent && Array.isArray(subData.subtitleContent)) {
              setSegments(subData.subtitleContent.map(mapSegment), videoId, subData.language);
              setSubtitleLoading(false);
            }
            setShowSubtitleModal(false);
            message.success('Phụ đề đã sẵn sàng!');
          } else {
            setSubtitleLoading(false);
            setShowSubtitleModal(true);
          }
        })
        .catch(() => {
          setSubtitleLoading(false);
        });
    }
  }, [subtitleSocket.ready, videoId]);

  // ── Load video + subtitles ─────────────────────────────────────────
  useEffect(() => {
    const loadContent = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        // 1. Fetch video metadata
        const videoRes = await videoService.discoverVideo(videoId);
        const videoData: VideoDetailResult = videoRes.data.data;

        // 2. Map to VideoInfo shape for player store
        setVideo({
          id: videoData.youtubeId,
          youtubeId: videoData.youtubeId,
          title: videoData.title,
          channelName: videoData.channelTitle,
          thumbnail: videoData.thumbnail,
          duration: videoData.duration,
        });

        // 3. Unlock video (triggers coin deduction on backend) — must await so DB record is created before subtitle fetch
        try {
          await videoService.unlockVideo(videoId);
        } catch (unlockErr: any) {
          // Non-fatal: video might already be unlocked or free
          console.warn('[Player] unlockVideo failed:', unlockErr?.response?.data ?? unlockErr?.message);
        }

        // 4. Load existing subtitles (video must exist in DB first)
        try {
          const subRes = await subtitleService.getSubtitles(videoId);
          if (subRes.data.data.subtitles.length > 0) {
            const subData = subRes.data.data.subtitles[0];
            if (subData.bilingualContent && Array.isArray(subData.bilingualContent)) {
              setSegments(subData.bilingualContent.map(mapSegment), videoId, subData.language);
              setSubtitleLoading(false);
            } else if (subData.subtitleContent && Array.isArray(subData.subtitleContent)) {
              setSegments(subData.subtitleContent.map(mapSegment), videoId, subData.language);
              setSubtitleLoading(false);
            }
          } else {
            setSubtitleLoading(false);
            setShowSubtitleModal(true);
          }
        } catch (subErr: any) {
          if (subErr?.response?.status === 404) {
            setShowSubtitleModal(true);
          } else {
            console.warn('[Player] getSubtitles failed:', subErr?.response?.data ?? subErr?.message);
          }
        }

        // 5. Seek to start time or resume
        if (startTimeParam) {
          const time = parseFloat(startTimeParam);
          if (!isNaN(time)) usePlayerStore.getState().seek(time);
        } else {
          setTimeout(() => resumeFromLastPosition(), 500);
        }
      } catch (error: any) {
        console.error('Failed to load video:', error);
        const msg = error?.response?.data?.message ?? error?.message ?? 'Failed to load video';
        setLoadError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    if (videoId) {
      loadContent();
    }

    return () => {
      resetPlayer();
      clearSegments();
    };
  }, [videoId, startTimeParam]);

  // ── Generate subtitles with AI ────────────────────────────────────
  const handleSubtitleReady = useCallback((subtitleUrl: string, segmentCount: number) => {
    setSubtitleGenerated(true);
    setShowSubtitleModal(false);
    message.success(`Phụ đề đã sẵn sàng! (${segmentCount} đoạn)`);
    // Reload subtitles into the player
    subtitleService.getSubtitles(videoId)
      .then((r) => {
        if (r.data.data.subtitles.length > 0) {
          const subData = r.data.data.subtitles[0];
          if (subData.bilingualContent && Array.isArray(subData.bilingualContent)) {
            setSegments(subData.bilingualContent.map(mapSegment), videoId, subData.language);
          } else if (subData.subtitleContent && Array.isArray(subData.subtitleContent)) {
            setSegments(subData.subtitleContent.map(mapSegment), videoId, subData.language);
          }
        }
      })
      .catch(() => {});
  }, [videoId]);

  const handleSubtitleError = useCallback((error: string) => {
    message.error(`Lỗi tạo phụ đề: ${error}`);
  }, []);

  const handleCloseSubtitleModal = useCallback(() => {
    setShowSubtitleModal(false);
    router.push('/user/explore');
  }, [router]);

  // ── Save word to vocabulary sidebar ───────────────────────────────
  const handleSaveWord = useCallback(async () => {
    if (!selectedWord || !currentSegment) return;
    setSavingWord(true);
    try {
      await saveWord({
        word: selectedWord.word,
        meaning: selectedWord.meaning || currentSegment.translation || currentSegment.text || selectedWord.word,
        reading: selectedWord.romanization,
        segmentId: currentSegment.id || `seg-${selectedWord.word}`,
        context: currentSegment.text || '',
        contextTranslation: currentSegment.translation || '',
      });
      message.success('Đã lưu từ vựng!');
      setSelectedWord(null);
    } catch (err: any) {
          const msg = err?.response?.data?.message ?? err?.message ?? 'Loi khi luu tu vung';
      message.error(msg);
    } finally {
      setSavingWord(false);
    }
  }, [selectedWord, currentSegment, saveWord]);

  // Load decks when drawer opens
  const handleOpenVocabDrawer = useCallback(async () => {
    setVocabDrawerOpen(true);
    try {
      const res = await flashcardService.getDecks();
      setFlashcardDecks(res.data.data);
    } catch {
      setFlashcardDecks([]);
    }
  }, []);

  // Add a vocabulary item to a flashcard deck
  const handleAddToFlashcard = useCallback(async (vocabItem: any, deckId: string) => {
    setAddingToFlashcard(vocabItem.id);
    try {
      await flashcardService.createFlashcard({
        word: vocabItem.word,
        meaning: vocabItem.meaning || vocabItem.contextTranslation || vocabItem.word,
        pronunciation: vocabItem.reading,
        exampleSentence: vocabItem.context,
        exampleTranslation: vocabItem.contextTranslation,
        deckId,
        videoId: videoId,
      });
      message.success('Đã thêm vào bộ flashcard!');
    } catch (err: any) {
          const msg = err?.response?.data?.message ?? err?.response?.data?.error?.message ?? 'Loi khi tao flashcard';
      message.error(msg);
    } finally {
      setAddingToFlashcard(null);
    }
  }, [videoId]);

  const handleWordClick = useCallback(async (word: string, position: { x: number; y: number }) => {
    const { pauseByHover } = usePlayerStore.getState();
    pauseByHover(); // keep video paused while reading popup

    setSelectedWord({ word, position, isLoading: true });

    try {
      const res = await api.post<{ data: { meaning: string; romanization: string; partOfSpeech: string; example: string; exampleTranslation: string } }>('/vocabulary/lookup', {
        word,
        context: currentSegmentRef.current?.text ?? undefined,
      });
      const def = res.data.data;
      setSelectedWord({
        word,
        position,
        meaning: def.meaning,
        romanization: def.romanization,
        partOfSpeech: def.partOfSpeech,
        example: def.example,
        exampleTranslation: def.exampleTranslation,
        isLoading: false,
      });
    } catch {
      setSelectedWord({ word, position, meaning: undefined, isLoading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // no deps — currentSegmentRef is always stable

  const handleCloseWordPopup = useCallback(() => {
    const { resumeFromHover } = usePlayerStore.getState();
    // Only auto-resume if the video was paused by hover
    resumeFromHover();
    setSelectedWord(null);
  }, []);

  // ── Vocabulary panel handlers ────────────────────────────────────

  // Load vocabulary from API when video loads
  const loadVocabWords = useCallback(async () => {
    try {
      const res = await api.get<{ data: { items: any[]; total: number } }>(`/vocabulary/${videoId}`);
      const items = res.data.data?.items ?? [];
      setVocabWords(items);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setVocabWords([]);
      } else {
        setVocabWords([]);
        message.warning('Không thể tải từ vựng. Bạn có thể bấm "Trích xuất" để tạo.');
      }
    }
  }, [videoId]);

  // Trigger AI vocabulary extraction
  const handleExtractVocabulary = useCallback(async (mode: 'topic' | 'segment' | 'all') => {
    setVocabExtracting(true);
    setVocabExtractionProgress(0);
    try {
      const res = await api.post<{ data: { jobId: string } }>('/vocabulary/extract', {
        videoId,
        mode,
      });
      setVocabJobId(res.data.data.jobId);
      message.info('Đang trích xuất từ vựng...');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        const existingJobId =
          err?.response?.data?.error?.jobId ?? err?.response?.data?.jobId;
        if (existingJobId) {
          setVocabJobId(existingJobId);
          message.info('Đang đợi trích xuất từ vựng trước đó...');
          return;
        }
      }
          const msg = err?.response?.data?.error?.message ?? err?.message ?? 'Lỗi khi trích xuất';
      message.error(msg);
      setVocabExtracting(false);
    }
  }, [videoId]);

  // Poll vocab job status
  useEffect(() => {
    if (!vocabJobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get<{ data: { status: string; progress: number } }>(`/vocabulary/jobs/${vocabJobId}`);
        const { status, progress } = res.data.data;
        setVocabExtractionProgress(progress ?? 0);
        if (status === 'COMPLETED') {
          setVocabExtracting(false);
          setVocabJobId(null);
          loadVocabWords();
          message.success('Đã trích xuất từ vựng!');
          clearInterval(interval);
        } else if (status === 'FAILED') {
          setVocabExtracting(false);
          setVocabJobId(null);
          message.error('Trích xuất từ vựng thất bại');
          clearInterval(interval);
        }
      } catch {
        // ignore
      }
    }, 2000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocabJobId]);

  // Listen for vocabulary:ready socket event
  useEffect(() => {
    if (!subtitleSocket) return;
    const handler = () => {
      loadVocabWords();
    };
    const socket = (window as any).__socket;
    if (!socket) return;
    socket.on('vocabulary:ready', handler);
    return () => { socket.off('vocabulary:ready', handler); };
  }, [subtitleSocket, loadVocabWords]);

  // Create flashcards from selected vocabulary
  const handleCreateFlashcards = useCallback((words: any[]) => {
    setSelectedVocabIds(words.map((w: any) => w.id));
    setFlashcardModalOpen(true);
  }, []);

  const handleWordDelete = useCallback((id: string) => {
    setVocabWords((prev) => prev.filter((w: any) => w.id !== id));
  }, []);

  const handleWordReorder = useCallback((words: any[]) => {
    setVocabWords(words);
  }, []);

  // Load vocab when subtitle is ready
  useEffect(() => {
    if (subtitleGenerated || (segments.length > 0)) {
      loadVocabWords();
    }
  }, [subtitleGenerated, segments.length, loadVocabWords]);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);

  const shortcuts = [
    { key: 'Space / K', action: 'Play / Pause' },
    { key: '← →', action: 'Seek ±5s' },
    { key: '↑ ↓', action: 'Volume' },
    { key: 'M', action: 'Mute' },
    { key: 'F', action: 'Fullscreen' },
    { key: 'C', action: 'Subtitles' },
    { key: ', .', action: 'Speed' },
  ];

  // ── Video click → toggle play/pause ────────────────────────────────

  // ── Saved vocabulary items from store (localStorage) ──────────────
  // These come from the "Lưu vào Flashcard" button on subtitle word clicks
  const savedVocabItems = vocabItems
    .filter((item) => item.videoId === videoId)
    .map((item) => ({
      id: item.id,
      word: item.word,
      meaning: item.meaning || '',
      vietnameseMeaning: item.contextTranslation || '',
      romanization: item.reading || '',
      difficulty: 'medium',
      example: item.context || '',
      exampleTranslation: item.contextTranslation || '',
    }));

  return (
    <div className="flex flex-col h-screen bg-[#0B0B0F] text-white overflow-hidden">
      {/* Loading state */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0B0F]">
          <Spin size="large" />
          <p className="mt-4 text-slate-400">Đang tải video...</p>
        </div>
      )}

      {/* Error state */}
      {!isLoading && loadError && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0B0B0F]">
          <p className="text-red-400 mb-4">{loadError}</p>
          <Button type="primary" onClick={() => router.push('/user/explore')}>
            Quay lai Explore
          </Button>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-[#111827] border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.push('/user/explore')}
            className="text-white hover:!text-primary"
          />
          {video && (
            <div>
              <Title level={5} className="!text-white !mb-0 !text-sm">{video.title}</Title>
              <Text className="text-xs text-slate-400">{video.channelName}</Text>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Subtitle generation status */}
          {subtitleSocket.progress && (
            <Tooltip title={`${subtitleSocket.stageLabel} (${subtitleSocket.progressPercent}%)`}>
              <div className="flex items-center gap-1 px-2">
                <Spin size="small" />
                <span className="text-xs text-primary">{subtitleSocket.progressPercent}%</span>
              </div>
            </Tooltip>
          )}
          {subtitleSocket.failed && subtitleSocket.failed.videoId === videoId && (
            <Tooltip title="Phụ đề thất bại">
              <span className="text-xs text-red-400 px-2"> Lỗi AI</span>
            </Tooltip>
          )}
          {vocabCount > 0 && (
              <Tooltip title={`${vocabCount} từ đã lưu`}>
              <Button
                type="text"
                icon={<SaveOutlined />}
                onClick={handleOpenVocabDrawer}
                className="text-gray-400 hover:!text-primary"
              />
            </Tooltip>
          )}
          <Button
            type="text"
            icon={<QuestionCircleOutlined />}
            onClick={() => setShowShortcuts(!showShortcuts)}
            className={`text-gray-400 hover:!text-primary ${showShortcuts ? '!text-primary' : ''}`}
          />
          <Button
            type="text"
            icon={<MenuOutlined />}
            onClick={openSettings}
            className="text-gray-400 hover:!text-white"
          />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden" ref={containerRef}>
        {/* Video player column */}
        <div className="flex-1 flex flex-col relative">
          {/* Player container — click empty space to start/resume playback */}
          <div className="relative flex-1 bg-black player-container" onClick={() => usePlayerStore.getState().play()}>
            <VideoPlayer youtubeId={video?.youtubeId} poster={video?.thumbnail} />
            <SubtitleOverlay onWordClick={handleWordClick} />
            <PlayerControls />
          </div>

          {/* Word popup — z-55 to sit above PlayerControls (z-50) */}
          {selectedWord && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute z-[55] bg-[#1e293b] border border-primary/30 rounded-2xl p-4 w-72 shadow-xl"
              style={{ left: selectedWord.position.x, top: selectedWord.position.y }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-lg font-black text-primary"
                  style={{ fontFamily: 'Noto Sans KR, sans-serif' }}
                >
                  {selectedWord.word}
                </span>
                <button onClick={(e) => { e.stopPropagation(); handleCloseWordPopup(); }} className="text-slate-400 hover:text-white">×</button>
              </div>

              {selectedWord.isLoading ? (
                <div className="flex items-center justify-center py-3">
                  <Spin size="small" />
                </div>
              ) : selectedWord.meaning ? (
                <div className="space-y-2 mb-3">
                  {selectedWord.romanization && (
                    <p className="text-gray-400 text-xs italic">{selectedWord.romanization}</p>
                  )}
                  <p className="text-yellow-300 font-medium text-sm">{selectedWord.meaning}</p>
                  {selectedWord.partOfSpeech && (
                    <p className="text-gray-500 text-xs capitalize">{selectedWord.partOfSpeech}</p>
                  )}
                  {selectedWord.example && (
                    <div className="pt-1 border-t border-white/10">
                      <p className="text-white text-xs" style={{ fontFamily: 'Noto Sans KR, sans-serif' }}>
                        &ldquo;{selectedWord.example}&rdquo;
                      </p>
                      {selectedWord.exampleTranslation && (
                        <p className="text-gray-500 text-xs">{selectedWord.exampleTranslation}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                currentSegment && (
                  <p className="text-sm text-slate-300 mb-3">{currentSegment.translation}</p>
                )
              )}
              <Button
                size="small"
                type="primary"
                loading={savingWord}
                onClick={handleSaveWord}
              >
                Lưu vào Flashcard
              </Button>
            </motion.div>
          )}

          {/* Video info */}
          {video && (
            <div className="px-4 py-3 bg-[#111827] border-t border-white/5 flex-shrink-0">
              <Title level={5} className="!text-white !mb-1">{video.title}</Title>
              <Text className="text-slate-400 text-xs">{video.channelName}</Text>
              {stats && (
                <div className="flex gap-2 mt-1">
                  <span className="text-[10px] text-slate-500">Xem {stats.watchCount}x</span>
                  <span className="text-[10px] text-slate-500">·</span>
                  <span className="text-[10px] text-slate-500">{Math.round(stats.completionRate || 0)}% hoan thanh</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar — AI Vocabulary Panel */}
        <aside className="w-80 flex-shrink-0 hidden md:flex flex-col">
          {/* Chapters */}
          {video?.chapters && video.chapters.length > 0 && (
            <div className="p-4 border-b border-dark-200 bg-dark-300">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-3">Chương</p>
              {video.chapters.map((chapter, index) => (
                <button
                  key={index}
                  onClick={() => usePlayerStore.getState().seek(chapter.startTime)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 text-left mb-1 transition-colors"
                >
                  <span className="text-xs text-slate-500 font-mono">
                    {Math.floor(chapter.startTime / 60)}:{(chapter.startTime % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="text-xs text-white">{chapter.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* AI Vocabulary Panel */}
          <div className="flex-1 min-h-0">
            <VocabularyPanel
              videoId={videoId}
              videoTitle={video?.title ?? ''}
              savedVocabItems={savedVocabItems}
              initialWords={vocabWords.map((w: any) => ({
                id: w.id,
                word: w.word,
                meaning: w.meaning ?? '',
                romanization: w.pronunciation ?? '',
                partOfSpeech: w.partOfSpeech,
                difficulty: w.difficulty,
                example: w.exampleSentence,
                exampleTranslation: '',
                frequency: w.frequency,
              }))}
              onWordDelete={handleWordDelete}
              onCreateFlashcards={handleCreateFlashcards}
            />
          </div>
        </aside>
      </div>

      {/* Subtitle Settings Panel */}
      <SubtitleSettingsPanel isOpen={settingsOpen} onClose={closeSettings} />

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#1e293b] border border-white/10 rounded-2xl p-6 w-80"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">Phím tắt</h3>
            {shortcuts.map((shortcut, index) => (
              <div key={index} className="flex justify-between py-2 border-b border-white/5">
                <span className="text-slate-300 text-sm">{shortcut.action}</span>
                <kbd className="text-xs bg-white/10 px-2 py-0.5 rounded text-white font-mono">{shortcut.key}</kbd>
              </div>
            ))}
            <Button block className="mt-4" onClick={() => setShowShortcuts(false)}>Đóng</Button>
          </motion.div>
        </div>
      )}

      {/* AI Subtitle Generation Modal — full progress UI */}
      <SubtitleGenerationModal
        open={showSubtitleModal}
        videoId={videoId}
        videoTitle={video?.title}
        videoThumbnail={video?.thumbnail}
        onClose={handleCloseSubtitleModal}
        onSubtitleReady={handleSubtitleReady}
        onSubtitleError={handleSubtitleError}
      />

      {/* Vocabulary Drawer */}
      <Drawer
        title={<span className="text-white font-bold">Từ vựng của bạn</span>}
        placement="right"
        onClose={() => setVocabDrawerOpen(false)}
        open={vocabDrawerOpen}
        width={400}
        styles={{
          body: { background: '#151c2a', padding: 0 },
          header: { background: '#151c2a', borderBottom: '1px solid rgba(255,255,255,0.1)' },
        }}
      >
        {vocabItems.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-slate-400">Chưa có từ nào được lưu</p>
            <p className="text-xs text-slate-500 mt-2">Click vào từ Hàn trong phụ đề khi xem video để lưu</p>
          </div>
        ) : (
          vocabItems.map((item) => (
            <div key={item.id} className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-primary">{item.word}</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary">{item.masteryLevel}</span>
              </div>
              <p className="text-sm text-slate-300 mt-1">{item.meaning}</p>
              {item.reading && <p className="text-xs text-slate-500 mt-0.5">{item.reading}</p>}
              <p className="text-xs text-slate-500 mt-2 italic">&ldquo;{item.context}&rdquo;</p>

              {/* Add to Flashcard buttons */}
              {flashcardDecks.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {flashcardDecks.map((deck) => (
                    <Button
                      key={deck.id}
                      size="small"
                      loading={addingToFlashcard === item.id}
                      onClick={() => handleAddToFlashcard(item, deck.id)}
                      className="!text-xs !px-2 !py-0.5 !h-auto"
                    >
                      + {deck.name}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </Drawer>

      {/* Flashcard Create Modal */}
      <FlashcardCreateModal
        open={flashcardModalOpen}
        videoId={videoId}
        videoTitle={video?.title ?? ''}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        words={(() => {
          const all: any[] = [
            ...savedVocabItems,
            ...vocabWords.map((w: any) => ({
              id: w.id,
              word: w.word,
              meaning: w.meaning ?? '',
              vietnameseMeaning: w.translation ?? w.vietnameseMeaning ?? '',
              romanization: w.pronunciation ?? '',
              example: w.exampleSentence,
              exampleTranslation: w.exampleTranslation ?? '',
            })),
          ];
          const seen = new Set<string>();
          return all.filter((w: any) => {
            if (seen.has(w.word)) return false;
            seen.add(w.word);
            return true;
          });
        })()}
        onClose={() => setFlashcardModalOpen(false)}
        onCreated={() => setFlashcardModalOpen(false)}
      />
    </div>
  );
}
