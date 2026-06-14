'use client';

import { useState, useEffect } from 'react';
import { Button, Input, Select, Spin, message } from 'antd';
import { VideoCameraOutlined, CheckOutlined, ArrowLeftOutlined, ArrowRightOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { videoService, flashcardService, subtitleService, type FlashcardDeck } from '@/lib/api-services';
import { useRouter } from 'next/navigation';

// ── Types ────────────────────────────────────────────────────────────────────

interface WatchedVideo {
  videoId: string;
  youtubeId: string;
  title: string;
  thumbnailUrl: string;
  duration: number;
  progress: number;
  status: string;
  lastWatchedAt: string;
  watchCount: number;
}

interface SubtitleSegment {
  id: string;
  startTime: number;
  endTime: number;
  text: string;
}

interface BilingualSegment {
  id: string;
  startTime: number;
  endTime: number;
  korean: string;
  vietnamese: string;
}

interface SelectedCard {
  koText: string;
  viText: string;
  word: string;
  meaning: string;
  exampleSentence: string;
  exampleTranslation: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Extract a short "word" from Korean text — take first non-punctuation word
function extractWord(koText: string): string {
  return koText.replace(/[.,!?~^♡★✦▶▶\s]/g, '').trim().split(/\s+/)[0] ?? koText;
}

// ── Step 1: Video Grid ───────────────────────────────────────────────────────

function VideoGridStep({ onSelect }: { onSelect: (video: WatchedVideo) => void }) {
  const [videos, setVideos] = useState<WatchedVideo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    videoService.getWatchedVideos({ limit: 50 })
      .then(r => setVideos(r.data.data.videos))
      .catch(() => message.error('Không thể tải danh sách video'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-20">
      <Spin size="large" />
    </div>
  );

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <VideoCameraOutlined style={{ fontSize: 64, color: '#7C4DFF', opacity: 0.5 }} />
        <div>
          <p className="text-white font-bold text-lg">Bạn chưa xem video nào</p>
          <p className="text-slate-400 text-sm mt-2">Hãy xem video để có thể tạo flashcard từ phụ đề</p>
        </div>
        <Button type="primary" onClick={() => window.location.href = '/user/explore'}>
          Khám phá video
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <h2 className="text-xl font-bold text-white">Video đã xem</h2>
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-slate-500 text-sm">{videos.length} video</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos.map(video => (
          <button
            key={video.videoId}
            onClick={() => onSelect(video)}
            className="user-glass-card p-3 text-left hover:border-primary/60 transition-all group cursor-pointer"
          >
            {/* Thumbnail */}
            <div className="relative rounded-xl overflow-hidden mb-3 aspect-video bg-black/50">
              {video.youtubeId ? (
                <img
                  src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
                  alt={video.title}
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <VideoCameraOutlined style={{ fontSize: 32, color: '#7C4DFF' }} />
                </div>
              )}
              {/* Duration badge */}
              <div className="absolute bottom-1 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                {formatDuration(video.duration)}
              </div>
              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <PlayCircleOutlined style={{ fontSize: 40, color: 'white' }} />
              </div>
            </div>

            {/* Title */}
            <p className="text-white text-sm font-medium line-clamp-2 leading-snug mb-2">
              {video.title}
            </p>

            {/* Progress bar */}
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${Math.min(video.progress, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-slate-500 text-xs">
                {Math.round(video.progress)}% đã xem
              </span>
              <span className="text-slate-500 text-xs">
                {new Date(video.lastWatchedAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 2: Subtitle Picker ───────────────────────────────────────────────────

function SubtitlePickerStep({
  video,
  onNext,
  onBack,
}: {
  video: WatchedVideo;
  onNext: (selected: SelectedCard[]) => void;
  onBack: () => void;
}) {
  const [koSegments, setKoSegments] = useState<SubtitleSegment[]>([]);
  const [biSegments, setBiSegments] = useState<BilingualSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    subtitleService.getSubtitles(video.videoId)
      .then(r => {
        const subs = r.data.data.subtitles as Array<{
          language: string;
          subtitleContent: unknown;
          bilingualContent: unknown;
        }>;

        const koSub = subs.find(s => s.language === 'ko');
        if (koSub?.subtitleContent) {
          setKoSegments(koSub.subtitleContent as SubtitleSegment[]);
        }

        const biSub = subs.find(s => s.bilingualContent);
        if (biSub?.bilingualContent) {
          setBiSegments(biSub.bilingualContent as BilingualSegment[]);
        }
      })
      .catch(() => setError('Không thể tải phụ đề. Video có thể chưa có phụ đề.'))
      .finally(() => setLoading(false));
  }, [video.videoId]);

  const biMap = new Map(biSegments.map(s => [s.startTime, s]));

  const toggleSegment = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNext = () => {
    const selected: SelectedCard[] = [];

    for (const seg of koSegments) {
      if (!selectedIds.has(seg.id)) continue;
      const bi = biMap.get(seg.startTime);

      selected.push({
        koText: seg.text,
        viText: bi?.vietnamese ?? '',
        word: extractWord(seg.text),
        meaning: bi?.vietnamese ?? '',
        exampleSentence: seg.text,
        exampleTranslation: bi?.vietnamese ?? '',
      });
    }

    if (selected.length === 0) {
      message.warning('Vui lòng chọn ít nhất một câu');
      return;
    }

    onNext(selected);
  };

  if (loading) return (
    <div className="flex justify-center py-20">
      <Spin size="large" />
    </div>
  );

  if (error) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <p className="text-red-400">{error}</p>
        <Button onClick={onBack}>
          <ArrowLeftOutlined /> Quay lại
        </Button>
      </div>
    );
  }

  if (koSegments.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-20 text-center">
        <p className="text-slate-400">Video này chưa có phụ đề. Hãy chọn video khác.</p>
        <Button onClick={onBack}>
          <ArrowLeftOutlined /> Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeftOutlined />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">{video.title}</h2>
          <p className="text-slate-500 text-xs mt-0.5">Chọn các câu để tạo flashcard</p>
        </div>
        <span className="text-slate-500 text-sm">{selectedIds.size} đã chọn</span>
      </div>

      {/* Bulk actions */}
      <div className="flex gap-2">
        <button
          onClick={() => setSelectedIds(new Set(koSegments.map(s => s.id)))}
          className="text-xs text-primary hover:text-primary-400 transition-colors"
        >
          Chọn tất cả
        </button>
        <button
          onClick={() => setSelectedIds(new Set())}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          Bỏ chọn
        </button>
      </div>

      {/* Subtitle list */}
      <div className="space-y-1 max-h-[50vh] overflow-y-auto pr-1">
        {koSegments.map((seg, idx) => {
          const bi = biMap.get(seg.startTime);
          const isSelected = selectedIds.has(seg.id);

          return (
            <button
              key={seg.id}
              onClick={() => toggleSegment(seg.id)}
              className={`w-full text-left p-3 rounded-xl transition-all group ${
                isSelected
                  ? 'bg-primary/15 border border-primary/50'
                  : 'bg-white/3 hover:bg-white/6 border border-transparent'
              }`}
            >
              <div className="flex gap-3">
                {/* Checkbox */}
                <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 transition-all ${
                  isSelected ? 'bg-primary text-white' : 'bg-white/10 text-transparent group-hover:bg-white/20'
                }`}>
                  <CheckOutlined style={{ fontSize: 12 }} />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Time */}
                  <div className="text-slate-600 text-xs mb-1 font-mono">
                    [{formatTime(seg.startTime)}]
                  </div>

                  {/* Korean text */}
                  <p className="text-white text-sm leading-relaxed font-medium" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>
                    {seg.text}
                  </p>

                  {/* Vietnamese translation */}
                  {bi?.vietnamese && (
                    <p className="text-slate-400 text-sm leading-relaxed mt-1">
                      {bi.vietnamese}
                    </p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <div className="sticky bottom-0 pt-4 pb-2 bg-gradient-to-t from-[#0B0B0F] to-transparent">
        <Button
          type="primary"
          block
          size="large"
          disabled={selectedIds.size === 0}
          onClick={handleNext}
          className="!font-bold !rounded-xl !h-12"
        >
          Tiếp tục ({selectedIds.size} câu)
          <ArrowRightOutlined />
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: Card Editor ──────────────────────────────────────────────────────

function CardEditorStep({
  video,
  selectedCards,
  onBack,
  onComplete,
}: {
  video: WatchedVideo;
  selectedCards: SelectedCard[];
  onBack: () => void;
  onComplete: () => void;
}) {
  const [cards, setCards] = useState<SelectedCard[]>(selectedCards);
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [newDeckName, setNewDeckName] = useState('');
  const [createMode, setCreateMode] = useState<'new' | 'existing'>('new');
  const [loading, setLoading] = useState(false);
  const [loadingDecks, setLoadingDecks] = useState(true);

  useEffect(() => {
    flashcardService.getDecks()
      .then(r => {
        setDecks(r.data.data);
        if (r.data.data.length > 0) {
          setSelectedDeckId(r.data.data[0].id);
        }
      })
      .finally(() => setLoadingDecks(false));
  }, []);

  const updateCard = (idx: number, field: keyof SelectedCard, value: string) => {
    setCards(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  const handleSave = async () => {
    if (createMode === 'existing' && !selectedDeckId) {
      message.warning('Vui lòng chọn một bộ thẻ');
      return;
    }
    if (createMode === 'new' && !newDeckName.trim()) {
      message.warning('Vui lòng nhập tên bộ thẻ mới');
      return;
    }

    setLoading(true);
    try {
      let deckId = selectedDeckId;

      if (createMode === 'new') {
        const newDeck = await flashcardService.createDeck({ name: newDeckName.trim() });
        deckId = newDeck.data.data.id;
      }

      for (const card of cards) {
        await flashcardService.createFlashcard({
          word: card.word,
          meaning: card.meaning,
          exampleSentence: card.exampleSentence,
          exampleTranslation: card.exampleTranslation,
          deckId: deckId!,
          videoId: video.videoId,
        });
      }

      message.success(`Đã lưu ${cards.length} thẻ thành công!`);
      onComplete();
    } catch {
      message.error('Lỗi khi lưu thẻ. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
          <ArrowLeftOutlined />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-white">Tạo thẻ từ video</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Chỉnh sửa nội dung từng thẻ — từ đã được trích xuất tự động
          </p>
        </div>
      </div>

      {/* Deck selector */}
      <div className="user-glass-card p-4 space-y-3">
        <p className="text-slate-300 text-sm font-medium">Bộ thẻ</p>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setCreateMode('existing')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              createMode === 'existing'
                ? 'bg-primary text-white'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Chọn deck có sẵn
          </button>
          <button
            onClick={() => setCreateMode('new')}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
              createMode === 'new'
                ? 'bg-primary text-white'
                : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Tạo deck mới
          </button>
        </div>

        {loadingDecks ? (
          <Spin size="small" />
        ) : createMode === 'existing' ? (
          <Select
            value={selectedDeckId}
            onChange={setSelectedDeckId}
            className="kmate-dark-select !w-full"
            placeholder="Chọn bộ thẻ"
            size="large"
            options={decks.map(d => ({ value: d.id, label: d.name }))}
          />
        ) : (
          <Input
            value={newDeckName}
            onChange={e => setNewDeckName(e.target.value)}
            placeholder="Nhập tên bộ thẻ mới..."
            size="large"
            className="!bg-white/5 !border-white/20 !text-white !rounded-xl"
          />
        )}
      </div>

      {/* Card list */}
      <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
        {cards.map((card, idx) => (
          <div key={idx} className="user-glass-card p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-medium">Thẻ {idx + 1}</span>
            </div>

            {/* Word */}
            <div>
              <label className="text-slate-500 text-xs mb-1 block">Từ (mặt trước)</label>
              <Input
                value={card.word}
                onChange={e => updateCard(idx, 'word', e.target.value)}
                placeholder="Từ tiếng Hàn"
                className="!bg-white/5 !border-white/20 !text-white !rounded-xl !font-medium"
                style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
              />
            </div>

            {/* Meaning */}
            <div>
              <label className="text-slate-500 text-xs mb-1 block">Nghĩa (mặt sau)</label>
              <Input
                value={card.meaning}
                onChange={e => updateCard(idx, 'meaning', e.target.value)}
                placeholder="Nghĩa tiếng Việt"
                className="!bg-white/5 !border-white/20 !text-white !rounded-xl"
              />
            </div>

            {/* Example sentence */}
            <div>
              <label className="text-slate-500 text-xs mb-1 block">Câu ví dụ (KO)</label>
              <Input.TextArea
                value={card.exampleSentence}
                onChange={e => updateCard(idx, 'exampleSentence', e.target.value)}
                placeholder="Câu tiếng Hàn"
                rows={2}
                className="!bg-white/5 !border-white/20 !text-white !rounded-xl !resize-none"
                style={{ fontFamily: "'Noto Sans KR', sans-serif" }}
              />
            </div>

            {/* Example translation */}
            <div>
              <label className="text-slate-500 text-xs mb-1 block">Dịch câu ví dụ</label>
              <Input.TextArea
                value={card.exampleTranslation}
                onChange={e => updateCard(idx, 'exampleTranslation', e.target.value)}
                placeholder="Dịch câu ví dụ"
                rows={2}
                className="!bg-white/5 !border-white/20 !text-white !rounded-xl !resize-none"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Save CTA */}
      <Button
        type="primary"
        block
        size="large"
        loading={loading}
        onClick={handleSave}
        className="!font-bold !rounded-xl !h-12"
      >
        Lưu {cards.length} thẻ
      </Button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function CreateFromVideoView() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedVideo, setSelectedVideo] = useState<WatchedVideo | null>(null);
  const [selectedCards, setSelectedCards] = useState<SelectedCard[]>([]);
  const router = useRouter();

  const handleVideoSelect = (video: WatchedVideo) => {
    setSelectedVideo(video);
    setStep(2);
  };

  const handleSubtitlesNext = (cards: SelectedCard[]) => {
    setSelectedCards(cards);
    setStep(3);
  };

  const handleComplete = () => {
    setStep(1);
    setSelectedVideo(null);
    setSelectedCards([]);
    message.success('Đã tạo flashcard thành công!');
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
      setSelectedCards([]);
    } else if (step === 2) {
      setStep(1);
      setSelectedVideo(null);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { n: 1, label: 'Chọn video' },
          { n: 2, label: 'Chọn câu' },
          { n: 3, label: 'Tạo thẻ' },
        ].map(({ n, label }, i) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all ${
              step >= n
                ? 'bg-primary text-white'
                : 'bg-white/10 text-slate-500'
            }`}>
              {step > n ? <CheckOutlined style={{ fontSize: 12 }} /> : n}
            </div>
            <span className={`text-sm font-medium ${
              step >= n ? 'text-white' : 'text-slate-500'
            }`}>{label}</span>
            {i < 2 && (
              <div className={`h-px w-8 transition-all ${
                step > n ? 'bg-primary' : 'bg-white/10'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      {step === 1 && (
        <VideoGridStep onSelect={handleVideoSelect} />
      )}
      {step === 2 && selectedVideo && (
        <SubtitlePickerStep
          video={selectedVideo}
          onNext={handleSubtitlesNext}
          onBack={handleBack}
        />
      )}
      {step === 3 && selectedVideo && (
        <CardEditorStep
          video={selectedVideo}
          selectedCards={selectedCards}
          onBack={handleBack}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
