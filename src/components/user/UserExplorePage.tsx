'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Spin, Input } from "antd";
import { App } from 'antd';
import {
  PlayCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FireOutlined,
  SearchOutlined,
  HeartOutlined,
  HeartFilled,
  RightOutlined,
  LockOutlined,
} from '@ant-design/icons';
import {
  videoService,
  userService,
  type VideoSearchResult,
  type CoinUnlockedVideo,
} from '@/lib/api-services';
import { useAuthStore } from '@/store/auth.store';

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

const getThumbnail = (video: VideoSearchResult): string => {
  if (video.thumbnail && video.thumbnail.trim()) {
    return video.thumbnail;
  }
  if (video.youtubeId) {
    return `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`;
  }
  return 'https://i.ytimg.com/vi/empty/mqdefault.jpg';
};

// Strip trailing YouTube hashtag artifacts from titles (e.g. "PSY GANGNAM STYLE (Official MV) #??? #PSY")
function cleanTitle(title: string): string {
  if (!title) return 'Video không có tiêu đề';
  return title.replace(/\s+#[^\s#]+$/g, '').trim() || title;
}

const LEVEL_MAP: Record<string, string> = {
  beginner: 'Sơ cấp',
  intermediate: 'Trung cấp',
  advanced: 'Cao cấp',
  ko: 'Ngôn ngữ: Hàn',
  en: 'Ngôn ngữ: Anh',
};

// ── Reusable video card with optional heart button ──────────────────────────
interface VideoCardItemProps {
  video: VideoSearchResult;
  isFavorited?: boolean;
  onClick?: () => void;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  showFavoriteBtn?: boolean;
  badge?: string;
  badgeColor?: string;
  minWidth?: number;
  showDuration?: boolean;
  isGrid?: boolean;
}

function VideoCardItem({
  video,
  isFavorited = false,
  onClick,
  onToggleFavorite,
  showFavoriteBtn = false,
  badge,
  badgeColor = 'bg-primary/90',
  minWidth = 280,
  showDuration = false,
  isGrid = false,
}: VideoCardItemProps) {
  return (
    <div
      style={{ minWidth: isGrid ? undefined : minWidth, maxWidth: isGrid ? undefined : minWidth }}
      className={`group cursor-pointer flex flex-col ${isGrid ? '' : 'shrink-0'}`}
      onClick={onClick}
    >
      <div className="relative rounded-2xl overflow-hidden mb-3 shrink-0 bg-dark-300 aspect-[16/10]">
        <img
          alt={video.title}
          src={getThumbnail(video)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            const parts = img.src.split('/');
            parts.pop();
            parts.push('default.jpg');
            const fallback = parts.join('/');
            if (img.src !== fallback) img.src = fallback;
          }}
        />
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-all" />
        {badge && (
          <div className="absolute bottom-3 left-3">
            <span
              style={{ background: badge.startsWith('#') ? badge : undefined }}
              className={`px-2 py-1 rounded-lg text-white text-[10px] font-bold uppercase backdrop-blur-md ${!badge.startsWith('#') ? badgeColor : ''}`}
            >
              {badge}
            </span>
          </div>
        )}
        {showFavoriteBtn && (
          <button
            onClick={onToggleFavorite}
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors z-10"
          >
            {isFavorited
              ? <HeartFilled style={{ color: '#f43f5e', fontSize: 14 }} />
              : <HeartOutlined style={{ color: '#f43f5e', fontSize: 14 }} />}
          </button>
        )}
        {showDuration && (
          <div className="absolute bottom-2 right-2 glass text-white text-[10px] px-2 py-0.5 rounded font-bold">
            {formatDuration(video.duration)}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <PlayCircleOutlined style={{ color: '#0B0B0F', fontSize: 22 }} />
          </div>
        </div>
      </div>
      <div className="flex flex-col min-h-[3.5rem]">
        <h4
          title={video.title}
          className="text-white font-bold text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2"
        >
          {cleanTitle(video.title)}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-slate-500">{video.channelTitle}</span>
          <span className="text-[10px] text-slate-500">•</span>
          <span className="text-[10px] text-slate-500">{formatViewCount(video.viewCount)}</span>
        </div>
        {video.hasSubtitles && (
          <span className="text-[10px] text-primary mt-1">📝 Có phụ đề</span>
        )}
      </div>
    </div>
  );
}

export default function UserExplorePage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [kpopVideos, setKpopVideos] = useState<VideoSearchResult[]>([]);
  const [dramaClips, setDramaClips] = useState<VideoSearchResult[]>([]);
  const [beginnerVideos, setBeginnerVideos] = useState<VideoSearchResult[]>([]);
  const [searchResults, setSearchResults] = useState<VideoSearchResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('Kpop 2026');
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [totalVideosWatched, setTotalVideosWatched] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [coinBalance, setCoinBalance] = useState(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toastTimerRef = useRef<any>(null);
  const isAuth = useAuthStore((s) => s.isAuthenticated);

  const [coinUnlockedVideos, setCoinUnlockedVideos] = useState<CoinUnlockedVideo[]>([]);
  const [loadingCoinUnlocked, setLoadingCoinUnlocked] = useState(false);
  const [favoriteVideos, setFavoriteVideos] = useState<CoinUnlockedVideo[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Load predefined sections
    videoService.discoverSearch({ q: 'Kpop 2026', limit: 6 })
      .then((r) => setKpopVideos(r.data.data.videos))
      .catch(() => {});
    videoService.discoverSearch({ q: 'korean drama clips', limit: 6 })
      .then((r) => setDramaClips(r.data.data.videos))
      .catch(() => {});
    videoService.discoverSearch({ q: 'korean beginner', limit: 6 })
      .then((r) => setBeginnerVideos(r.data.data.videos))
      .catch(() => {});

    // Load user stats for quick stats bar
    userService.getStatistics()
      .then((r) => {
        setTotalVideosWatched(r.data.data.totalVideosWatched);
        setTotalMinutes(r.data.data.totalMinutesLearned);
        setStreak(r.data.data.currentStreak ?? 0);
        setCoinBalance(r.data.data.currentCoinBalance ?? 0);
      })
      .catch(() => {});

    // Load coin-unlocked videos (authenticated)
    if (isAuth) {
      setLoadingCoinUnlocked(true);
      videoService.getCoinUnlockedVideos({ limit: 10 })
        .then((r) => setCoinUnlockedVideos(r.data.data.videos))
        .catch(() => {})
        .finally(() => setLoadingCoinUnlocked(false));

      setLoadingFavorites(true);
      videoService.getFavorites({ limit: 10 })
        .then((r) => {
          setFavoriteVideos(r.data.data.videos);
          setFavoriteIds(new Set(r.data.data.videos.map((v) => v.youtubeId)));
        })
        .catch(() => {})
        .finally(() => setLoadingFavorites(false));
    }

    // Initial search — delay error toast to 15s so fast responses never show it
    const msgKey = message.loading({ content: 'Đang tải video...', duration: 0, key: 'explore-load' });
    const errorTimer = window.setTimeout(() => {
      message.error({ content: 'Không thể tải video', key: 'explore-load' });
    }, 15000);
    videoService.discoverSearch({ q: 'Kpop 2026', limit: 10 })
      .then((r) => {
        clearTimeout(errorTimer);
        setSearchResults(r.data.data.videos);
        message.success({ content: 'Đã tải xong!', key: 'explore-load' });
      })
      .catch(() => {
        clearTimeout(errorTimer);
      })
      .finally(() => {
        setLoadingSearch(false);
        toastTimerRef.current = window.setTimeout(() => message.destroy('explore-load'), 100) as unknown as ReturnType<typeof window.setTimeout>;
      });
    return () => {
      message.destroy('explore-load');
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [isAuth]);

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
    videoService.discoverSearch({ q, limit: 10 })
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

  const handleCoinVideoClick = (video: CoinUnlockedVideo) => {
    message.destroy('explore-load');
    message.destroy('search-load');
    router.push(`/learn/${video.youtubeId}`);
  };

  const handleToggleFavoriteByYtId = async (ytId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuth) {
      message.warning({ content: 'Vui lòng đăng nhập để thêm yêu thích' });
      return;
    }
    const wasFavorited = favoriteIds.has(ytId);
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFavorited) next.delete(ytId);
      else next.add(ytId);
      return next;
    });
    // Keep favoriteVideos in sync (remove on un-favorite)
    if (wasFavorited) {
      setFavoriteVideos((prev) => prev.filter((v) => v.youtubeId !== ytId));
    }
    try {
      await videoService.toggleFavorite(ytId);
    } catch {
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorited) next.add(ytId);
        else next.delete(ytId);
        return next;
      });
      if (wasFavorited) {
        // Re-add to favoriteVideos — fetch is expensive so skip it on error
      }
      message.error({ content: 'Không thể cập nhật yêu thích' });
    }
  };

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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {searchResults.slice(0, 10).map((video) => (
                <VideoCardItem
                  key={video.youtubeId}
                  video={video}
                  isGrid
                  badge={video.isKoreanVideo ? '🇰🇷 Hàn' : LEVEL_MAP[video.language] ?? video.language ?? 'Video'}
                  badgeColor="bg-primary/90"
                  onClick={() => handleVideoClick(video)}
                  showFavoriteBtn={isAuth}
                  isFavorited={favoriteIds.has(video.youtubeId)}
                  onToggleFavorite={(e) => handleToggleFavoriteByYtId(video.youtubeId, e)}
                  showDuration
                />
              ))}
            </div>
          ) : (
            <div className="user-glass-card p-8 text-center">
              <p className="text-slate-400">Không tìm thấy video nào. Thử từ khóa khác.</p>
            </div>
          )}
        </section>

        {/* KPOP Videos Section */}
        {kpopVideos.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-pink-400 to-rose-500 rounded-full" />
                <h3 className="text-2xl font-black text-white">Các video Kpop nổi bật</h3>
              </div>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
              {kpopVideos.map((video) => (
                <VideoCardItem
                  key={video.youtubeId}
                  video={video}
                  badge="Kpop"
                  badgeColor="bg-white/20"
                  onClick={() => handleVideoClick(video)}
                  showFavoriteBtn={isAuth}
                  isFavorited={favoriteIds.has(video.youtubeId)}
                  onToggleFavorite={(e) => handleToggleFavoriteByYtId(video.youtubeId, e)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Drama Clips Section */}
        {dramaClips.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-red-400 to-orange-500 rounded-full" />
                <h3 className="text-2xl font-black text-white">Các đoạn cắt phim hàn nổi tiếng</h3>
              </div>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
              {dramaClips.map((video) => (
                <VideoCardItem
                  key={video.youtubeId}
                  video={video}
                  badge="Drama"
                  badgeColor="bg-white/20"
                  onClick={() => handleVideoClick(video)}
                  showFavoriteBtn={isAuth}
                  isFavorited={favoriteIds.has(video.youtubeId)}
                  onToggleFavorite={(e) => handleToggleFavoriteByYtId(video.youtubeId, e)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Beginner Section */}
        {beginnerVideos.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-green-400 to-emerald-500 rounded-full" />
                <h3 className="text-2xl font-black text-white">Bắt đầu cho người mới</h3>
              </div>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
              {beginnerVideos.map((video) => (
                <VideoCardItem
                  key={video.youtubeId}
                  video={video}
                  badge="Sơ cấp"
                  badgeColor="bg-green-600/80"
                  onClick={() => handleVideoClick(video)}
                  showFavoriteBtn={isAuth}
                  isFavorited={favoriteIds.has(video.youtubeId)}
                  onToggleFavorite={(e) => handleToggleFavoriteByYtId(video.youtubeId, e)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Quick Stats */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
          {[
            { icon: <PlayCircleOutlined />, label: 'Video đã học', value: totalVideosWatched },
            { icon: <ClockCircleOutlined />, label: 'Phút học', value: totalMinutes },
            { icon: <FireOutlined />, label: 'Ngày streak', value: streak },
            { icon: <DollarOutlined />, label: 'Xu', value: coinBalance },
          ].map((stat, i) => (
            <div key={i} className="glass p-6 rounded-2xl flex flex-col items-center gap-3 text-center">
              <span style={{ color: '#00e5ff' }} className="text-3xl">{stat.icon}</span>
              <span className="text-3xl font-black text-white">{stat.value}</span>
              <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
            </div>
          ))}
        </section>

        {/* Videos I've Used Coins On */}
        {isAuth && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-yellow-400 to-amber-500 rounded-full" />
                <h3 className="text-2xl font-black text-white">Video đã dùng xu</h3>
              </div>
              <button
                onClick={() => router.push('/user/history')}
                className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors font-medium"
              >
                Xem tất cả <RightOutlined style={{ fontSize: 10 }} />
              </button>
            </div>
            {loadingCoinUnlocked ? (
              <div className="flex items-center justify-center py-8">
                <Spin />
              </div>
            ) : coinUnlockedVideos.length > 0 ? (
              <div className="flex gap-5 overflow-x-auto pb-4 custom-scrollbar">
                {coinUnlockedVideos.map((video) => (
                  <div
                    key={video.videoId}
                    className="min-w-[220px] max-w-[220px] group cursor-pointer shrink-0 flex flex-col"
                    onClick={() => handleCoinVideoClick(video)}
                  >
                    <div className="relative rounded-2xl overflow-hidden mb-3 shrink-0 bg-dark-300 aspect-[16/10]">
                      <img
                        alt={video.title}
                        src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          img.src = `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-all" />
                      <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/90 text-black text-[10px] font-black uppercase">
                        <LockOutlined style={{ fontSize: 8 }} />
                        Đã mở khóa
                      </div>
                      {video.progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.min(100, video.progress)}%` }}
                          />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <PlayCircleOutlined style={{ color: '#0B0B0F', fontSize: 22 }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col min-h-[3.5rem]">
                      <h4 className="text-white font-bold text-xs leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {video.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1">{video.channelTitle}</p>
                      {video.progress > 0 && (
                        <p className="text-[10px] text-primary mt-1">
                          {Math.round(video.progress)}% đã xem
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="user-glass-card p-6 text-center">
                <LockOutlined style={{ color: '#00e5ff', fontSize: 28 }} className="mb-3" />
                <p className="text-slate-400 text-sm">Bạn chưa mở khóa video nào bằng xu.</p>
                <p className="text-slate-500 text-xs mt-1">Tìm video và dùng xu để xem phụ đề AI.</p>
              </div>
            )}
          </section>
        )}

        {/* Favorites */}
        {isAuth && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1 h-8 bg-gradient-to-b from-pink-400 to-rose-500 rounded-full" />
                <h3 className="text-2xl font-black text-white">Yêu thích</h3>
              </div>
            </div>
            {loadingFavorites ? (
              <div className="flex items-center justify-center py-8">
                <Spin />
              </div>
            ) : favoriteVideos.length > 0 ? (
              <div className="flex gap-5 overflow-x-auto pb-4 custom-scrollbar">
                {favoriteVideos.map((video) => (
                  <div
                    key={video.videoId}
                    className="min-w-[220px] max-w-[220px] group cursor-pointer shrink-0 flex flex-col"
                    onClick={() => handleCoinVideoClick(video)}
                  >
                    <div className="relative rounded-2xl overflow-hidden mb-3 shrink-0 bg-dark-300 aspect-[16/10]">
                      <img
                        alt={video.title}
                        src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        onError={(e) => {
                          const img = e.currentTarget as HTMLImageElement;
                          img.src = `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-all" />
                      <button
                        onClick={(e) => handleToggleFavoriteByYtId(video.youtubeId, e)}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                      >
                        <HeartFilled style={{ color: '#f43f5e', fontSize: 14 }} />
                      </button>
                      {video.progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${Math.min(100, video.progress)}%` }}
                          />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                          <PlayCircleOutlined style={{ color: '#0B0B0F', fontSize: 22 }} />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col min-h-[3.5rem]">
                      <h4 className="text-white font-bold text-xs leading-tight group-hover:text-primary transition-colors line-clamp-2">
                        {video.title}
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-1">{video.channelTitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="user-glass-card p-6 text-center">
                <HeartOutlined style={{ color: '#f43f5e', fontSize: 28 }} className="mb-3" />
                <p className="text-slate-400 text-sm">Chưa có video yêu thích.</p>
                <p className="text-slate-500 text-xs mt-1">Bấm trái tim trên video đã mở khóa để lưu lại.</p>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
