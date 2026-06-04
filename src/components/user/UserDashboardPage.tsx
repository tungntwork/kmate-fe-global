'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Spin } from 'antd';
import {
  PlayCircleOutlined,
  FireOutlined,
  ThunderboltOutlined,
  BookOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '@/store/auth.store';
import { userService, flashcardService, type UserStatistics, type LearningHistory, type Flashcard } from '@/lib/api-services';

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}p`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}p` : `${h}h`;
}

export default function UserDashboardPage() {
  const { user } = useAuthStore();
  const displayName = user?.name ?? 'User';

  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [history, setHistory] = useState<LearningHistory[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      userService.getStatistics().catch(() => null),
      userService.getHistory({ limit: 5 }).catch(() => null),
      flashcardService.getDue().catch(() => null),
    ]).then(([statsRes, historyRes, dueRes]) => {
      if (statsRes) setStats(statsRes.data.data);
      if (historyRes) setHistory(historyRes.data.data);
      if (dueRes) setDueCards(dueRes.data.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const recentWatch = history[0];

  const statCards = [
    {
      icon: <FireOutlined />,
      label: 'Chuỗi ngày',
      value: stats ? `${stats.currentStreak} Ngày` : '—',
      sub: stats ? `Kỷ lục: ${stats.longestStreak} Ngày` : '',
      color: '#00e5ff',
      bgColor: 'rgba(0, 229, 255, 0.1)',
      borderColor: 'rgba(0, 229, 255, 0.4)',
      shadowClass: 'user-neon-blue',
    },
    {
      icon: <ThunderboltOutlined />,
      label: 'Phút học',
      value: stats ? formatDuration(stats.totalMinutesLearned) : '—',
      sub: `${stats?.totalVideosWatched ?? 0} video đã xem`,
      color: '#7c4dff',
      bgColor: 'rgba(124, 77, 255, 0.1)',
      borderColor: 'rgba(124, 77, 255, 0.4)',
      shadowClass: '',
    },
    {
      icon: <BookOutlined />,
      label: 'Flashcard',
      value: stats ? String(stats.totalFlashcards) : '—',
      sub: `${stats?.totalFlashcardReviews ?? 0} lần ôn tập`,
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.1)',
      borderColor: 'rgba(34, 197, 94, 0.4)',
      shadowClass: '',
    },
    {
      icon: <TrophyOutlined />,
      label: 'Quiz',
      value: stats ? String(stats.totalQuizzesTaken) : '—',
      sub: `${stats?.totalWordsLookedUp ?? 0} từ đã tra`,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      borderColor: 'rgba(245, 158, 11, 0.4)',
      shadowClass: '',
    },
  ];

  return (
    <div className="p-6 lg:p-10 space-y-10 bg-gradient-cyber min-h-full">
      {/* Welcome Section */}
      <section className="user-glass-card p-8 relative overflow-hidden rounded-3xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-cyan-400/10 blur-[80px] rounded-full -mb-10 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="text-4xl lg:text-5xl font-extrabold text-white tracking-tight mb-2">
              Chào mừng trở lại,{' '}
              <span className="text-primary text-glow-primary">{displayName}</span>
              !
            </h2>
            <p className="text-slate-400 text-base">Tiếp tục hành trình học tiếng Hàn của bạn.</p>
            <div className="mt-6 flex gap-4 flex-wrap">
              <Link
                href="/user/explore"
                className="bg-primary hover:bg-primary/80 text-background-dark font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 !text-sm"
              >
                <PlayCircleOutlined />
                Khám phá ngay
              </Link>
              <Link
                href="/user/flashcards"
                className="bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-xl font-bold transition-all !text-sm text-white"
              >
                Flashcard của tôi
              </Link>
            </div>
          </div>

          <div className="relative w-48 h-48 flex items-center justify-center shrink-0">
            <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
            <div className="w-40 h-40 rounded-full border-2 border-primary/30 flex items-center justify-center bg-dark-400/50">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="40" cy="40" r="38" stroke="#7C4DFF" strokeWidth="2" strokeDasharray="4 4" opacity="0.3"/>
                <text x="50%" y="50%" textAnchor="middle" dy=".35em" fill="#00e5ff" fontSize="36" fontWeight="bold" style={{ textShadow: '0 0 10px rgba(0,229,255,0.5)' }}>
                  🇰🇷
                </text>
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className={`user-glass-card p-6 relative group overflow-hidden ${stat.shadowClass}`}
            style={{ borderColor: stat.borderColor }}
          >
            <div
              className="absolute top-0 right-0 w-24 h-24 opacity-10 blur-2xl rounded-full"
              style={{ backgroundColor: stat.color }}
            />
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl" style={{ color: stat.color }}>
                {stat.icon}
              </span>
              <span
                className="text-[10px] font-bold px-2 py-1 rounded"
                style={{ color: stat.color, backgroundColor: stat.bgColor }}
              >
                {stat.label}
              </span>
            </div>
            <p className="text-3xl font-extrabold text-white">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
          </div>
        ))}
      </section>

      {/* Main Features Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Continue Watching */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <PlayCircleOutlined className="text-primary" />
              Tiếp tục xem
            </h3>
            <Link href="/user/explore" className="text-xs font-bold text-primary hover:underline">
              Xem tất cả
            </Link>
          </div>

          {recentWatch ? (
            <div className="user-glass-card overflow-hidden group flex flex-col md:flex-row border border-white/10">
              <div className="md:w-2/5 relative h-48 md:h-auto overflow-hidden shrink-0 bg-dark-300">
                {recentWatch.video?.thumbnail ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={recentWatch.video.thumbnail}
                    alt={recentWatch.video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center">
                    <PlayCircleOutlined className="text-6xl text-white/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                    <circle cx="28" cy="28" r="27" stroke="white" strokeWidth="2" opacity="0.5"/>
                    <path d="M23 19L38 28L23 37V19Z" fill="white"/>
                  </svg>
                </div>
              </div>

              <div className="p-6 md:w-3/5 flex flex-col justify-between">
                <div>
                  <h4 className="text-lg font-bold text-white mb-2">
                    {recentWatch.video?.title ?? 'Video đang học'}
                  </h4>
                  {recentWatch.duration > 0 && (
                    <p className="text-sm text-slate-400">
                      {Math.floor(recentWatch.duration / 60)} phút • Đã tra {recentWatch.wordsLookedUp} từ
                    </p>
                  )}
                </div>

                <div className="space-y-3 mt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      Lần học cuối: {new Date(recentWatch.startTime).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <Link
                    href={recentWatch.video ? `/watch/${recentWatch.video.youtubeId}` : '/user/explore'}
                    className="bg-primary hover:bg-primary/80 text-background-dark text-xs font-bold py-2 px-4 rounded-lg transition-all inline-block"
                  >
                    Tiếp tục học
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="user-glass-card p-8 border border-white/10 text-center">
              <PlayCircleOutlined className="text-4xl text-slate-600 mb-3" />
              <p className="text-slate-400">Chưa có video nào. Hãy bắt đầu khám phá!</p>
              <Link href="/user/explore" className="text-primary text-sm font-bold hover:underline mt-2 inline-block">
                Khám phá video →
              </Link>
            </div>
          )}
        </div>

        {/* Daily Review */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-secondary">
              <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Ôn tập hàng ngày
          </h3>

          {dueCards.length > 0 ? (
            <div className="user-glass-card p-4 border border-white/5 hover:border-primary/30 transition-all cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <BookOutlined className="text-primary text-lg" />
                <span className="text-[10px] font-bold text-primary uppercase">Flashcard</span>
              </div>
              <p className="text-white font-bold text-sm mb-1">{dueCards.length} thẻ cần ôn</p>
              <p className="text-xs text-slate-500 mb-3">Ôn tập để cải thiện trí nhớ</p>
              <Link
                href="/user/flashcards"
                className="w-full block text-center py-2 rounded-lg bg-primary/20 text-primary text-xs font-bold hover:bg-primary hover:text-background-dark transition-all"
              >
                Bắt đầu ôn
              </Link>
            </div>
          ) : (
            <div className="user-glass-card p-4 border border-white/5 text-center">
              <BookOutlined className="text-primary text-lg mb-2" />
              <p className="text-white font-bold text-sm mb-1">Không có thẻ cần ôn</p>
              <p className="text-xs text-slate-500">Tạo flashcard mới để học!</p>
            </div>
          )}

          <div className="user-glass-card p-4 border border-white/5 hover:border-secondary/30 transition-all cursor-pointer">
            <div className="flex items-center justify-between mb-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-secondary">
                <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span className="text-[10px] font-bold text-secondary uppercase">Quiz</span>
            </div>
            <p className="text-white font-bold text-sm mb-1">Kiểm tra kiến thức</p>
            <p className="text-xs text-slate-500 mb-3">Củng cố từ vựng hôm nay</p>
            <Link
              href="/user/quiz"
              className="w-full block text-center py-2 rounded-lg bg-secondary/20 text-secondary text-xs font-bold hover:bg-secondary hover:text-white transition-all"
            >
              Làm quiz
            </Link>
          </div>

          {/* Premium Card */}
          <div className="user-glass-card p-4 bg-gradient-to-br from-secondary/20 to-primary/20 border border-white/10">
            <p className="text-xs font-bold text-white mb-1 uppercase tracking-wider">Truy cập Premium</p>
            <p className="text-[10px] text-slate-300 mb-3 leading-relaxed">
              Mở khóa phản hồi AI và buổi học 1-1.
            </p>
            <Link
              href="/user/wallet"
              className="w-full block text-center bg-white text-dark-500 py-2 rounded-xl text-xs font-bold hover:bg-primary hover:text-white transition-colors"
            >
              Nâng cấp ngay
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
