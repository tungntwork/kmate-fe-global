'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Spin } from 'antd';
import {
  PlayCircleOutlined,
  FireOutlined,
  ThunderboltOutlined,
  BookOutlined,
  TrophyOutlined,
  VideoCameraOutlined,
  TranslationOutlined,
  StarOutlined,
  CheckCircleOutlined,
  LockOutlined,
  RightOutlined,
  ClockCircleOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth.store';
import {
  userService,
  videoService,
  flashcardService,
  quizService,
  type UserStatistics,
  type Flashcard,
  type QuizHistoryItem,
  type UserAchievement,
} from '@/lib/api-services';

// ── Types ──────────────────────────────────────────────────────────────────────

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

interface StatCardData {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}p`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}p` : `${h}h`;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hours < 1) return 'Vừa xong';
  if (hours < 24) return `${hours}h trước`;
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#f59e0b';
  return '#ef4444';
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ stat, index }: { stat: StatCardData; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className="user-glass-card relative group overflow-hidden rounded-2xl p-5 flex items-start gap-4 hover:border-primary/30 transition-all"
      style={{ borderColor: stat.borderColor }}
    >
      <div
        className="absolute top-0 right-0 w-20 h-20 opacity-10 blur-2xl rounded-full pointer-events-none"
        style={{ backgroundColor: stat.color }}
      />
      <div
        className="rounded-xl p-3 shrink-0"
        style={{ backgroundColor: stat.bgColor, color: stat.color }}
      >
        {stat.icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">{stat.label}</p>
        <p className="text-2xl font-black text-white mt-0.5 truncate">{stat.value}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{stat.sub}</p>
      </div>
    </motion.div>
  );
}

// ── Watched Video Card ─────────────────────────────────────────────────────────

function WatchedVideoCard({ video, index }: { video: WatchedVideo; index: number }) {
  const progressPct = Math.min(video.progress, 100);
  const isCompleted = video.status === 'COMPLETED';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.06, duration: 0.35 }}
    >
      <Link
        href={`/learn/${video.youtubeId}`}
        className="block group"
      >
        <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/5 bg-dark-300 mb-3">
          {/* Thumbnail */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={video.thumbnailUrl}
            alt={video.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-bold backdrop-blur-sm">
            {formatDuration(video.duration)}
          </div>

          {/* Completed badge */}
          {isCompleted && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-green-500/80 text-white text-[10px] font-bold flex items-center gap-1">
              <CheckCircleOutlined style={{ fontSize: 10 }} />
              Hoàn thành
            </div>
          )}

          {/* Play button overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-11 h-11 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/40">
              <PlayCircleOutlined style={{ color: '#0B0B0F', fontSize: 24 }} />
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden mb-2">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPct}%`,
              background: isCompleted
                ? 'linear-gradient(90deg, #22c55e, #4ade80)'
                : 'linear-gradient(90deg, #7C4DFF, #00e5ff)',
            }}
          />
        </div>

        {/* Info */}
        <h4 className="text-white text-sm font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {video.title}
        </h4>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-slate-500">
            {formatRelativeTime(video.lastWatchedAt)}
          </span>
          {!isCompleted && progressPct > 0 && (
            <span className="text-[10px] text-primary font-medium">
              {Math.round(progressPct)}% đã xem
            </span>
          )}
          {video.watchCount > 1 && (
            <span className="text-[10px] text-slate-600">· {video.watchCount}x học</span>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

// ── Recent Quiz Row ───────────────────────────────────────────────────────────

function RecentQuizRow({ quiz }: { quiz: QuizHistoryItem }) {
  const scoreColorVal = scoreColor(quiz.score);
  return (
    <Link
      href="/user/quiz"
      className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors group"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: scoreColorVal + '20', color: scoreColorVal }}
      >
        <span className="text-lg font-black">{Math.round(quiz.score)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{quiz.videoTitle || 'Quiz hỗn hợp'}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {quiz.correctAnswers}/{quiz.totalQuestions} đúng · {formatRelativeTime(quiz.createdAt)}
        </p>
      </div>
      <RightOutlined className="text-slate-600 group-hover:text-primary transition-colors text-xs" />
    </Link>
  );
}

// ── Achievement Badge ──────────────────────────────────────────────────────────

function AchievementBadge({ achievement }: { achievement: UserAchievement }) {
  const colors = ['#00e5ff', '#7c4dff', '#f59e0b', '#22c55e'];
  const color = colors[0];
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center relative"
        style={{ backgroundColor: achievement.isUnlocked ? color + '20' : 'rgba(255,255,255,0.05)', color: achievement.isUnlocked ? color : '#64748b' }}
      >
        <StarOutlined style={{ fontSize: 18 }} />
        {achievement.isUnlocked ? (
          <CheckCircleOutlined
            style={{ position: 'absolute', bottom: -2, right: -2, color: '#22c55e', fontSize: 13, background: '#0B0B0F', borderRadius: '50%', padding: 1 }}
          />
        ) : (
          <LockOutlined
            style={{ position: 'absolute', bottom: -2, right: -2, color: '#64748b', fontSize: 11, background: '#0B0B0F', borderRadius: '50%', padding: 1 }}
          />
        )}
      </div>
      <span className="text-[10px] text-slate-400 text-center leading-tight line-clamp-2 max-w-[64px]">
        {achievement.name}
      </span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function UserDashboardPage() {
  const { user, updateCoinBalance, updateStreak } = useAuthStore();
  const displayName = user?.name ?? 'User';

  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<WatchedVideo[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [recentQuizzes, setRecentQuizzes] = useState<QuizHistoryItem[]>([]);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      userService.getStatistics().catch(() => null),
      videoService.getWatchedVideos({ limit: 6 }).catch(() => null),
      flashcardService.getDue().catch(() => null),
      quizService.getHistory({ limit: 3 }).catch(() => null),
      userService.getAchievements().catch(() => null),
    ]).then(([statsRes, watchedRes, dueRes, quizRes, achRes]) => {
      if (statsRes) {
        const data = statsRes.data.data;
        setStats(data);
        updateStreak(data.currentStreak);
        updateCoinBalance(data.currentCoinBalance);
      }
      if (watchedRes) setWatchedVideos(watchedRes.data.data.videos);
      if (dueRes) setDueCards(dueRes.data.data.flashcards);
      if (quizRes) setRecentQuizzes(quizRes.data.data.quizzes);
      if (achRes) setAchievements(achRes.data.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const statCards: StatCardData[] = [
    {
      label: 'Chuỗi ngày',
      value: stats ? `${stats.currentStreak} Ngày` : '—',
      sub: stats ? `Kỷ lục: ${stats.longestStreak}` : '',
      icon: <FireOutlined style={{ fontSize: 22 }} />,
      color: '#00e5ff',
      bgColor: 'rgba(0, 229, 255, 0.15)',
      borderColor: 'rgba(0, 229, 255, 0.3)',
    },
    {
      label: 'Phút học',
      value: stats ? formatMinutes(stats.totalMinutesLearned) : '—',
      sub: `${stats?.totalVideosWatched ?? 0} video`,
      icon: <ThunderboltOutlined style={{ fontSize: 22 }} />,
      color: '#7c4dff',
      bgColor: 'rgba(124, 77, 255, 0.15)',
      borderColor: 'rgba(124, 77, 255, 0.3)',
    },
    {
      label: 'Flashcard',
      value: String(stats?.totalFlashcards ?? 0),
      sub: `${stats?.totalFlashcardReviews ?? 0} lần ôn`,
      icon: <BookOutlined style={{ fontSize: 22 }} />,
      color: '#22c55e',
      bgColor: 'rgba(34, 197, 94, 0.15)',
      borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    {
      label: 'Quiz',
      value: String(stats?.totalQuizzesTaken ?? 0),
      sub: `${stats?.totalWordsLookedUp ?? 0} từ đã tra`,
      icon: <TrophyOutlined style={{ fontSize: 22 }} />,
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.15)',
      borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    {
      label: 'Video đã xem',
      value: String(stats?.totalVideosWatched ?? 0),
      sub: 'Tổng cộng',
      icon: <VideoCameraOutlined style={{ fontSize: 22 }} />,
      color: '#a78bfa',
      bgColor: 'rgba(167, 139, 250, 0.15)',
      borderColor: 'rgba(167, 139, 250, 0.3)',
    },
    {
      label: 'Từ vựng',
      value: String(stats?.totalWordsLookedUp ?? 0),
      sub: 'Đã tra cứu',
      icon: <TranslationOutlined style={{ fontSize: 22 }} />,
      color: '#34d399',
      bgColor: 'rgba(52, 211, 153, 0.15)',
      borderColor: 'rgba(52, 211, 153, 0.3)',
    },
  ];

  const unlockedAchievements = achievements.filter((a) => a.isUnlocked);
  const lockedAchievements = achievements.filter((a) => !a.isUnlocked);

  return (
    <div className="p-6 lg:p-10 min-h-full bg-gradient-cyber space-y-10">

      {/* ── Welcome Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="user-glass-card p-8 rounded-3xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/8 blur-[100px] rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-400/8 blur-[80px] rounded-full -mb-10 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Chào mừng trở lại,{' '}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {displayName}
              </span>
              !
            </h1>
            <p className="text-slate-400 text-sm mt-2">
              {stats?.totalMinutesLearned
                ? `Bạn đã học ${formatMinutes(stats.totalMinutesLearned)} · Tiếp tục hành trình học tiếng Hàn!`
                : 'Bắt đầu hành trình học tiếng Hàn ngay hôm nay!'}
            </p>
            <div className="mt-5 flex gap-3 flex-wrap">
              <Link
                href="/user/explore"
                className="bg-primary hover:bg-primary/80 text-background-dark font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 !text-sm shadow-lg shadow-primary/20"
              >
                <PlayCircleOutlined />
                Khám phá video
              </Link>
              <Link
                href="/user/flashcards"
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 !text-sm"
              >
                <BookOutlined />
                Flashcard
              </Link>
              <Link
                href="/user/quiz"
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 !text-sm"
              >
                <TrophyOutlined />
                Làm quiz
              </Link>
            </div>
          </div>

          {/* Streak badge */}
          <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4 border border-white/10">
            <div className="text-center">
              <FireOutlined style={{ color: '#00e5ff', fontSize: 28 }} />
              <p className="text-3xl font-black text-white mt-1">{stats?.currentStreak ?? 0}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Ngày</p>
            </div>
            <div className="w-px h-12 bg-white/10" />
            <div className="text-center">
              <TrophyOutlined style={{ color: '#f59e0b', fontSize: 28 }} />
              <p className="text-3xl font-black text-white mt-1">{stats?.longestStreak ?? 0}</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Kỷ lục</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} index={i} />
        ))}
      </div>

      {/* ── Main Content: Tiếp tục xem + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Watched Videos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <PlayCircleOutlined className="text-primary" />
              Tiếp tục xem
            </h2>
            <Link href="/user/explore" className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
              Xem tất cả <RightOutlined style={{ fontSize: 10 }} />
            </Link>
          </div>

          {watchedVideos.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {watchedVideos.map((video, i) => (
                <WatchedVideoCard key={video.videoId} video={video} index={i} />
              ))}
            </div>
          ) : (
            <div className="user-glass-card p-10 text-center border border-white/10">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <PlayCircleOutlined style={{ color: '#7C4DFF', fontSize: 32 }} />
              </div>
              <p className="text-slate-300 font-semibold mb-1">Chưa có video nào được xem</p>
              <p className="text-slate-500 text-sm mb-4">Bắt đầu học ngay hôm nay để theo dõi tiến độ!</p>
              <Link
                href="/user/explore"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primary/80 text-background-dark font-bold px-5 py-2.5 rounded-xl transition-all text-sm"
              >
                <PlayCircleOutlined />
                Khám phá video
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar: Due Cards + Quiz + Tip */}
        <div className="space-y-4">
          {/* Due Flashcards */}
          <div className="user-glass-card p-5 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOutlined className="text-primary" style={{ fontSize: 16 }} />
                Ôn tập Flashcard
              </h3>
              {dueCards.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">
                  {dueCards.length} thẻ
                </span>
              )}
            </div>

            {dueCards.length > 0 ? (
              <>
                <p className="text-3xl font-black text-white mb-1">{dueCards.length}</p>
                <p className="text-xs text-slate-400 mb-4">thẻ cần ôn hôm nay</p>
                <Link
                  href="/user/flashcards"
                  className="w-full block text-center py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary font-bold text-sm transition-all"
                >
                  Bắt đầu ôn ngay
                </Link>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-2">
                  <CheckCircleOutlined style={{ color: '#22c55e', fontSize: 20 }} />
                </div>
                <p className="text-sm text-slate-300 font-semibold">Tất cả đã ôn xong!</p>
                <p className="text-xs text-slate-500 mt-1">Hẹn gặp lại vào ngày mai</p>
              </div>
            )}
          </div>

          {/* Recent Quizzes */}
          <div className="user-glass-card p-5 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <TrophyOutlined className="text-secondary" style={{ fontSize: 16 }} />
                Quiz gần đây
              </h3>
              <Link href="/user/quiz" className="text-[10px] font-bold text-secondary hover:underline">
                Xem lịch sử
              </Link>
            </div>

            {recentQuizzes.length > 0 ? (
              <div className="space-y-1">
                {recentQuizzes.map((quiz) => (
                  <RecentQuizRow key={quiz.id} quiz={quiz} />
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-2">
                  <TrophyOutlined style={{ color: '#00e5ff', fontSize: 20 }} />
                </div>
                <p className="text-sm text-slate-300 font-semibold">Chưa có quiz nào</p>
                <p className="text-xs text-slate-500 mt-1">Hoàn thành video để mở quiz</p>
              </div>
            )}
          </div>

          {/* MATE Tip */}
          <div className="rounded-2xl bg-gradient-to-br from-primary/15 to-secondary/15 p-5 border border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 opacity-30">
              <BulbOutlined style={{ fontSize: 64, color: '#00e5ff' }} />
            </div>
            <div className="relative">
              <h4 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">MATE Tip</h4>
              <p className="text-sm text-slate-200 leading-relaxed">
                {dueCards.length > 0
                  ? `Bạn có ${dueCards.length} thẻ flashcard cần ôn. Học đều đặn mỗi ngày để xây dựng trí nhớ tốt hơn!`
                  : stats?.totalMinutesLearned && stats.totalMinutesLearned > 0
                  ? `Tuyệt vời! Bạn đã học ${formatMinutes(stats.totalMinutesLearned)}. Tiếp tục phát huy nhé!`
                  : 'Hãy bắt đầu bằng việc xem một video ngắn. Mỗi ngày một chút, bạn sẽ tiến bộ nhanh hơn!'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Achievements Preview ── */}
      {(unlockedAchievements.length > 0 || lockedAchievements.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="user-glass-card p-6 rounded-2xl border border-white/5"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <StarOutlined className="text-secondary" />
              Thành tựu của bạn
            </h3>
            <span className="text-xs text-slate-500">
              {unlockedAchievements.length}/{achievements.length} đã mở
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-white/5 mb-5 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: achievements.length > 0
                  ? `${(unlockedAchievements.length / achievements.length) * 100}%`
                  : '0%',
                background: 'linear-gradient(90deg, #7C4DFF, #00e5ff)',
              }}
            />
          </div>

          {/* Badge grid */}
          <div className="flex gap-4 overflow-x-auto pb-1 custom-scrollbar">
            {[...unlockedAchievements, ...lockedAchievements].map((achievement) => (
              <AchievementBadge key={achievement.id} achievement={achievement} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Ambient decorative blobs */}
      <div className="pointer-events-none fixed -bottom-32 -right-32 h-[600px] w-[600px] rounded-full bg-primary/5 blur-[140px]" />
      <div className="pointer-events-none fixed -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-secondary/5 blur-[120px]" />
    </div>
  );
}
