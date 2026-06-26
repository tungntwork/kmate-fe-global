'use client';

import { useEffect, useState } from 'react';
import { Button, Spin, Tooltip } from 'antd';
import ReportModal from './ReportModal';
import {
  FireOutlined,
  ThunderboltOutlined,
  TranslationOutlined,
  PlayCircleOutlined,
  BarChartOutlined,
  StarOutlined,
  AimOutlined,
  PlaySquareOutlined,
  BulbOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { userService, type UserStatistics, type UserAchievement } from '@/lib/api-services';

interface StatCard {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  shadowClass: string;
  progress?: number;
}

const CHART_WIDTH = 560;
const CHART_HEIGHT = 180;
const PADDING = { top: 20, right: 20, bottom: 30, left: 10 };

const MATE_TIPS = [
  { text: 'Học từ vựng chủ đề "Gyeolhon" hôm nay? Bạn đã học {words} từ liên quan rồi đấy!', vars: (stats: any) => ({ words: stats?.totalWordsLookedUp ?? 0 }) },
  { text: 'Mỗi ngày học 10 phút tiếng Hàn — chỉ cần 10 phút thôi nhưng hiệu quả bất ngờ!', vars: () => ({}) },
  { text: 'Bạn đã học {minutes} phút rồi. Tiếp tục giữ nhịp đều nhé!', vars: (stats: any) => ({ minutes: stats?.totalMinutesLearned ?? 0 }) },
  { text: 'Xem video có phụ đề tiếng Hàn giúp bạn cải thiện kỹ năng nghe nhanh hơn.', vars: () => ({}) },
  { text: 'Học từ mới mỗi ngày: chỉ cần 5 từ, sau 1 tháng bạn sẽ biết thêm 150 từ!', vars: () => ({}) },
  { text: 'Đừng quên ôn lại flashcard đã học — nhắc nhở bộ não巩固 kiến thức.', vars: () => ({}) },
  { text: 'Bạn đang có chuỗi {streak} ngày liên tiếp! Đừng để断!', vars: (stats: any) => ({ streak: stats?.currentStreak ?? 0 }) },
  { text: 'Quiz giúp bạn kiểm tra và củng cố từ vựng hiệu quả. Hãy thử quiz hôm nay!', vars: () => ({}) },
  { text: 'Nghe nhạc K-pop với phụ đề tiếng Hàn là cách học vừa vui vừa hiệu quả!', vars: () => ({}) },
  { text: 'Học phát âm chuẩn ngay từ đầu sẽ giúp bạn giao tiếp tự tin hơn rất nhiều.', vars: () => ({}) },
];

function buildAreaPath(data: number[], maxVal: number): string {
  const w = CHART_WIDTH - PADDING.left - PADDING.right;
  const h = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const stepX = data.length > 1 ? w / (data.length - 1) : 0;
  const points = data.map((v, i) => ({
    x: PADDING.left + i * stepX,
    y: PADDING.top + h - (maxVal > 0 ? (v / maxVal) * h : 0),
  }));
  const linePath = points.map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`)).join(' ');
  return linePath + ` L ${points[points.length - 1].x},${CHART_HEIGHT - PADDING.bottom} L ${PADDING.left},${CHART_HEIGHT - PADDING.bottom} Z`;
}

function WeeklyChart({ stats }: { stats: UserStatistics | null }) {
  const weeklyData = stats ? [
    stats.totalVideosWatched,
    stats.totalFlashcardReviews,
    stats.totalMinutesLearned,
    stats.totalWordsLookedUp,
    stats.totalQuizzesTaken,
    stats.currentStreak,
    stats.longestStreak,
  ] : [0, 0, 0, 0, 0, 0, 0];
  const maxVal = Math.max(...weeklyData, 1);
  const areaPath = buildAreaPath(weeklyData, maxVal);
  const linePath = weeklyData.map((v, i) => {
    const w = CHART_WIDTH - PADDING.left - PADDING.right;
    const h = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const stepX = weeklyData.length > 1 ? w / (weeklyData.length - 1) : 0;
    const x = PADDING.left + i * stepX;
    const y = PADDING.top + h - (maxVal > 0 ? (v / maxVal) * h : 0);
    return i === 0 ? `M ${x},${y}` : `L ${x},${y}`;
  }).join(' ');

  const dots = weeklyData.map((v, i) => {
    const w = CHART_WIDTH - PADDING.left - PADDING.right;
    const h = CHART_HEIGHT - PADDING.top - PADDING.bottom;
    const stepX = weeklyData.length > 1 ? w / (weeklyData.length - 1) : 0;
    return {
      x: PADDING.left + i * stepX,
      y: PADDING.top + h - (maxVal > 0 ? (v / maxVal) * h : 0),
    };
  });

  const labels = ['Video', 'FC', 'Phút', 'Từ tra', 'Quiz', 'Ngày', 'Kỷ lục'];
  const labelTooltips = [
    'Video đã xem', 'Lần ôn flashcard', 'Phút học',
    'Từ tra cứu', 'Quiz đã làm', 'Ngày liên tiếp', 'Ngày kỷ lục',
  ];

  return (
    <div className="relative w-full overflow-hidden">
      <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full h-56" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="gradient-words" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PADDING.top + (CHART_HEIGHT - PADDING.top - PADDING.bottom) * (1 - frac);
          return <line key={frac} x1={PADDING.left} y1={y} x2={CHART_WIDTH - PADDING.right} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth="1" />;
        })}
        <path d={areaPath} fill="url(#gradient-words)" />
        <path d={linePath} fill="none" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {dots.map((dot, i) => (
          <circle key={i} cx={dot.x} cy={dot.y} r="4" fill="#00e5ff" stroke="#0B0B0F" strokeWidth="2" />
        ))}
        {weeklyData.map((v, i) => {
          const w = CHART_WIDTH - PADDING.left - PADDING.right;
          const stepX = weeklyData.length > 1 ? w / (weeklyData.length - 1) : 0;
          const x = PADDING.left + i * stepX;
          return (
            <Tooltip key={i} title={labelTooltips[i]} placement="top">
              <text x={x} y={CHART_HEIGHT - 4} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold" className="uppercase cursor-default select-none">
                {labels[i]}
              </text>
            </Tooltip>
          );
        })}
      </svg>
      <div className="flex items-center gap-6 mt-3 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hoạt động</span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ stat, index }: { stat: StatCard; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`user-glass-card relative group overflow-hidden rounded-2xl p-6 hover:border-primary/40 transition-all cursor-default ${stat.shadowClass}`}
      style={{ borderColor: stat.borderColor }}
    >
      <div className="absolute top-0 right-0 w-24 h-24 opacity-10 blur-2xl rounded-full" style={{ backgroundColor: stat.color }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{stat.label}</p>
          <p className="text-3xl font-black text-white mt-1">{stat.value}</p>
          {stat.progress !== undefined && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs font-bold" style={{ color: stat.color }}>{stat.sub}</span>
              <div className="h-1 flex-1 rounded-full bg-white/5 overflow-hidden max-w-[80px]">
                <div className="h-full rounded-full" style={{ width: `${stat.progress}%`, backgroundColor: stat.color }} />
              </div>
            </div>
          )}
        </div>
        <div className="rounded-xl p-2" style={{ backgroundColor: stat.bgColor, color: stat.color }}>
          {stat.icon}
        </div>
      </div>
    </motion.div>
  );
}

function AchievementCard({ achievement, index }: { achievement: UserAchievement; index: number }) {
  const colors = ['#00e5ff', '#7c4dff', '#f59e0b', '#22c55e'];
  const color = colors[index % colors.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 + index * 0.08, duration: 0.4 }}
      className="flex items-center gap-4 rounded-2xl user-glass-card p-4 border-l-4"
      style={{ borderLeftColor: color }}
    >
      <div className="relative flex h-12 w-12 items-center justify-center rounded-full" style={{ backgroundColor: color + '20', color }}>
        <StarOutlined style={{ fontSize: 20 }} />
        {achievement.isUnlocked ? (
          <CheckCircleOutlined
            style={{ position: 'absolute', bottom: -2, right: -2, color: '#22c55e', fontSize: 14, background: '#0B0B0F', borderRadius: '50%' }}
          />
        ) : (
          <LockOutlined style={{ position: 'absolute', bottom: -2, right: -2, color: '#64748b', fontSize: 12, background: '#0B0B0F', borderRadius: '50%' }} />
        )}
      </div>
      <div>
        <h4 className="text-sm font-bold text-white">{achievement.name}</h4>
        <p className="text-[11px] text-slate-500">{achievement.description}</p>
        {achievement.isUnlocked && achievement.unlockedAt && (
          <p className="text-[10px] text-primary mt-0.5">
            Đã mở khóa {new Date(achievement.unlockedAt).toLocaleDateString('vi-VN')}
          </p>
        )}
      </div>
    </motion.div>
  );
}

export default function UserProgressPage() {
  const [stats, setStats] = useState<UserStatistics | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Pick a random tip on mount and refresh
  const [tipIndex] = useState(() => Math.floor(Math.random() * MATE_TIPS.length));
  const currentTip = MATE_TIPS[tipIndex % MATE_TIPS.length];
  const tipText = currentTip.text.replace(
    /\{(\w+)\}/g,
    (_, key) => String(currentTip.vars(stats)),
  );

  const loadData = () => {
    setLoading(true);
    Promise.all([
      userService.getStatistics().catch(() => null),
      userService.getAchievements().catch(() => null),
    ]).then(([statsRes, achievementsRes]) => {
      if (statsRes) setStats(statsRes.data.data);
      if (achievementsRes) setAchievements(achievementsRes.data.data);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  const statCards: StatCard[] = [
    {
      label: 'Chuỗi ngày',
      value: stats ? `${stats.currentStreak} Ngày` : '—',
      sub: `Kỷ lục: ${stats?.longestStreak ?? 0} Ngày`,
      icon: <FireOutlined style={{ fontSize: 28 }} />,
      color: '#00e5ff',
      bgColor: 'rgba(0, 229, 255, 0.2)',
      borderColor: 'rgba(0, 229, 255, 0.4)',
      shadowClass: 'user-neon-blue',
      progress: stats ? Math.round((stats.currentStreak / Math.max(stats.longestStreak, 1)) * 100) : 0,
    },
    {
      label: 'Phút học',
      value: stats ? `${stats.totalMinutesLearned}p` : '—',
      sub: `${stats?.totalVideosWatched ?? 0} video`,
      icon: <ThunderboltOutlined style={{ fontSize: 28 }} />,
      color: '#7c4dff',
      bgColor: 'rgba(124, 77, 255, 0.2)',
      borderColor: 'rgba(124, 77, 255, 0.4)',
      shadowClass: 'user-neon-purple',
      progress: stats ? Math.min(stats.totalMinutesLearned / 10, 100) : 0,
    },
    {
      label: 'Flashcard',
      value: stats ? `${stats.totalFlashcardReviews}` : '—',
      sub: `${stats?.totalFlashcards ?? 0} thẻ đã tạo`,
      icon: <TranslationOutlined style={{ fontSize: 28 }} />,
      color: '#00e5ff',
      bgColor: 'rgba(0, 229, 255, 0.2)',
      borderColor: 'rgba(0, 229, 255, 0.4)',
      shadowClass: '',
      progress: stats ? Math.min(stats.totalFlashcardReviews / 5, 100) : 0,
    },
    {
      label: 'Quiz',
      value: stats ? `${stats.totalQuizzesTaken}` : '—',
      sub: `${stats?.totalWordsLookedUp ?? 0} từ đã tra`,
      icon: <PlayCircleOutlined style={{ fontSize: 28 }} />,
      color: '#7c4dff',
      bgColor: 'rgba(124, 77, 255, 0.2)',
      borderColor: 'rgba(124, 77, 255, 0.4)',
      shadowClass: '',
      progress: stats ? Math.min(stats.totalQuizzesTaken / 2, 100) : 0,
    },
  ];

  return (
    <div className="p-6 lg:p-10 min-h-full bg-gradient-cyber space-y-10">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white">
            Tiến độ{' '}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Học tập
            </span>
          </h1>
          <p className="mt-2 text-slate-400 text-sm">
            Theo dõi hành trình học tiếng Hàn của bạn qua tất cả các module.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            type="primary"
            icon={<BarChartOutlined />}
            onClick={() => setReportOpen(true)}
            className="!font-bold !rounded-xl !text-sm !flex !items-center !gap-2"
          >
            Tạo Báo cáo
          </Button>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <StatCard key={stat.label} stat={stat} index={i} />
        ))}
      </div>

      {/* Chart & Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="lg:col-span-2 rounded-2xl user-glass-card p-6 border border-white/5 relative overflow-hidden"
        >
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="mb-5 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Tổng quan hoạt động</h3>
            <Tooltip title="Làm mới">
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={loadData}
                className="!bg-white/5 !text-slate-400 !border-white/10 !rounded-lg hover:!bg-white/10 !flex !items-center"
              />
            </Tooltip>
          </div>
          <WeeklyChart stats={stats} key={refreshKey} />
        </motion.div>

        <div className="flex flex-col gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="rounded-2xl user-glass-card p-6 relative overflow-hidden"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary">
                  <path d="M4 19.5A2.5 2.5 0 016.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white uppercase tracking-tight">Lần ôn flashcard</h3>
            </div>
            <div className="mb-3 flex items-end justify-between">
              <span className="text-4xl font-black text-white">{stats?.totalFlashcardReviews ?? 0}</span>
              <span className="text-sm font-medium text-slate-400">Lần ôn</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/5 mb-4 overflow-hidden">
              <div className="h-full rounded-full"
                style={{ width: `${Math.min((stats?.totalFlashcardReviews ?? 0) / 5, 100)}%`, background: 'linear-gradient(90deg, #00e5ff, #7c4dff)' }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Tổng thẻ</p>
                <p className="text-lg font-bold text-white">{stats?.totalFlashcards ?? 0}</p>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Quiz</p>
                <p className="text-lg font-bold text-white">{stats?.totalQuizzesTaken ?? 0}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 p-5 relative border border-white/10 group overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-40 group-hover:scale-125 transition-transform">
              <BulbOutlined style={{ fontSize: 32, color: '#00e5ff' }} />
            </div>
            <h4 className="text-sm font-bold text-white mb-1">MATE Tip</h4>
            <p className="text-xs text-slate-300 leading-relaxed pr-8">
              {tipText}
            </p>
          </motion.div>
        </div>
      </div>

      {/* Achievements Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-2xl font-black text-white tracking-tight">
            Thành tựu{' '}
            <span className="text-secondary tracking-widest uppercase text-lg font-bold">Đã đạt được</span>
          </h3>
          <button
            onClick={() => setAchievementsExpanded(e => !e)}
            className="text-sm font-bold text-primary hover:underline !bg-transparent border-0 cursor-pointer"
          >
            {achievementsExpanded ? 'Thu gọn' : 'Xem tất cả'}
          </button>
        </div>

        {achievements.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.slice(0, achievementsExpanded ? undefined : 6).map((a, i) => (
              <AchievementCard key={a.id} achievement={a} index={i} />
            ))}
          </div>
        ) : (
          <div className="user-glass-card p-8 text-center">
            <AimOutlined className="text-4xl text-slate-600 mb-3" />
            <p className="text-slate-400">Chưa có thành tựu nào. Tiếp tục học để mở khóa!</p>
          </div>
        )}
      </motion.div>

      <div className="pointer-events-none fixed -bottom-20 -right-20 h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="pointer-events-none fixed -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-secondary/5 blur-[120px]" />

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        stats={stats}
        achievements={achievements}
      />
    </div>
  );
}
