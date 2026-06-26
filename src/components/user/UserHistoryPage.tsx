'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin, Tabs, Pagination } from 'antd';
import { App } from 'antd';
import {
  PlayCircleOutlined,
  HeartOutlined,
  HeartFilled,
  LockOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import {
  videoService,
  type CoinUnlockedVideo,
} from '@/lib/api-services';

const PAGE_SIZE = 20;

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} ngày trước`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths} tháng trước`;
}

interface VideoGridProps {
  videos: CoinUnlockedVideo[];
  loading: boolean;
  favoriteIds: Set<string>;
  onToggleFavorite: (video: CoinUnlockedVideo) => void;
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  emptyIcon: React.ReactNode;
  emptyText: string;
  emptySubText: string;
}

function VideoGrid({
  videos,
  loading,
  favoriteIds,
  onToggleFavorite,
  page,
  total,
  onPageChange,
  emptyIcon,
  emptyText,
  emptySubText,
}: VideoGridProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin size="large" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
          {emptyIcon}
        </div>
        <p className="text-slate-400 font-medium">{emptyText}</p>
        <p className="text-slate-600 text-sm mt-1">{emptySubText}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
        {videos.map((video) => {
          const isFav = favoriteIds.has(video.youtubeId);
          return (
            <div
              key={video.videoId}
              className="group cursor-pointer flex flex-col"
              onClick={() => router.push(`/learn/${video.youtubeId}`)}
            >
              <div className="relative rounded-2xl overflow-hidden mb-3 shrink-0 bg-dark-300 aspect-video">
                <img
                  alt={video.title}
                  src={video.thumbnailUrl || `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    const img = e.currentTarget as HTMLImageElement;
                    img.src = `https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`;
                  }}
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/90 text-black text-[10px] font-black uppercase">
                  <LockOutlined style={{ fontSize: 8 }} />
                  Đã mở khóa
                </div>
                <div className="absolute bottom-2 right-2 glass text-white text-[10px] px-2 py-0.5 rounded font-bold">
                  {formatDuration(video.duration)}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggleFavorite(video); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors opacity-0 group-hover:opacity-100"
                >
                  {isFav
                    ? <HeartFilled style={{ color: '#f43f5e', fontSize: 14 }} />
                    : <HeartOutlined style={{ color: '#fff', fontSize: 14 }} />
                  }
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
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/40">
                    <PlayCircleOutlined style={{ color: '#0B0B0F', fontSize: 28 }} />
                  </div>
                </div>
              </div>
              <div className="flex flex-col min-h-[3.5rem]">
                <h4 className="text-white font-bold leading-tight group-hover:text-primary transition-colors line-clamp-2 text-sm">
                  {video.title}
                </h4>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] text-slate-400">{video.channelTitle}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  {video.lastWatchedAt && (
                    <span className="text-[10px] text-slate-600 flex items-center gap-1">
                      <ClockCircleOutlined style={{ fontSize: 8 }} />
                      {formatRelativeTime(video.lastWatchedAt)}
                    </span>
                  )}
                  {video.progress > 0 && (
                    <span className="text-[10px] text-primary">
                      {Math.round(video.progress)}% đã xem
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {total > PAGE_SIZE && (
        <div className="flex justify-center pt-4">
          <Pagination
            current={page}
            pageSize={PAGE_SIZE}
            total={total}
            onChange={onPageChange}
            showSizeChanger={false}
          />
        </div>
      )}
    </>
  );
}

export default function UserHistoryPage() {
  const { message } = App.useApp();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState('coin-unlocked');

  // Coin-unlocked state
  const [coinVideos, setCoinVideos] = useState<CoinUnlockedVideo[]>([]);
  const [coinTotal, setCoinTotal] = useState(0);
  const [coinPage, setCoinPage] = useState(1);
  const [loadingCoin, setLoadingCoin] = useState(false);

  // Favorites state
  const [favVideos, setFavVideos] = useState<CoinUnlockedVideo[]>([]);
  const [favTotal, setFavTotal] = useState(0);
  const [favPage, setFavPage] = useState(1);
  const [loadingFav, setLoadingFav] = useState(false);

  // In-memory set for optimistic favorite toggling
  const [favIds, setFavIds] = useState<Set<string>>(new Set());

  const fetchCoinUnlocked = (page: number) => {
    setLoadingCoin(true);
    videoService.getCoinUnlockedVideos({ page, limit: PAGE_SIZE })
      .then((r) => {
        setCoinVideos(r.data.data.videos);
        setCoinTotal(r.data.data.total);
        setFavIds(new Set(r.data.data.videos.filter((v) => v.isBookmarked).map((v) => v.youtubeId)));
      })
      .catch(() => { message.error({ content: 'Không thể tải danh sách video' }); })
      .finally(() => setLoadingCoin(false));
  };

  const fetchFavorites = (page: number) => {
    setLoadingFav(true);
    videoService.getFavorites({ page, limit: PAGE_SIZE })
      .then((r) => {
        setFavVideos(r.data.data.videos);
        setFavTotal(r.data.data.total);
        setFavIds(new Set(r.data.data.videos.map((v) => v.youtubeId)));
      })
      .catch(() => { message.error({ content: 'Không thể tải danh sách yêu thích' }); })
      .finally(() => setLoadingFav(false));
  };

  useEffect(() => {
    if (activeTab === 'coin-unlocked') {
      fetchCoinUnlocked(coinPage);
    } else {
      fetchFavorites(favPage);
    }
  }, [activeTab]);

  const handleCoinPageChange = (page: number) => {
    setCoinPage(page);
    fetchCoinUnlocked(page);
  };

  const handleFavPageChange = (page: number) => {
    setFavPage(page);
    fetchFavorites(page);
  };

  const handleToggleFavorite = async (video: CoinUnlockedVideo) => {
    const ytId = video.youtubeId;
    const wasFav = favIds.has(ytId);

    // Optimistic update for the current tab
    if (activeTab === 'favorites') {
      setFavVideos((prev) => prev.filter((v) => v.youtubeId !== ytId));
    }
    setFavIds((prev) => {
      const next = new Set(prev);
      wasFav ? next.delete(ytId) : next.add(ytId);
      return next;
    });

    try {
      await videoService.toggleFavorite(ytId);
    } catch {
      // Revert
      setFavIds((prev) => {
        const next = new Set(prev);
        wasFav ? next.add(ytId) : next.delete(ytId);
        return next;
      });
      if (activeTab === 'favorites') {
        setFavVideos((prev) => wasFav ? [video, ...prev] : prev);
      }
      message.error({ content: 'Không thể cập nhật yêu thích' });
    }
  };

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white mb-1">Lịch sử video</h1>
        <p className="text-slate-500 text-sm">Quản lý các video bạn đã mở khóa và yêu thích</p>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key)}
        className="user-tabs"
        items={[
          {
            key: 'coin-unlocked',
            label: (
              <span className="flex items-center gap-2">
                <LockOutlined />
                Video đã dùng xu
              </span>
            ),
            children: (
              <VideoGrid
                videos={coinVideos}
                loading={loadingCoin}
                favoriteIds={favIds}
                onToggleFavorite={handleToggleFavorite}
                page={coinPage}
                total={coinTotal}
                onPageChange={handleCoinPageChange}
                emptyIcon={<LockOutlined style={{ color: '#00e5ff', fontSize: 32 }} />}
                emptyText="Bạn chưa mở khóa video nào"
                emptySubText="Tìm video và dùng xu để xem phụ đề AI"
              />
            ),
          },
          {
            key: 'favorites',
            label: (
              <span className="flex items-center gap-2">
                <HeartFilled style={{ color: '#f43f5e' }} />
                Yêu thích
              </span>
            ),
            children: (
              <VideoGrid
                videos={favVideos}
                loading={loadingFav}
                favoriteIds={favIds}
                onToggleFavorite={handleToggleFavorite}
                page={favPage}
                total={favTotal}
                onPageChange={handleFavPageChange}
                emptyIcon={<HeartOutlined style={{ color: '#f43f5e', fontSize: 32 }} />}
                emptyText="Chưa có video yêu thích"
                emptySubText="Bấm trái tim trên video đã mở khóa để lưu lại"
              />
            ),
          },
        ]}
      />
    </div>
  );
}
