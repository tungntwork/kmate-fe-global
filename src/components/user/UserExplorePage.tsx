'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Spin, Input, Select, message } from 'antd';
import {
  PlayCircleOutlined,
  PlusOutlined,
  LeftOutlined,
  RightOutlined,
  DollarOutlined,
  FireOutlined,
  ClockCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import {
  videoService,
  type VideoSearchResult,
} from '@/lib/api-services';
import { userService } from '@/lib/api-services';

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatViewCount(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M lượt xem`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k lượt xem`;
  return `${count} lượt xem`;
}

function extractYouTubeId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^[a-zA-Z0-9_-]{11}$/,
  ];
  for (const p of patterns) {
    const m = input.trim().match(p);
    if (m) return m[1];
  }
  return null;
}

const LEVEL_MAP: Record<string, string> = {
  beginner: 'Sơ cấp',
  intermediate: 'Trung cấp',
  advanced: 'Cao cấp',
  ko: 'Ngôn ngữ: Hàn',
  en: 'Ngôn ngữ: Anh',
};

export default function UserExplorePage() {
  const router = useRouter();
  const [featured, setFeatured] = useState<VideoSearchResult[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [trending, setTrending] = useState<VideoSearchResult[]>([]);
  const [searchResults, setSearchResults] = useState<VideoSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('korean learning');
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [totalVideosWatched, setTotalVideosWatched] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toastTimerRef = useRef<any>(null);

  const loadTrending = useCallback(() => {
    setLoadingTrending(true);
    videoService.discoverTrending({ limit: 12 })
      .then((r) => setTrending(r.data.data.videos))
      .catch(() => { message.error('Khong the tai danh sach xu huong'); })
      .finally(() => setLoadingTrending(false));
  }, []);

  useEffect(() => {
    // Load featured / trending carousel
    videoService.discoverTrending({ limit: 5 })
      .then((r) => {
        setFeatured(r.data.data.videos);
        setTrending(r.data.data.videos);
      })
      .catch(() => { message.error('Khong the tai video noi bat'); })
      .finally(() => setLoadingFeatured(false));

    loadTrending();

    // Load user stats for quick stats bar
    userService.getStatistics()
      .then((r) => {
        setTotalVideosWatched(r.data.data.totalVideosWatched);
        setTotalMinutes(r.data.data.totalMinutesLearned);
      })
      .catch(() => {});

    // Initial search with loading toast
    const msgKey = message.loading({ content: 'Đang tải video...', duration: 0, key: 'explore-load' });
    videoService.discoverSearch({ q: 'korean learning', limit: 8 })
      .then((r) => {
        setSearchResults(r.data.data.videos);
        message.success({ content: 'Đã tải xong!', key: 'explore-load' });
      })
      .catch(() => { message.error({ content: 'Lỗi tải video', key: 'explore-load' }); })
      .finally(() => {
        setLoadingSearch(false);
        // Ensure toast is dismissed when component unmounts
        toastTimerRef.current = window.setTimeout(() => message.destroy('explore-load'), 100) as unknown as ReturnType<typeof window.setTimeout>;
      });
    return () => {
      message.destroy('explore-load');
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [loadTrending]);

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) return;

    // If input is a YouTube URL or bare ID, navigate directly to player
    const ytId = extractYouTubeId(q);
    if (ytId) {
      router.push(`/learn/${ytId}`);
      return;
    }

    // Otherwise do normal text search
    setLoadingSearch(true);
    const key = message.loading({ content: 'Dang tim kiem...', duration: 0, key: 'search-load' });
    videoService.discoverSearch({ q, limit: 8 })
      .then((r) => {
        setSearchResults(r.data.data.videos);
        message.success({ content: `Tim thay ${r.data.data.videos.length} video!`, key: 'search-load' });
      })
      .catch(() => { message.error({ content: 'Loi tim kiem', key: 'search-load' }); })
      .finally(() => setLoadingSearch(false));
  };

  const handleVideoClick = (video: VideoSearchResult) => {
    // Dismiss any pending toasts before navigating
    message.destroy('explore-load');
    message.destroy('search-load');
    router.push(`/learn/${video.youtubeId}`);
  };

  const slide = featured[currentSlide];

  return (
    <div className="min-h-screen">
      <main className="pb-12 px-6 lg:px-10">
        {/* Search Bar */}
        <section className="mb-8 pt-4 max-w-2xl">
          <Input.Search
            size="large"
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Tìm kiếm hoặc dán link YouTube... (VD: https://youtube.com/watch?v=...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onSearch={(value) => handleSearch(value)}
            enterButton={<SearchOutlined className="!text-background-dark" />}
            className="[&_.ant-input-group-addon]:!bg-primary [&_.ant-input-group-addon]:!border-primary [&_.ant-input-group-addon]:!rounded-2xl [&_.ant-input]:!bg-white/5 [&_.ant-input]:!border-white/10 [&_.ant-input]:!text-white [&_.ant-input]:!rounded-2xl [&_.ant-input]:!py-3 [&_.ant-input]:!px-4 [&_.ant-input::placeholder]:!text-slate-500 [&_.ant-input-group]:!rounded-2xl"
          />
        </section>

        {/* Featured Carousel */}
        {!loadingFeatured && featured.length > 0 ? (
          <section className="mb-12">
            <div className="flex items-end justify-between mb-6">
              <div>
                <h2 className="text-3xl lg:text-4xl font-black text-white mb-2 tracking-tight">
                  Khám phá video học tiếng Hàn
                </h2>
                <p className="text-slate-400 text-sm">
                  Học tiếng Hàn qua phim, nhạc, văn hóa và cuộc sống thường nhật
                </p>
              </div>
              <div className="hidden lg:flex items-center gap-2">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  {currentSlide + 1} / {featured.length}
                </span>
              </div>
            </div>

            {/* Hero Banner */}
            <div className="relative rounded-3xl overflow-hidden h-[460px] lg:h-[520px]">
              {slide ? (
                <>
                  <img
                    alt={slide.title}
                    src={slide.thumbnail}
                    className="absolute inset-0 w-full h-full object-cover transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-8 lg:p-12">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 rounded-lg bg-primary/90 text-background-dark text-[10px] font-black uppercase tracking-wider">
                        {LEVEL_MAP[slide.language] ?? slide.language ?? 'Korean'}
                      </span>
                      {slide.hasSubtitles && (
                        <span className="px-3 py-1 rounded-lg bg-secondary/90 text-white text-[10px] font-black uppercase tracking-wider">
                          Phụ đề
                        </span>
                      )}
                    </div>
                    <h3 className="text-3xl lg:text-5xl font-black text-white mb-4 leading-tight line-clamp-2">
                      {slide.title}
                    </h3>
                    <p className="text-slate-300 text-base lg:text-lg mb-6 lg:mb-8 line-clamp-2">
                      {slide.description || slide.channelTitle}
                    </p>
                    <div className="flex items-center gap-6 mb-6 lg:mb-8 flex-wrap">
                      <div className="flex items-center gap-2">
                        <ClockCircleOutlined style={{ color: '#00e5ff', fontSize: 20 }} />
                        <span className="text-sm text-slate-300">{formatDuration(slide.duration)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-300">{formatViewCount(slide.viewCount)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-300">{slide.channelTitle}</span>
                      </div>
                    </div>
                    <div className="flex gap-4 flex-wrap">
                      <button
                        onClick={() => handleVideoClick(slide)}
                        className="bg-primary hover:bg-primary/90 text-background-dark font-bold px-6 lg:px-8 py-3 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
                      >
                        <PlayCircleOutlined style={{ fontSize: 20 }} />
                        Xem Ngay
                      </button>
                      <button className="glass hover:bg-white/10 text-white font-bold px-6 lg:px-8 py-3 rounded-xl flex items-center gap-2 transition-all">
                        <PlusOutlined style={{ fontSize: 18 }} />
                        Lưu Danh Sách
                      </button>
                    </div>
                  </div>

                  {/* Navigation arrows */}
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev - 1 + featured.length) % featured.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <LeftOutlined style={{ color: 'white', fontSize: 16 }} />
                  </button>
                  <button
                    onClick={() => setCurrentSlide((prev) => (prev + 1) % featured.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <RightOutlined style={{ color: 'white', fontSize: 16 }} />
                  </button>

                  {/* Dot indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
                    {featured.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setCurrentSlide(i)}
                        className={`rounded-full transition-all cursor-pointer ${
                          i === currentSlide ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-white/40 hover:bg-white/60'
                        }`}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Spin />
                </div>
              )}
            </div>
          </section>
        ) : loadingFeatured ? (
          <div className="flex items-center justify-center h-64 mb-12">
            <Spin size="large" />
          </div>
        ) : null}

        {/* Filter Bar */}
        <section className="mb-8 flex flex-wrap items-center gap-4">
          <Select
            placeholder="Ngôn ngữ"
            allowClear
            className="!min-w-[150px]"
            popupClassName="!bg-dark-400 !border !border-white/10"
            options={[
              { value: 'any', label: 'Tất cả' },
              { value: 'ko', label: 'Tiếng Hàn' },
              { value: 'en', label: 'Tiếng Anh' },
            ]}
            onChange={(val) => {
              if (val) {
                videoService.discoverSearch({ q: searchQuery || 'korean learning', language: val, limit: 8 })
                  .then((r) => setSearchResults(r.data.data.videos))
                  .catch(() => {});
              }
            }}
          />
          <Select
            placeholder="Thời lượng"
            allowClear
            className="!min-w-[150px]"
            popupClassName="!bg-dark-400 !border !border-white/10"
            options={[
              { value: 'any', label: 'Tất cả' },
              { value: 'short', label: 'Ngắn (< 4 phút)' },
              { value: 'medium', label: 'Trung bình (4-20 phút)' },
              { value: 'long', label: 'Dài (> 20 phút)' },
            ]}
            onChange={(val) => {
              if (val) {
                videoService.discoverSearch({ q: searchQuery || 'korean learning', duration: val, limit: 8 })
                  .then((r) => setSearchResults(r.data.data.videos))
                  .catch(() => {});
              }
            }}
          />
          <Select
            placeholder="Phụ đề"
            allowClear
            className="!min-w-[130px]"
            popupClassName="!bg-dark-400 !border !border-white/10"
            options={[
              { value: 'any', label: 'Tất cả' },
              { value: 'subtitled', label: 'Có phụ đề' },
              { value: 'korean_sub', label: 'Phụ đề Hàn' },
            ]}
            onChange={(val) => {
              if (val) {
                videoService.discoverSearch({ q: searchQuery || 'korean learning', subtitleFilter: val, limit: 8 })
                  .then((r) => setSearchResults(r.data.data.videos))
                  .catch(() => {});
              }
            }}
          />
          <button
            onClick={loadTrending}
            className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-xs font-bold border border-white/10 hover:bg-white/10 hover:text-white transition-all"
          >
            Tải lại xu hướng
          </button>
        </section>

        {/* Video Grid */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-black text-white">Kết quả tìm kiếm</h3>
            <span className="text-sm text-slate-500">{searchResults.length} video</span>
          </div>
          {loadingSearch ? (
            <div className="flex items-center justify-center py-12">
              <Spin size="large" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {searchResults.map((video) => (
                <div
                  key={video.youtubeId}
                  className="group cursor-pointer"
                  onClick={() => handleVideoClick(video)}
                >
                  <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 border border-white/5">
                    <img
                      alt={video.title}
                      src={video.thumbnail}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                    <div className="absolute top-2 right-2 bg-primary/90 text-background-dark font-black text-[10px] px-2 py-0.5 rounded uppercase">
                      {video.isKoreanVideo ? '🇰🇷 Hàn' : LEVEL_MAP[video.language] ?? video.language ?? 'Video'}
                    </div>
                    <div className="absolute bottom-2 right-2 glass text-white text-[10px] px-2 py-0.5 rounded font-bold">
                      {formatDuration(video.duration)}
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/40">
                        <PlayCircleOutlined style={{ color: '#0B0B0F', fontSize: 28 }} />
                      </div>
                    </div>
                  </div>
                  <h4 className="text-white font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2 text-sm">
                    {video.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-slate-400">{video.channelTitle}</span>
                    <span className="text-[10px] text-slate-500">•</span>
                    <span className="text-[10px] text-slate-500">{formatViewCount(video.viewCount)}</span>
                  </div>
                  {video.hasSubtitles && (
                    <span className="text-[10px] text-primary mt-1 inline-block">📝 Có phụ đề</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="user-glass-card p-8 text-center">
              <p className="text-slate-400">Không tìm thấy video nào. Thử từ khóa khác.</p>
            </div>
          )}
        </section>

        {/* Trending Section */}
        {!loadingTrending && trending.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-orange-400 to-red-500 rounded-full" />
                <h3 className="text-2xl font-black text-white">Xu hướng tuần này</h3>
              </div>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
              {trending.map((video) => (
                <div
                  key={video.youtubeId}
                  className="min-w-[280px] group cursor-pointer shrink-0"
                  onClick={() => handleVideoClick(video)}
                >
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-3">
                    <img
                      alt={video.title}
                      src={video.thumbnail}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-all" />
                    <div className="absolute bottom-3 left-3 flex items-center gap-2">
                      <span className="px-2 py-1 rounded-lg bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase">
                        {video.language === 'ko' ? '🇰🇷 Hàn' : '🌐 Phổ biến'}
                      </span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                        <PlayCircleOutlined style={{ color: '#0B0B0F', fontSize: 22 }} />
                      </div>
                    </div>
                  </div>
                  <h4 className="text-white font-bold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {video.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">{formatViewCount(video.viewCount)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Quick Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {[
            { icon: <PlayCircleOutlined />, label: 'Video đã học', value: totalVideosWatched },
            { icon: <ClockCircleOutlined />, label: 'Phút học', value: totalMinutes },
            { icon: <FireOutlined />, label: 'Ngày streak', value: '—' },
            { icon: <DollarOutlined />, label: 'Xu', value: '—' },
          ].map((stat, i) => (
            <div key={i} className="glass p-6 rounded-2xl flex flex-col items-center gap-3 text-center">
              <span style={{ color: '#00e5ff' }} className="text-3xl">{stat.icon}</span>
              <span className="text-3xl font-black text-white">{stat.value}</span>
              <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
