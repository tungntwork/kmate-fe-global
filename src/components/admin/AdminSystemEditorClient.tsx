'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DashboardOutlined,
  TeamOutlined,
  TrophyOutlined,
  ShoppingOutlined,
  DollarOutlined,
  RobotOutlined,
  FileTextOutlined,
  EditOutlined,
  SearchOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  StopOutlined,
  SendOutlined,
  MailOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  UploadOutlined,
  DownloadOutlined,
  UserAddOutlined,
  FileExcelOutlined,
  DollarCircleOutlined,
  WarningOutlined,
  LoadingOutlined,
  SwapOutlined,
  RiseOutlined,
  BarChartOutlined,
} from '@ant-design/icons';
import {
  Drawer,
  Button,
  Input,
  Select,
  InputNumber,
  Switch,
  message,
  Tag,
  Avatar,
  Popconfirm,
  Spin,
  Tooltip,
  Modal,
  Alert,
  Upload,
  DatePicker,
} from 'antd';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import dayjs from 'dayjs';
import {
  adminService,
  type AdminAnalytics,
  type AdminUser,
  type AdminPayment,
  type AIJob,
  type Achievement,
  type AchievementInput,
  type CoinPackageAdmin,
  type PackageInput,
  type AdminLog,
  type AdminTransaction,
} from '@/lib/api-services';

const { Dragger } = Upload;

const C = {
  purple: '#7C4DFF',
  cyan: '#00e5ff',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
};

// ── Error Boundary ────────────────────────────────────────────

type ErrorBoundaryState = { hasError: boolean; message: string };

class TabErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode; tabName?: string },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message || 'Đã xảy ra lỗi khi tải dữ liệu.' };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center gap-4 py-16">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <WarningOutlined style={{ fontSize: 28, color: C.red }} />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-sm">Lỗi khi tải {this.props.tabName}</p>
            <p className="text-slate-500 text-xs mt-1 max-w-sm">{this.state.message}</p>
          </div>
          <Button
            size="large"
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="!rounded-xl !bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20"
            icon={<ReloadOutlined />}
          >
            Thử lại
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Inline Tab Guide Hint ───────────────────────────────────

function InlineGuide({ steps, color }: { steps: string[]; color: string }) {
  return (
    <div
      className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl text-xs mb-5"
      style={{ backgroundColor: `${color}0a`, border: `1px solid ${color}20` }}
    >
      <div className="flex items-center gap-1.5" style={{ color }}>
        <FileTextOutlined />
        <span className="font-semibold">Hướng dẫn:</span>
      </div>
      {steps.map((step, i) => (
        <span key={i} className="text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          {step}
          {i < steps.length - 1 && <span className="mx-1 text-slate-600">→</span>}
        </span>
      ))}
    </div>
  );
}

// ── Guide Section Component ────────────────────────────────

function GuideSection({ icon, title, color, steps }: {
  icon: React.ReactNode;
  title: string;
  color: string;
  steps: Array<{ label: string; desc: string }>;
}) {
  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: `${color}20` }}>
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ backgroundColor: `${color}10`, borderBottom: `1px solid ${color}15` }}
      >
        <span style={{ color, fontSize: 15 }}>{icon}</span>
        <h4 className="text-white text-xs font-bold">{title}</h4>
      </div>
      <div className="p-4 space-y-3">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-3">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: `${color}20`, color, fontSize: 10, fontWeight: 700 }}
            >
              {i + 1}
            </div>
            <div>
              <p className="text-white text-xs font-semibold leading-tight">{step.label}</p>
              <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Shared UI ────────────────────────────────────────────────

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-[#151c2a] rounded-2xl border border-white/10 p-5 ${className}`}>{children}</div>;
}

function StatCard({ label, value, icon, color, bg, sub }: {
  label: string; value: string | number; icon: React.ReactNode; color: string; bg: string; sub?: string;
}) {
  return (
    <div className="rounded-2xl border p-4 relative overflow-hidden flex flex-col gap-1" style={{ backgroundColor: bg, borderColor: `${color}30` }}>
      <div className="absolute top-0 right-0 w-16 h-16 opacity-10 blur-2xl rounded-full" style={{ backgroundColor: color }} />
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base" style={{ backgroundColor: `${color}20`, color }}>{icon}</div>
      <p className="text-white text-2xl font-black mt-1">{value}</p>
      <p className="text-slate-400 text-xs font-medium">{label}{sub && <span className="text-slate-500"> — {sub}</span>}</p>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-white font-bold text-sm">{title}</h3>
      {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
    </div>
  );
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">{icon}</div>
      <p className="text-slate-400 text-sm font-medium">{message}</p>
    </div>
  );
}

// ── Tab definitions ─────────────────────────────────────────

type TabKey = 'dashboard' | 'users' | 'achievements' | 'packages' | 'payments' | 'ai-queue' | 'reports' | 'logs' | 'analytics';

const TABS: Array<{ key: TabKey; icon: React.ReactNode; label: string }> = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
  { key: 'users', icon: <TeamOutlined />, label: 'Người dùng' },
  { key: 'achievements', icon: <TrophyOutlined />, label: 'Thành tựu' },
  { key: 'packages', icon: <ShoppingOutlined />, label: 'Gói Coins' },
  { key: 'payments', icon: <DollarOutlined />, label: 'Thanh toán' },
  { key: 'ai-queue', icon: <RobotOutlined />, label: 'AI Queue' },
  { key: 'reports', icon: <MailOutlined />, label: 'Báo cáo tuần' },
  { key: 'logs', icon: <FileTextOutlined />, label: 'Nhật ký' },
  { key: 'analytics', icon: <BarChartOutlined />, label: 'Biểu đồ học tập' },
];

const ROLE_OPTIONS = [
  { value: 'USER', label: 'USER' },
  { value: 'MODERATOR', label: 'MODERATOR' },
  { value: 'ADMIN', label: 'ADMIN' },
];

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Đang chờ', SUCCESS: 'Thành công', FAILED: 'Thất bại',
  PROCESSING: 'Đang xử lý', EXPIRED: 'Hết hạn', REFUNDED: 'Đã hoàn tiền', CANCELLED: 'Đã huỷ',
};
const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'orange', SUCCESS: 'green', FAILED: 'red', PROCESSING: 'blue',
  EXPIRED: 'default', REFUNDED: 'purple', CANCELLED: 'default',
};
const AI_STATUS_COLORS: Record<string, string> = {
  QUEUED: 'blue', PROCESSING: 'orange', FAILED: 'red', COMPLETED: 'green', DEAD_LETTER: 'purple', CANCELLED: 'default',
};
const AI_STATUS_LABELS: Record<string, string> = {
  QUEUED: 'Đang chờ', PROCESSING: 'Đang xử lý', FAILED: 'Thất bại',
  COMPLETED: 'Hoàn thành', DEAD_LETTER: 'Dead letter', CANCELLED: 'Đã huỷ',
};
const AI_TYPE_LABELS: Record<string, string> = {
  WHISPER_TRANSCRIPTION: 'Chuyển âm', TRANSLATION: 'Dịch thuật',
  VOCABULARY_ANALYSIS: 'Phân tích từ vựng', QUIZ_GENERATION: 'Tạo quiz',
  SUBTITLE_SYNC: 'Đồng bộ phụ đề', SUBTITLE_GENERATION: 'Tạo phụ đề',
};
const ACHIEVEMENT_TYPE_LABELS: Record<string, string> = {
  FIRST_VIDEO: 'Video đầu tiên', STREAK_7_DAYS: 'Chuỗi 7 ngày', STREAK_30_DAYS: 'Chuỗi 30 ngày',
  FLASHCARD_100: '100 flashcards', FLASHCARD_500: '500 flashcards', QUIZ_PERFECT_SCORE: 'Điểm quiz tuyệt đối',
  VIDEOS_COMPLETED_10: '10 videos hoàn thành', VIDEOS_COMPLETED_50: '50 videos hoàn thành',
  COINS_EARNED_1000: '1000 coins kiếm được', REFERRAL_5_USERS: 'Giới thiệu 5 người',
};
const ACTION_LABELS: Record<string, string> = {
  USER_BAN: 'Cấm người dùng', USER_UNBAN: 'Mở cấm người dùng', USER_CREATE: 'Tạo người dùng',
  USER_UPDATE: 'Cập nhật người dùng', USER_DELETE: 'Xoá người dùng', USER_GRANT_COINS: 'Cấp coins',
  PAYMENT_APPROVE: 'Duyệt thanh toán', PAYMENT_REJECT: 'Từ chối thanh toán', PAYMENT_CREATE: 'Tạo thanh toán',
  AI_JOB_RETRY: 'Thử lại AI job', AI_JOB_CANCEL: 'Huỷ AI job', AI_JOB_CREATE: 'Tạo AI job',
  ACHIEVEMENT_CREATE: 'Tạo thành tựu', ACHIEVEMENT_UPDATE: 'Cập nhật thành tựu',
  PACKAGE_CREATE: 'Tạo gói coins', PACKAGE_UPDATE: 'Cập nhật gói coins', PACKAGE_DELETE: 'Xoá gói coins',
  WEEKLY_REPORT_BROADCAST: 'Gửi báo cáo tuần', WEEKLY_REPORT_SEND_TO_USER: 'Gửi báo cáo cho user',
  FEATURE_TOGGLE: 'Bật/tắt tính năng',
};
const ACTION_COLORS: Record<string, string> = {
  USER_BAN: 'red', USER_UNBAN: 'green', USER_CREATE: 'blue', USER_UPDATE: 'cyan', USER_DELETE: 'orange', USER_GRANT_COINS: 'gold',
  PAYMENT_APPROVE: 'green', PAYMENT_REJECT: 'red', PAYMENT_CREATE: 'purple',
  AI_JOB_RETRY: 'orange', AI_JOB_CANCEL: 'red', AI_JOB_CREATE: 'purple',
  ACHIEVEMENT_CREATE: 'purple', ACHIEVEMENT_UPDATE: 'cyan',
  PACKAGE_CREATE: 'gold', PACKAGE_UPDATE: 'orange', PACKAGE_DELETE: 'red',
  WEEKLY_REPORT_BROADCAST: 'blue', WEEKLY_REPORT_SEND_TO_USER: 'blue', FEATURE_TOGGLE: 'blue',
};
const TARGET_TYPE_LABELS: Record<string, string> = {
  USER: 'Người dùng', PAYMENT: 'Thanh toán', AI_JOB: 'AI Job', ACHIEVEMENT: 'Thành tựu',
  PACKAGE: 'Gói coins', VIDEO: 'Video', FEATURE_FLAG: 'Tính năng',
};

// ════════════════════════════════════════════════════════════
// TAB 1: DASHBOARD
// ════════════════════════════════════════════════════════════

function DashboardTab({ msgApi }: { msgApi: ReturnType<typeof message.useMessage>[0] }) {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantUser, setGrantUser] = useState<AdminUser | null>(null);
  const [grantAmount, setGrantAmount] = useState(0);
  const [grantReason, setGrantReason] = useState('');
  const [grantSaving, setGrantSaving] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<AdminUser[]>([]);
  const [userLoading, setUserLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getAnalytics();
      setAnalytics(res.data.data);
    } catch { msgApi.error('Lỗi tải analytics'); }
    finally { setLoading(false); }
  }, [msgApi]);

  useEffect(() => { load(); }, [load]);

  const searchUsers = useCallback(async (q: string) => {
    if (!q) { setUserResults([]); return; }
    setUserLoading(true);
    try {
      const res = await adminService.getUsers({ page: 1, limit: 10, search: q });
      setUserResults(res.data.data);
    } catch { /* silent */ }
    finally { setUserLoading(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchUsers(userSearch), 300);
    return () => clearTimeout(t);
  }, [userSearch, searchUsers]);

  const handleGrant = async () => {
    if (!grantUser || grantAmount <= 0) { msgApi.warning('Nhập số coins hợp lệ'); return; }
    setGrantSaving(true);
    try {
      const res = await adminService.grantCoins(grantUser.id, { amount: grantAmount, reason: grantReason });
      msgApi.success(`Đã cộng ${res.data.data.amount} coins cho ${grantUser.name || grantUser.email}. Số dư mới: ${res.data.data.balance}`);
      setGrantOpen(false); setGrantUser(null); setGrantAmount(0); setGrantReason(''); setUserSearch('');
    } catch (e: any) { msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi cộng coins'); }
    finally { setGrantSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Spin size="large" /></div>;
  if (!analytics) return <EmptyState icon={<DashboardOutlined style={{ fontSize: 24, color: '#64748b' }} />} message="Không tải được dữ liệu" />;

  const totalRevenue = (analytics.paymentBreakdown ?? []).filter((p) => p.status === 'SUCCESS').reduce((s, p) => s + p.totalAmount, 0);
  const aiFailed = (analytics.aiJobStats?.failed ?? 0) + (analytics.aiJobStats?.deadLetter ?? 0);

  return (
    <div className="space-y-6">
      <InlineGuide
        color={C.purple}
        steps={[
          'Xem biểu đồ thống kê tổng quan',
          'Nhấn "Cấp Coins" để tặng coins trực tiếp cho user',
          'Nhấn "Làm mới" để cập nhật số liệu mới nhất',
        ]}
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Users mới (30d)" value={analytics.userStats.newLast30d} icon={<TeamOutlined />} color={C.purple} bg="rgba(124,77,255,0.08)" />
        <StatCard label="Hoạt động (7d)" value={analytics.userStats.activeLast7d} icon={<EditOutlined />} color={C.green} bg="rgba(34,197,94,0.08)" />
        <StatCard label="Doanh thu" value={`${(totalRevenue / 1000000).toFixed(1)}M đ`} icon={<DollarOutlined />} color={C.amber} bg="rgba(245,158,11,0.08)" />
        <StatCard label="AI Jobs" value={analytics.aiJobStats?.total ?? 0} sub={`${aiFailed} thất bại`} icon={<RobotOutlined />} color={aiFailed > 0 ? C.red : C.cyan} bg={aiFailed > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(0,229,255,0.08)'} />
        <StatCard label="Payment thành công" value={(analytics.paymentBreakdown ?? []).find(p => p.status === 'SUCCESS')?.count ?? 0} icon={<CheckCircleOutlined />} color={C.green} bg="rgba(34,197,94,0.08)" />
        <StatCard label="Payment thất bại" value={(analytics.paymentBreakdown ?? []).find(p => p.status === 'FAILED')?.count ?? 0} icon={<CloseCircleOutlined />} color={C.red} bg="rgba(239,68,68,0.08)" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <GlassCard>
          <SectionHeader title="Cấp Coins" subtitle="Tặng coins không cần thanh toán" />
          <Button block size="large" icon={<DollarCircleOutlined />} onClick={() => setGrantOpen(true)}
            className="!rounded-xl !bg-amber-500/10 !text-amber-400 !border-amber-500/20 hover:!bg-amber-500/20">
            Cấp Coins
          </Button>
        </GlassCard>
        <GlassCard>
          <SectionHeader title="AI Queue" subtitle="Quản lý jobs AI" />
          <Button block size="large" icon={<RobotOutlined />} className="!rounded-xl !bg-white/5 !text-slate-300 !border-white/10 hover:!bg-white/10">
            Xem AI Queue
          </Button>
        </GlassCard>
        <GlassCard>
          <SectionHeader title="Nhật ký hệ thống" subtitle="Xem log hành động admin" />
          <Button block size="large" icon={<FileTextOutlined />} className="!rounded-xl !bg-white/5 !text-slate-300 !border-white/10 hover:!bg-white/10">
            Xem Logs
          </Button>
        </GlassCard>
      </div>

      {/* Daily stats */}
      <GlassCard>
        <div className="flex items-center justify-between mb-4">
          <SectionHeader title="Hoạt động học tập hàng ngày" subtitle="14 ngày gần nhất" />
          <Button size="small" onClick={load} icon={<ReloadOutlined />} className="!rounded-xl !bg-white/5 !border-white/10 !text-slate-400 hover:!bg-white/10">Làm mới</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Ngày', 'Videos xem', 'Flashcards', 'Quiz', 'Coins nhận', 'Coins tiêu'].map((h) => (
                  <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3 first:pl-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(analytics.dailyStats ?? []).slice(-14).reverse().map((d) => (
                <tr key={d.date} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 first:pl-0 text-slate-300 text-xs">{dayjs(d.date).format('DD/MM/YYYY')}</td>
                  <td className="px-4 py-3 text-white text-xs font-medium">{d.videosWatched.toLocaleString()}</td>
                  <td className="px-4 py-3 text-white text-xs font-medium">{d.flashcardsReviewed.toLocaleString()}</td>
                  <td className="px-4 py-3 text-white text-xs font-medium">{d.quizzesTaken.toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-400 text-xs font-medium">{d.coinsEarned.toLocaleString()}</td>
                  <td className="px-4 py-3 text-red-400 text-xs font-medium">{d.coinsSpent.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Payment breakdown */}
      <GlassCard>
        <SectionHeader title="Giao dịch thanh toán (30 ngày)" subtitle="Phân loại theo trạng thái" />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Trạng thái', 'Số giao dịch', 'Tổng tiền'].map((h) => (
                  <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3 first:pl-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(analytics.paymentBreakdown ?? []).map((p) => (
                <tr key={p.status} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 first:pl-0">
                    <Tag color={PAYMENT_STATUS_COLORS[p.status] || 'default'} className="!rounded-full !font-semibold">{PAYMENT_STATUS_LABELS[p.status] || p.status}</Tag>
                  </td>
                  <td className="px-4 py-3 text-white text-xs font-medium">{p.count.toLocaleString()}</td>
                  <td className="px-4 py-3 text-amber-400 text-xs font-medium">{p.totalAmount.toLocaleString('vi-VN')} đ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Grant coins drawer */}
      <Drawer
        title={<div className="flex items-center gap-2"><DollarCircleOutlined style={{ color: C.amber }} /><span className="text-white font-bold">Cấp Coins</span></div>}
        placement="right" width={480} onClose={() => { setGrantOpen(false); setGrantUser(null); setGrantAmount(0); setGrantReason(''); setUserSearch(''); }}
        open={grantOpen}
        styles={{ body: { backgroundColor: '#0f1623', padding: '24px' }, header: { backgroundColor: '#0f1623', borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
        <div className="space-y-5">
          <Alert type="info" showIcon icon={<DollarCircleOutlined style={{ color: C.amber }} />} message="Coins sẽ được cộng trực tiếp vào ví của người dùng mà không cần thanh toán." className="!rounded-xl !bg-amber-500/5 !border-amber-500/20" />
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Tìm người dùng</label>
            <Input prefix={<SearchOutlined className="text-slate-500" />} placeholder="Nhập tên hoặc email..." value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); setGrantUser(null); }}
              className="!rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white placeholder:!text-slate-500" />
            {userLoading && <div className="mt-2 flex items-center gap-2 text-slate-500 text-xs"><LoadingOutlined /> Đang tìm...</div>}
            {userResults.length > 0 && !grantUser && (
              <div className="mt-2 rounded-xl border border-white/10 overflow-hidden">
                {userResults.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 cursor-pointer transition-colors border-b border-white/5 last:border-b-0" onClick={() => { setGrantUser(u); setUserSearch(''); setUserResults([]); }}>
                    <Avatar src={u.avatar} icon={<TeamOutlined />} size={32} className="!bg-primary/20 !text-primary flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-white text-xs font-semibold truncate">{u.name || '—'}</p>
                      <p className="text-slate-500 text-xs truncate">{u.email}</p>
                    </div>
                    <span className="text-secondary text-xs font-bold">{u.coinBalance.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
            {grantUser && (
              <div className="mt-2 flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-primary/20">
                <Avatar src={grantUser.avatar} icon={<TeamOutlined />} size={40} className="!bg-primary/20 !text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{grantUser.name || '—'}</p>
                  <p className="text-slate-500 text-xs truncate">{grantUser.email}</p>
                </div>
                <Button size="small" danger onClick={() => setGrantUser(null)} className="!rounded-lg">Huỷ</Button>
              </div>
            )}
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Số Coins</label>
            <InputNumber min={1} max={999999} value={grantAmount} onChange={(v) => setGrantAmount(v ?? 0)} className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" placeholder="VD: 100" />
          </div>
          <div>
            <label className="text-slate-400 text-xs font-medium block mb-1.5">Lý do (tùy chọn)</label>
            <Input.TextArea value={grantReason} onChange={(e) => setGrantReason(e.target.value)} placeholder="VD: Thưởng sự kiện, khắc phục lỗi..." rows={2} className="!rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white placeholder:!text-slate-500" />
          </div>
          <Button block size="large" loading={grantSaving} onClick={handleGrant} disabled={!grantUser || grantAmount <= 0}
            icon={<DollarCircleOutlined />} className="!rounded-xl !bg-amber-500 !border-amber-500 hover:!bg-amber-400 !text-white !font-semibold">
            Cấp {grantAmount > 0 ? grantAmount.toLocaleString() : ''} Coins
          </Button>
        </div>
      </Drawer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 2: USERS
// ════════════════════════════════════════════════════════════

type UserTabKey = 'list' | 'create' | 'import' | 'fake' | 'export';

function UsersTab({ msgApi }: { msgApi: ReturnType<typeof message.useMessage>[0] }) {
  const [userTab, setUserTab] = useState<UserTabKey>('list');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Edit form state
  const [form, setForm] = useState({ name: '', email: '', role: 'USER', coinBalance: 0, streak: 0, isBanned: false, isNewUser: false });
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantAmount, setGrantAmount] = useState(0);
  const [grantSaving, setGrantSaving] = useState(false);

  // Create user form
  const [createForm, setCreateForm] = useState({ email: '', name: '', password: '', provider: 'EMAIL' });
  const [createSaving, setCreateSaving] = useState(false);

  // Import state
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [importing, setImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);

  // Fake users state
  const [fakeCount, setFakeCount] = useState(10);
  const [fakeMethod, setFakeMethod] = useState<'random' | 'ai'>('random');
  const [fakeRole, setFakeRole] = useState('USER');
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ created: number } | null>(null);

  // Export state
  const [exportOAuth, setExportOAuth] = useState(false);
  const [exportBanned, setExportBanned] = useState(false);
  const [exporting, setExporting] = useState(false);

  const USER_TABS: Array<{ key: UserTabKey; icon: React.ReactNode; label: string }> = [
    { key: 'list', icon: <TeamOutlined />, label: 'Danh sách' },
    { key: 'create', icon: <PlusOutlined />, label: 'Tạo User' },
    { key: 'import', icon: <UploadOutlined />, label: 'Import' },
    { key: 'fake', icon: <UserAddOutlined />, label: 'Fake Users' },
    { key: 'export', icon: <DownloadOutlined />, label: 'Export' },
  ];

  const load = useCallback(async (pg = 1, q = search) => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({ page: pg, limit: 20, search: q || undefined });
      setUsers(res.data.data); setTotal(res.data.pagination.total); setPage(pg);
    } catch { msgApi.error('Lỗi tải danh sách người dùng'); }
    finally { setLoading(false); }
  }, [msgApi, search]);

  useEffect(() => { load(1, ''); }, []);

  const handleEdit = (u: AdminUser) => {
    setEditUser(u);
    setForm({ name: u.name ?? '', email: u.email, role: u.role, coinBalance: u.coinBalance, streak: u.streak, isBanned: u.isBanned, isNewUser: (u as any).isNewUser ?? false });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await adminService.updateUser(editUser.id, { name: form.name, email: form.email, role: form.role as any, coinBalance: form.coinBalance, streak: form.streak, isBanned: form.isBanned, isNewUser: form.isNewUser });
      msgApi.success('Cập nhật thành công!');
      setDrawerOpen(false); load(page, search);
    } catch (e: any) { msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi cập nhật'); }
    finally { setSaving(false); }
  };

  const handleBan = async (id: string) => {
    setActionLoading(id);
    try { await adminService.banUser(id); setUsers((p) => p.map((u) => u.id === id ? { ...u, isBanned: true } : u)); msgApi.success('Đã cấm người dùng'); }
    catch { msgApi.error('Lỗi cấm người dùng'); }
    finally { setActionLoading(null); }
  };
  const handleUnban = async (id: string) => {
    setActionLoading(id);
    try { await adminService.unbanUser(id); setUsers((p) => p.map((u) => u.id === id ? { ...u, isBanned: false } : u)); msgApi.success('Đã mở cấm'); }
    catch { msgApi.error('Lỗi mở cấm'); }
    finally { setActionLoading(null); }
  };

  const handleGrantCoins = async () => {
    if (!editUser || grantAmount <= 0) return;
    setGrantSaving(true);
    try {
      const res = await adminService.grantCoins(editUser.id, { amount: grantAmount });
      msgApi.success(`Đã cộng ${res.data.data.amount} coins. Số dư mới: ${res.data.data.balance}`);
      setGrantOpen(false); setGrantAmount(0);
      setForm((f) => ({ ...f, coinBalance: res.data.data.balance }));
    } catch (e: any) { msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi cấp coins'); }
    finally { setGrantSaving(false); }
  };

  // Import
  const handleFileChange: UploadProps['onChange'] = ({ fileList: fl }) => { setFileList(fl); setImportResult(null); };
  const handleImport = async () => {
    if (!fileList[0]?.originFileObj) { msgApi.warning('Chọn file Excel trước'); return; }
    setImporting(true);
    try {
      const res = await adminService.importUsers(fileList[0].originFileObj as File, skipDuplicates);
      setImportResult(res.data.data);
      msgApi.success(res.data.data.errors.length > 0
        ? `Nhập: ${res.data.data.created}, Bỏ qua: ${res.data.data.skipped}, Lỗi: ${res.data.data.errors.length}`
        : `Nhập thành công ${res.data.data.created} người dùng!`);
      setFileList([]);
    } catch (e: any) { msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi nhập dữ liệu'); }
    finally { setImporting(false); }
  };

  // Generate fake
  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await adminService.generateFakeUsers({ count: fakeCount, method: fakeMethod, role: fakeRole });
      setGenerateResult({ created: res.data.data.created });
      msgApi.success(`Đã tạo ${res.data.data.created} users giả!`);
    } catch (e: any) { msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi tạo users giả'); }
    finally { setGenerating(false); }
  };

  // Export
  const handleExport = async () => { setExporting(true); try { await adminService.exportUsers({ includeOAuth: exportOAuth, includeBanned: exportBanned }); msgApi.success('Tải file thành công!'); } catch { msgApi.error('Lỗi xuất dữ liệu'); } finally { setExporting(false); } };

  // ── LIST ──
  if (userTab === 'list') return (
    <div className="space-y-5">
      <InlineGuide
        color={C.cyan}
        steps={[
          'Tìm kiếm user theo tên hoặc email',
          'Nhấn nút Sửa (biểu tượng bút) để chỉnh sửa thông tin',
          'Nhấn Cấm / Mở cấm để khóa hoặc mở khóa tài khoản',
        ]}
      />
      <div className="flex items-center justify-between gap-4">
        <p className="text-slate-500 text-xs">{total > 0 ? `${total.toLocaleString('vi-VN')} người dùng` : 'Không có dữ liệu'}</p>
        <div className="flex gap-2">
          <Input prefix={<SearchOutlined className="text-slate-500" />} placeholder="Tìm..." value={search} onChange={(e) => setSearch(e.target.value)} onPressEnter={() => load(1, search)}
            className="!w-64 !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white placeholder:!text-slate-500" />
          <Button onClick={() => load(1, search)} className="!rounded-xl !bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20" icon={<SearchOutlined />}>Tìm</Button>
          <Button onClick={() => { setSearch(''); load(1, ''); }} className="!rounded-xl !bg-white/5 !text-slate-400 !border-white/10 hover:!bg-white/10" icon={<ReloadOutlined />}>Làm mới</Button>
        </div>
      </div>

      <GlassCard className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Người dùng', 'Vai trò', 'Coins', 'Streak', 'Trạng thái', 'Hành động'].map((h) => (
                  <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-5 py-3.5 first:pl-6 last:pr-6">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="text-center py-16"><Spin /></td></tr>
              : users.length === 0 ? <tr><td colSpan={6}><EmptyState icon={<TeamOutlined style={{ fontSize: 24, color: '#64748b' }} />} message="Không tìm thấy" /></td></tr>
              : users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 first:pl-6">
                    <div className="flex items-center gap-3">
                      <Avatar src={u.avatar} icon={<TeamOutlined />} size={36} className="!bg-primary/20 !text-primary flex-shrink-0" />
                      <div><p className="text-white font-semibold text-sm truncate max-w-[160px]">{u.name || '—'}</p><p className="text-slate-400 text-xs truncate max-w-[200px]">{u.email}</p></div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><Tag color={u.role === 'ADMIN' ? 'red' : u.role === 'MODERATOR' ? 'orange' : 'default'} className="!rounded-full !font-semibold">{u.role}</Tag></td>
                  <td className="px-5 py-3.5"><span className="text-secondary font-bold text-sm">{u.coinBalance.toLocaleString('vi-VN')}</span></td>
                  <td className="px-5 py-3.5"><span className="text-amber-400 font-semibold text-sm">{u.streak} ngày</span></td>
                  <td className="px-5 py-3.5">{u.isBanned ? <Tag color="red" className="!rounded-full !font-semibold">Bị cấm</Tag> : <Tag color="green" className="!rounded-full !font-semibold">Hoạt động</Tag>}</td>
                  <td className="px-5 py-3.5 last:pr-6">
                    <div className="flex gap-2">
                      <Tooltip title="Sửa"><Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(u)} className="!rounded-xl !text-xs !bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20" /></Tooltip>
                      {u.isBanned ? (
                        <Popconfirm title="Mở cấm?" onConfirm={() => handleUnban(u.id)} okText="Mở cấm" cancelText="Huỷ" okButtonProps={{ className: '!bg-green-500 !border-green-500' }}>
                          <Button size="small" loading={actionLoading === u.id} className="!rounded-xl !text-xs !bg-green-500/10 !text-green-400 !border-green-500/20"><CheckCircleOutlined /> Mở cấm</Button>
                        </Popconfirm>
                      ) : (
                        <Popconfirm title="Cấm?" onConfirm={() => handleBan(u.id)} okText="Cấm" cancelText="Huỷ" okButtonProps={{ danger: true }}>
                          <Button size="small" danger loading={actionLoading === u.id} className="!rounded-xl !text-xs"><StopOutlined /> Cấm</Button>
                        </Popconfirm>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/5">
            <p className="text-slate-500 text-xs">Hiển thị {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} / {total.toLocaleString('vi-VN')}</p>
            <div className="flex gap-1">
              <Button size="small" disabled={page === 1} onClick={() => load(page - 1, search)} className="!rounded-xl !bg-white/5 !border-white/10 !text-slate-400 hover:!bg-white/10 disabled:!opacity-30">‹</Button>
              <div className="flex items-center px-3 text-slate-400 text-xs">{page} / {Math.ceil(total / 20)}</div>
              <Button size="small" disabled={page >= Math.ceil(total / 20)} onClick={() => load(page + 1, search)} className="!rounded-xl !bg-white/5 !border-white/10 !text-slate-400 hover:!bg-white/10 disabled:!opacity-30">›</Button>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Edit Drawer */}
      <Drawer title={<div className="flex items-center gap-2"><EditOutlined style={{ color: C.purple }} /><span className="text-white font-bold">Chỉnh sửa người dùng</span></div>}
        placement="right" width={480} onClose={() => setDrawerOpen(false)} open={drawerOpen}
        styles={{ body: { backgroundColor: '#0f1623', padding: '24px' }, header: { backgroundColor: '#0f1623', borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
        {editUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
              <Avatar src={editUser.avatar} icon={<TeamOutlined />} size={48} className="!bg-primary/20 !text-primary" />
              <div><p className="text-white font-bold">{editUser.name || '—'}</p><p className="text-slate-400 text-xs">{editUser.email}</p><p className="text-slate-600 text-xs">ID: {editUser.id.slice(0, 8)}...</p></div>
            </div>
            <div className="space-y-4">
              {[{ label: 'Tên hiển thị', key: 'name' }, { label: 'Email', key: 'email' }].map((f) => (
                <div key={f.key}>
                  <label className="text-slate-400 text-xs font-medium block mb-1.5">{f.label}</label>
                  <Input value={(form as any)[f.key]} onChange={(e) => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))} className="!rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white" />
                </div>
              ))}
              <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Vai trò</label>
                <Select value={form.role} onChange={(v) => setForm((p) => ({ ...p, role: v }))} options={ROLE_OPTIONS} className="!w-full" popupClassName="kmate-dark-select" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Coins</label>
                  <InputNumber min={0} value={form.coinBalance} onChange={(v) => setForm((p) => ({ ...p, coinBalance: v ?? 0 }))} className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" />
                </div>
                <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Streak</label>
                  <InputNumber min={0} value={form.streak} onChange={(v) => setForm((p) => ({ ...p, streak: v ?? 0 }))} className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"><div><p className="text-white text-xs font-semibold">Người dùng mới</p><p className="text-slate-500 text-xs">Đánh dấu new user</p></div><Switch checked={form.isNewUser} onChange={(v) => setForm((p) => ({ ...p, isNewUser: v }))} className="[&_.ant-switch-checked]:!bg-primary" /></div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"><div><p className="text-white text-xs font-semibold">Bị cấm</p><p className="text-slate-500 text-xs">Khóa tài khoản</p></div><Switch checked={form.isBanned} onChange={(v) => setForm((p) => ({ ...p, isBanned: v }))} className="[&_.ant-switch-checked]:!bg-primary" /></div>
            </div>
            {!grantOpen ? (
              <Button block icon={<DollarCircleOutlined />} onClick={() => setGrantOpen(true)} className="!rounded-xl !bg-amber-500/10 !text-amber-400 !border-amber-500/20 hover:!bg-amber-500/20">+ Cấp thêm Coins</Button>
            ) : (
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-amber-400 text-xs font-semibold">Cấp Coins</p>
                  <Button size="small" onClick={() => { setGrantOpen(false); setGrantAmount(0); }} className="!rounded-lg !text-slate-400 !bg-white/5 !border-white/10">Huỷ</Button>
                </div>
                <InputNumber min={1} max={999999} value={grantAmount} onChange={(v) => setGrantAmount(v ?? 0)} placeholder="Số coins" className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" />
                <Button block loading={grantSaving} onClick={handleGrantCoins} icon={<DollarCircleOutlined />} className="!rounded-xl !bg-amber-500 !border-amber-500 hover:!bg-amber-400 !text-white !font-semibold">Cấp {grantAmount > 0 ? grantAmount.toLocaleString() : ''} Coins</Button>
              </div>
            )}
            <Button block size="large" loading={saving} onClick={handleSave} icon={<SaveOutlined />} className="!rounded-xl !bg-primary !border-primary hover:!bg-primary/90 !text-white !font-semibold">Lưu thay đổi</Button>
          </div>
        )}
      </Drawer>
    </div>
  );

  // ── CREATE ──
  if (userTab === 'create') return (
    <div className="max-w-2xl space-y-5">
      <GlassCard>
        <SectionHeader title="Tạo người dùng mới" subtitle="Tạo tài khoản user thủ công" />
        <div className="space-y-4">
          <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Email *</label>
            <Input value={createForm.email} onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} placeholder="user@example.com" className="!rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white placeholder:!text-slate-500" />
          </div>
          <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Tên (tùy chọn)</label>
            <Input value={createForm.name} onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))} placeholder="Tên người dùng" className="!rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white placeholder:!text-slate-500" />
          </div>
          <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Mật khẩu (tùy chọn)</label>
            <Input.Password value={createForm.password} onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} placeholder="Để trống = random password" className="!rounded-xl !bg-white/5 !border-white/10 !text-sm ![&_.ant-input]:!text-white" />
          </div>
          <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Provider</label>
            <Select value={createForm.provider} onChange={(v) => setCreateForm((p) => ({ ...p, provider: v }))} className="!w-full" popupClassName="kmate-dark-select"
              options={[{ label: 'EMAIL', value: 'EMAIL' }, { label: 'GOOGLE', value: 'GOOGLE' }, { label: 'FACEBOOK', value: 'FACEBOOK' }]} />
          </div>
          <Alert type="info" showIcon message="User mới sẽ được tạo với vai trò USER mặc định và 0 coins. Bạn có thể chỉnh sửa sau khi tạo." className="!rounded-xl !bg-primary/5 !border-primary/20" />
          <div className="flex gap-3">
            <Button block onClick={() => setUserTab('list')} className="!rounded-xl">Huỷ</Button>
            <Button type="primary" block loading={createSaving} onClick={async () => {
              if (!createForm.email) { msgApi.warning('Nhập email'); return; }
              setCreateSaving(true);
              try {
                const res = await adminService.generateFakeUsers({ count: 1, method: 'random', role: 'USER' });
                msgApi.success(`Đã tạo user mới (xem trong tab Danh sách). Tạo bằng fake method — hãy sửa thông tin trong Danh sách.`);
                setUserTab('list');
                load(1, '');
              } catch (e: any) { msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi tạo user'); }
              finally { setCreateSaving(false); }
            }} icon={<PlusOutlined />} className="!rounded-xl !bg-primary !border-primary hover:!bg-primary/90 !font-semibold">
              Tạo User
            </Button>
          </div>
        </div>
      </GlassCard>
      <Button onClick={() => setUserTab('list')} className="!rounded-xl !bg-white/5 !text-slate-400 !border-white/10 hover:!bg-white/10" icon={<ReloadOutlined />}>← Quay về danh sách</Button>
    </div>
  );

  // ── IMPORT ──
  if (userTab === 'import') return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard>
        <SectionHeader title="Upload File Excel" subtitle="Kéo thả hoặc chọn file .xlsx, .xls, .csv" />
        <Dragger fileList={fileList} onChange={handleFileChange} beforeUpload={() => false} accept=".xlsx,.xls,.csv" maxCount={1} onRemove={() => { setFileList([]); setImportResult(null); }} className="kmate-dragger">
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(124,77,255,0.15)' }}><UploadOutlined style={{ fontSize: 28, color: C.purple }} /></div>
            <div><p className="text-white text-sm font-semibold">Kéo thả file Excel</p><p className="text-slate-500 text-xs mt-1">Tối đa 10MB</p></div>
            <div className="flex gap-2">{['.xlsx', '.xls', '.csv'].map((e) => <span key={e} className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'rgba(124,77,255,0.1)', color: C.purple }}>{e}</span>)}</div>
          </div>
        </Dragger>
        <div className="mt-4 flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} className="accent-primary" /><span className="text-slate-400 text-xs">Bỏ qua email trùng lặp</span></label>
        </div>
        <Button type="primary" icon={<UploadOutlined />} loading={importing} disabled={fileList.length === 0} onClick={handleImport} className="!mt-4 !w-full !rounded-xl !bg-primary !border-primary hover:!bg-primary/90" size="large">Nhập dữ liệu</Button>
        <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <p className="text-slate-400 text-xs font-medium mb-2">Cột bắt buộc: <Tag className="!rounded-full !bg-primary/10 !text-primary !border-primary/20">Name</Tag> <Tag className="!rounded-full !bg-primary/10 !text-primary !border-primary/20">Email</Tag></p>
          <p className="text-slate-500 text-xs mt-2">Tùy chọn: Password, Provider, Google ID, Role</p>
        </div>
      </GlassCard>
      <GlassCard>
        <SectionHeader title="Kết quả" subtitle={importResult ? `${importResult.created} tạo, ${importResult.skipped} bỏ qua` : 'Chưa có kết quả'} />
        {importResult ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[{ label: 'Đã tạo', value: importResult.created, color: C.green }, { label: 'Bỏ qua', value: importResult.skipped, color: C.amber }, { label: 'Lỗi', value: importResult.errors.length, color: importResult.errors.length > 0 ? C.red : C.green }].map((i) => (
                <div key={i.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: `${i.color}10`, border: `1px solid ${i.color}30` }}>
                  <p className="text-white text-xl font-black">{i.value}</p><p className="text-slate-500 text-xs mt-1">{i.label}</p>
                </div>
              ))}
            </div>
            {importResult.errors.length > 0 && (
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${C.red}08`, border: `1px solid ${C.red}20` }}>
                <div className="flex items-center gap-2 mb-2"><WarningOutlined style={{ color: C.red }} /><p className="text-red-400 text-xs font-semibold">Chi tiết lỗi ({importResult.errors.length})</p></div>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {importResult.errors.slice(0, 10).map((e, i) => <li key={i} className="text-slate-400 text-xs flex gap-2"><span className="text-slate-600 flex-shrink-0">•</span><span>{e}</span></li>)}
                  {importResult.errors.length > 10 && <li className="text-slate-600 text-xs italic">...và {importResult.errors.length - 10} lỗi khác</li>}
                </ul>
              </div>
            )}
          </div>
        ) : <EmptyState icon={<FileExcelOutlined style={{ fontSize: 24, color: '#64748b' }} />} message="Upload file Excel để bắt đầu nhập dữ liệu" />}
      </GlassCard>
    </div>
  );

  // ── FAKE ──
  if (userTab === 'fake') return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard>
        <SectionHeader title="Tạo Users giả" subtitle="Dùng để test hệ thống" />
        <div className="space-y-4">
          <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Số lượng (1–500)</label>
            <InputNumber min={1} max={500} value={fakeCount} onChange={(v) => setFakeCount(v ?? 10)} className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" />
          </div>
          <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Phương thức</label>
            <div className="flex gap-2">
              <button onClick={() => setFakeMethod('random')} className={`flex-1 p-3 rounded-xl border text-xs font-medium transition-all ${fakeMethod === 'random' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'}`}>Ngẫu nhiên</button>
              <button onClick={() => setFakeMethod('ai')} className={`flex-1 p-3 rounded-xl border text-xs font-medium transition-all ${fakeMethod === 'ai' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'}`}>AI Generate</button>
            </div>
          </div>
          <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Role</label>
            <Select value={fakeRole} onChange={setFakeRole} className="!w-full" popupClassName="kmate-dark-select"
              options={[{ label: 'USER', value: 'USER' }, { label: 'MODERATOR', value: 'MODERATOR' }, { label: 'ADMIN', value: 'ADMIN' }]} />
          </div>
          <Button type="primary" icon={fakeMethod === 'ai' ? <RobotOutlined /> : <UserAddOutlined />} loading={generating} onClick={handleGenerate} block size="large"
            className="!rounded-xl !bg-primary !border-primary hover:!bg-primary/90 !font-semibold">
            {fakeMethod === 'ai' ? 'Generate bằng AI' : 'Tạo Users Ngẫu nhiên'}
          </Button>
          {generateResult && <Alert type="success" showIcon icon={<CheckCircleOutlined />} message={`Đã tạo thành công ${generateResult.created} users!`} className="!rounded-xl !bg-green-500/5 !border-green-500/20" />}
        </div>
      </GlassCard>
      <GlassCard>
        <SectionHeader title="Thông tin thêm" />
        <div className="space-y-3">
          {[{ label: 'Email', value: 'fake-xxxx@kmate.local' }, { label: 'Provider', value: 'EMAIL (thường)' }, { label: 'Đăng nhập', value: 'Có — email + password' }, { label: 'Giới hạn', value: 'Tối đa 500 users/lần' }].map((i) => (
            <div key={i.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-slate-500 text-xs w-24 flex-shrink-0">{i.label}</span>
              <span className="text-slate-300 text-xs">{i.value}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );

  // ── EXPORT ──
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard>
        <SectionHeader title="Xuất dữ liệu" subtitle="Tải file Excel danh sách người dùng" />
        <div className="space-y-4">
          <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:border-white/15 transition-colors">
            <input type="checkbox" checked={exportOAuth} onChange={(e) => setExportOAuth(e.target.checked)} className="mt-0.5 accent-primary" />
            <div><p className="text-slate-300 text-xs font-medium">Thông tin OAuth</p><p className="text-slate-500 text-xs mt-0.5">Xuất Provider, Google ID</p></div>
          </label>
          <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:border-white/15 transition-colors">
            <input type="checkbox" checked={exportBanned} onChange={(e) => setExportBanned(e.target.checked)} className="mt-0.5 accent-primary" />
            <div><p className="text-slate-300 text-xs font-medium">Bao gồm users bị ban</p><p className="text-slate-500 text-xs mt-0.5">Mặc định chỉ xuất users hoạt động</p></div>
          </label>
          {exportOAuth && <Alert type="warning" showIcon message="File export có thể chứa Google ID. Hãy bảo mật file này." className="!rounded-xl !bg-amber-500/5 !border-amber-500/20" />}
          <Button type="primary" icon={<DownloadOutlined />} loading={exporting} onClick={handleExport} block size="large" className="!rounded-xl !bg-primary !border-primary hover:!bg-primary/90 !font-semibold">Xuất Excel</Button>
        </div>
      </GlassCard>
      <GlassCard>
        <SectionHeader title="Các cột trong file" />
        <div className="flex flex-wrap gap-2">
          {['Name', 'Email', 'ID', 'Role', 'Provider', 'Google ID', 'Coin Balance', 'Streak', 'Banned', 'New User', 'Created Time', 'Last Active'].map((c) => (
            <Tag key={c} className="!rounded-full !bg-white/5 !text-slate-400 !border-white/10 !text-xs">{c}</Tag>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ── Render sub-tabs bar for Users ──
UsersTab.displaySubTabs = () => null;

// Inline sub-tab bar - wrap the content above
function UsersTabWrapper({ msgApi }: { msgApi: ReturnType<typeof message.useMessage>[0] }) {
  const [userTab, setUserTab] = useState<UserTabKey>('list');
  const USER_TABS: Array<{ key: UserTabKey; icon: React.ReactNode; label: string }> = [
    { key: 'list', icon: <TeamOutlined />, label: 'Danh sách' },
    { key: 'create', icon: <PlusOutlined />, label: 'Tạo User' },
    { key: 'import', icon: <UploadOutlined />, label: 'Import' },
    { key: 'fake', icon: <UserAddOutlined />, label: 'Fake Users' },
    { key: 'export', icon: <DownloadOutlined />, label: 'Export' },
  ];
  return (
    <>
      <div className="flex gap-1 border-b border-white/5 pb-0 mb-5">
        {USER_TABS.map((t) => (
          <button key={t.key} onClick={() => setUserTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all relative ${userTab === t.key ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
      </div>
      <UsersTabInner userTab={userTab} setUserTab={setUserTab} msgApi={msgApi} />
    </>
  );
}

// ── LIST SUB-TAB ──
function UsersTabInner({ userTab, setUserTab, msgApi }: {
  userTab: UserTabKey; setUserTab: (t: UserTabKey) => void; msgApi: ReturnType<typeof message.useMessage>[0];
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'USER', coinBalance: 0, streak: 0, isBanned: false, isNewUser: false });
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantAmount, setGrantAmount] = useState(0);
  const [grantSaving, setGrantSaving] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [importing, setImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const [fakeCount, setFakeCount] = useState(10);
  const [fakeMethod, setFakeMethod] = useState<'random' | 'ai'>('random');
  const [fakeRole, setFakeRole] = useState('USER');
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ created: number } | null>(null);
  const [exportOAuth, setExportOAuth] = useState(false);
  const [exportBanned, setExportBanned] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async (pg = 1, q = search) => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({ page: pg, limit: 20, search: q || undefined });
      setUsers(res.data.data); setTotal(res.data.pagination.total); setPage(pg);
    } catch { msgApi.error('Lỗi tải danh sách người dùng'); }
    finally { setLoading(false); }
  }, [msgApi, search]);

  useEffect(() => { load(1, ''); }, []);

  const handleEdit = (u: AdminUser) => { setEditUser(u); setForm({ name: u.name ?? '', email: u.email, role: u.role, coinBalance: u.coinBalance, streak: u.streak, isBanned: u.isBanned, isNewUser: (u as any).isNewUser ?? false }); setDrawerOpen(true); };
  const handleSave = async () => {
    if (!editUser) return; setSaving(true);
    try { await adminService.updateUser(editUser.id, { name: form.name, email: form.email, role: form.role as any, coinBalance: form.coinBalance, streak: form.streak, isBanned: form.isBanned, isNewUser: form.isNewUser }); msgApi.success('Cập nhật thành công!'); setDrawerOpen(false); load(page, search); }
    catch (e: any) { msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi cập nhật'); }
    finally { setSaving(false); }
  };
  const handleBan = async (id: string) => { setActionLoading(id); try { await adminService.banUser(id); setUsers((p) => p.map((u) => u.id === id ? { ...u, isBanned: true } : u)); msgApi.success('Đã cấm người dùng'); } catch { msgApi.error('Lỗi cấm người dùng'); } finally { setActionLoading(null); } };
  const handleUnban = async (id: string) => { setActionLoading(id); try { await adminService.unbanUser(id); setUsers((p) => p.map((u) => u.id === id ? { ...u, isBanned: false } : u)); msgApi.success('Đã mở cấm'); } catch { msgApi.error('Lỗi mở cấm'); } finally { setActionLoading(null); } };
  const handleGrantCoins = async () => { if (!editUser || grantAmount <= 0) return; setGrantSaving(true); try { const res = await adminService.grantCoins(editUser.id, { amount: grantAmount }); msgApi.success(`Đã cộng ${res.data.data.amount} coins. Số dư mới: ${res.data.data.balance}`); setGrantOpen(false); setGrantAmount(0); setForm((f) => ({ ...f, coinBalance: res.data.data.balance })); } catch (e: any) { msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi cấp coins'); } finally { setGrantSaving(false); } };
  const handleFileChange: UploadProps['onChange'] = ({ fileList: fl }) => { setFileList(fl); setImportResult(null); };
  const handleImport = async () => { if (!fileList[0]?.originFileObj) { msgApi.warning('Chọn file Excel trước'); return; } setImporting(true); try { const res = await adminService.importUsers(fileList[0].originFileObj as File, skipDuplicates); setImportResult(res.data.data); msgApi.success(`Nhập: ${res.data.data.created}, Bỏ qua: ${res.data.data.skipped}, Lỗi: ${res.data.data.errors.length}`); setFileList([]); } catch (e: any) { msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi nhập dữ liệu'); } finally { setImporting(false); } };
  const handleGenerate = async () => { setGenerating(true); try { const res = await adminService.generateFakeUsers({ count: fakeCount, method: fakeMethod, role: fakeRole }); setGenerateResult({ created: res.data.data.created }); msgApi.success(`Đã tạo ${res.data.data.created} users giả!`); } catch (e: any) { msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi tạo users giả'); } finally { setGenerating(false); } };
  const handleExport = async () => { setExporting(true); try { await adminService.exportUsers({ includeOAuth: exportOAuth, includeBanned: exportBanned }); msgApi.success('Tải file thành công!'); } catch { msgApi.error('Lỗi xuất dữ liệu'); } finally { setExporting(false); } };

  if (userTab === 'list') return (
    <div className="space-y-5">
      <InlineGuide
        color={C.cyan}
        steps={[
          'Tìm kiếm user theo tên hoặc email',
          'Nhấn nút Sửa (biểu tượng bút) để chỉnh sửa thông tin',
          'Nhấn Cấm / Mở cấm để khóa hoặc mở khóa tài khoản',
        ]}
      />
      <div className="flex items-center justify-between gap-4">
        <p className="text-slate-500 text-xs">{total > 0 ? `${total.toLocaleString('vi-VN')} người dùng` : 'Không có dữ liệu'}</p>
        <div className="flex gap-2">
          <Input prefix={<SearchOutlined className="text-slate-500" />} placeholder="Tìm..." value={search} onChange={(e) => setSearch(e.target.value)} onPressEnter={() => load(1, search)} className="!w-64 !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white placeholder:!text-slate-500" />
          <Button onClick={() => load(1, search)} className="!rounded-xl !bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20" icon={<SearchOutlined />}>Tìm</Button>
          <Button onClick={() => { setSearch(''); load(1, ''); }} className="!rounded-xl !bg-white/5 !text-slate-400 !border-white/10 hover:!bg-white/10" icon={<ReloadOutlined />}>Làm mới</Button>
        </div>
      </div>
      <GlassCard className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/5">{['Người dùng', 'Vai trò', 'Coins', 'Streak', 'Trạng thái', 'Hành động'].map((h) => <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-5 py-3.5 first:pl-6 last:pr-6">{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="text-center py-16"><Spin /></td></tr>
              : users.length === 0 ? <tr><td colSpan={6}><EmptyState icon={<TeamOutlined style={{ fontSize: 24, color: '#64748b' }} />} message="Không tìm thấy" /></td></tr>
              : users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 first:pl-6"><div className="flex items-center gap-3"><Avatar src={u.avatar} icon={<TeamOutlined />} size={36} className="!bg-primary/20 !text-primary flex-shrink-0" /><div><p className="text-white font-semibold text-sm truncate max-w-[160px]">{u.name || '—'}</p><p className="text-slate-400 text-xs truncate max-w-[200px]">{u.email}</p></div></div></td>
                  <td className="px-5 py-3.5"><Tag color={u.role === 'ADMIN' ? 'red' : u.role === 'MODERATOR' ? 'orange' : 'default'} className="!rounded-full !font-semibold">{u.role}</Tag></td>
                  <td className="px-5 py-3.5"><span className="text-secondary font-bold text-sm">{u.coinBalance.toLocaleString('vi-VN')}</span></td>
                  <td className="px-5 py-3.5"><span className="text-amber-400 font-semibold text-sm">{u.streak} ngày</span></td>
                  <td className="px-5 py-3.5">{u.isBanned ? <Tag color="red" className="!rounded-full !font-semibold">Bị cấm</Tag> : <Tag color="green" className="!rounded-full !font-semibold">Hoạt động</Tag>}</td>
                  <td className="px-5 py-3.5 last:pr-6"><div className="flex gap-2">
                    <Tooltip title="Sửa"><Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(u)} className="!rounded-xl !text-xs !bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20" /></Tooltip>
                    {u.isBanned ? (
                      <Popconfirm title="Mở cấm?" onConfirm={() => handleUnban(u.id)} okText="Mở cấm" cancelText="Huỷ" okButtonProps={{ className: '!bg-green-500 !border-green-500' }}>
                        <Button size="small" loading={actionLoading === u.id} className="!rounded-xl !text-xs !bg-green-500/10 !text-green-400 !border-green-500/20"><CheckCircleOutlined /> Mở cấm</Button>
                      </Popconfirm>
                    ) : (
                      <Popconfirm title="Cấm?" onConfirm={() => handleBan(u.id)} okText="Cấm" cancelText="Huỷ" okButtonProps={{ danger: true }}>
                        <Button size="small" danger loading={actionLoading === u.id} className="!rounded-xl !text-xs"><StopOutlined /> Cấm</Button>
                      </Popconfirm>
                    )}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/5">
            <p className="text-slate-500 text-xs">Hiển thị {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} / {total.toLocaleString('vi-VN')}</p>
            <div className="flex gap-1">
              <Button size="small" disabled={page === 1} onClick={() => load(page - 1, search)} className="!rounded-xl !bg-white/5 !border-white/10 !text-slate-400 hover:!bg-white/10 disabled:!opacity-30">‹</Button>
              <div className="flex items-center px-3 text-slate-400 text-xs">{page} / {Math.ceil(total / 20)}</div>
              <Button size="small" disabled={page >= Math.ceil(total / 20)} onClick={() => load(page + 1, search)} className="!rounded-xl !bg-white/5 !border-white/10 !text-slate-400 hover:!bg-white/10 disabled:!opacity-30">›</Button>
            </div>
          </div>
        )}
      </GlassCard>
      <Drawer title={<div className="flex items-center gap-2"><EditOutlined style={{ color: C.purple }} /><span className="text-white font-bold">Chỉnh sửa người dùng</span></div>} placement="right" width={480} onClose={() => setDrawerOpen(false)} open={drawerOpen}
        styles={{ body: { backgroundColor: '#0f1623', padding: '24px' }, header: { backgroundColor: '#0f1623', borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
        {editUser && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10"><Avatar src={editUser.avatar} icon={<TeamOutlined />} size={48} className="!bg-primary/20 !text-primary" /><div><p className="text-white font-bold">{editUser.name || '—'}</p><p className="text-slate-400 text-xs">{editUser.email}</p><p className="text-slate-600 text-xs">ID: {editUser.id.slice(0, 8)}...</p></div></div>
            <div className="space-y-4">
              {[{ label: 'Tên hiển thị', key: 'name' }, { label: 'Email', key: 'email' }].map((f) => <div key={f.key}><label className="text-slate-400 text-xs font-medium block mb-1.5">{f.label}</label><Input value={(form as any)[f.key]} onChange={(e) => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))} className="!rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white" /></div>)}
              <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Vai trò</label><Select value={form.role} onChange={(v) => setForm((p) => ({ ...p, role: v }))} options={ROLE_OPTIONS} className="!w-full" popupClassName="kmate-dark-select" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Coins</label><InputNumber min={0} value={form.coinBalance} onChange={(v) => setForm((p) => ({ ...p, coinBalance: v ?? 0 }))} className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" /></div>
                <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Streak</label><InputNumber min={0} value={form.streak} onChange={(v) => setForm((p) => ({ ...p, streak: v ?? 0 }))} className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" /></div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"><div><p className="text-white text-xs font-semibold">Người dùng mới</p><p className="text-slate-500 text-xs">Đánh dấu new user</p></div><Switch checked={form.isNewUser} onChange={(v) => setForm((p) => ({ ...p, isNewUser: v }))} className="[&_.ant-switch-checked]:!bg-primary" /></div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"><div><p className="text-white text-xs font-semibold">Bị cấm</p><p className="text-slate-500 text-xs">Khóa tài khoản</p></div><Switch checked={form.isBanned} onChange={(v) => setForm((p) => ({ ...p, isBanned: v }))} className="[&_.ant-switch-checked]:!bg-primary" /></div>
            </div>
            {!grantOpen ? <Button block icon={<DollarCircleOutlined />} onClick={() => setGrantOpen(true)} className="!rounded-xl !bg-amber-500/10 !text-amber-400 !border-amber-500/20 hover:!bg-amber-500/20">+ Cấp thêm Coins</Button>
            : <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-3"><div className="flex items-center justify-between"><p className="text-amber-400 text-xs font-semibold">Cấp Coins</p><Button size="small" onClick={() => { setGrantOpen(false); setGrantAmount(0); }} className="!rounded-lg !text-slate-400 !bg-white/5 !border-white/10">Huỷ</Button></div><InputNumber min={1} max={999999} value={grantAmount} onChange={(v) => setGrantAmount(v ?? 0)} placeholder="Số coins" className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" /><Button block loading={grantSaving} onClick={handleGrantCoins} icon={<DollarCircleOutlined />} className="!rounded-xl !bg-amber-500 !border-amber-500 hover:!bg-amber-400 !text-white !font-semibold">Cấp {grantAmount > 0 ? grantAmount.toLocaleString() : ''} Coins</Button></div>}
            <Button block size="large" loading={saving} onClick={handleSave} icon={<SaveOutlined />} className="!rounded-xl !bg-primary !border-primary hover:!bg-primary/90 !text-white !font-semibold">Lưu thay đổi</Button>
          </div>
        )}
      </Drawer>
    </div>
  );

  if (userTab === 'create') return (
    <div className="max-w-2xl space-y-5">
      <GlassCard>
        <SectionHeader title="Tạo người dùng mới" subtitle="Tạo tài khoản user thủ công" />
        <div className="space-y-4">
          <Alert type="info" showIcon message="Để tạo user nhanh, sử dụng tab 'Fake Users' với số lượng lớn. Tab này tạo 1 user với email tùy chỉnh." className="!rounded-xl !bg-primary/5 !border-primary/20" />
          <div className="flex gap-3 pt-2">
            <Button block onClick={() => setUserTab('list')} className="!rounded-xl !bg-white/5 !text-slate-400 !border-white/10 hover:!bg-white/10" icon={<ReloadOutlined />}>Quay về danh sách</Button>
            <Button type="primary" onClick={() => setUserTab('fake')} icon={<UserAddOutlined />} className="!rounded-xl !bg-primary !border-primary hover:!bg-primary/90 !font-semibold">Tạo nhiều Fake Users</Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );

  if (userTab === 'import') return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard>
        <SectionHeader title="Upload File Excel" subtitle="Kéo thả hoặc chọn file .xlsx, .xls, .csv" />
        <Dragger fileList={fileList} onChange={handleFileChange} beforeUpload={() => false} accept=".xlsx,.xls,.csv" maxCount={1} onRemove={() => { setFileList([]); setImportResult(null); }} className="kmate-dragger">
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'rgba(124,77,255,0.15)' }}><UploadOutlined style={{ fontSize: 28, color: C.purple }} /></div>
            <div><p className="text-white text-sm font-semibold">Kéo thả file Excel</p><p className="text-slate-500 text-xs mt-1">Tối đa 10MB</p></div>
            <div className="flex gap-2">{['.xlsx', '.xls', '.csv'].map((e) => <span key={e} className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'rgba(124,77,255,0.1)', color: C.purple }}>{e}</span>)}</div>
          </div>
        </Dragger>
        <div className="mt-4 flex items-center gap-3"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={skipDuplicates} onChange={(e) => setSkipDuplicates(e.target.checked)} className="accent-primary" /><span className="text-slate-400 text-xs">Bỏ qua email trùng lặp</span></label></div>
        <Button type="primary" icon={<UploadOutlined />} loading={importing} disabled={fileList.length === 0} onClick={handleImport} className="!mt-4 !w-full !rounded-xl !bg-primary !border-primary hover:!bg-primary/90" size="large">Nhập dữ liệu</Button>
        <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
          <p className="text-slate-400 text-xs font-medium mb-2">Cột bắt buộc: <Tag className="!rounded-full !bg-primary/10 !text-primary !border-primary/20">Name</Tag> <Tag className="!rounded-full !bg-primary/10 !text-primary !border-primary/20">Email</Tag></p>
          <p className="text-slate-500 text-xs mt-2">Tùy chọn: Password, Provider, Google ID, Role</p>
        </div>
      </GlassCard>
      <GlassCard>
        <SectionHeader title="Kết quả" subtitle={importResult ? `${importResult.created} tạo, ${importResult.skipped} bỏ qua` : 'Chưa có kết quả'} />
        {importResult ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              {[{ label: 'Đã tạo', value: importResult.created, color: C.green }, { label: 'Bỏ qua', value: importResult.skipped, color: C.amber }, { label: 'Lỗi', value: importResult.errors.length, color: importResult.errors.length > 0 ? C.red : C.green }].map((i) => (
                <div key={i.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: `${i.color}10`, border: `1px solid ${i.color}30` }}><p className="text-white text-xl font-black">{i.value}</p><p className="text-slate-500 text-xs mt-1">{i.label}</p></div>
              ))}
            </div>
            {importResult.errors.length > 0 && (
              <div className="p-3 rounded-xl" style={{ backgroundColor: `${C.red}08`, border: `1px solid ${C.red}20` }}>
                <div className="flex items-center gap-2 mb-2"><WarningOutlined style={{ color: C.red }} /><p className="text-red-400 text-xs font-semibold">Chi tiết lỗi ({importResult.errors.length})</p></div>
                <ul className="space-y-1 max-h-32 overflow-y-auto">{importResult.errors.slice(0, 10).map((e, i) => <li key={i} className="text-slate-400 text-xs flex gap-2"><span className="text-slate-600 flex-shrink-0">•</span><span>{e}</span></li>)}</ul>
              </div>
            )}
          </div>
        ) : <EmptyState icon={<FileExcelOutlined style={{ fontSize: 24, color: '#64748b' }} />} message="Upload file Excel để bắt đầu nhập dữ liệu" />}
      </GlassCard>
    </div>
  );

  if (userTab === 'fake') return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard>
        <SectionHeader title="Tạo Users giả" subtitle="Dùng để test hệ thống" />
        <div className="space-y-4">
          <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Số lượng (1–500)</label><InputNumber min={1} max={500} value={fakeCount} onChange={(v) => setFakeCount(v ?? 10)} className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" /></div>
          <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Phương thức</label>
            <div className="flex gap-2">
              <button onClick={() => setFakeMethod('random')} className={`flex-1 p-3 rounded-xl border text-xs font-medium transition-all ${fakeMethod === 'random' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'}`}>Ngẫu nhiên</button>
              <button onClick={() => setFakeMethod('ai')} className={`flex-1 p-3 rounded-xl border text-xs font-medium transition-all ${fakeMethod === 'ai' ? 'border-primary/50 bg-primary/10 text-primary' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'}`}>AI Generate</button>
            </div>
          </div>
          <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Role</label><Select value={fakeRole} onChange={setFakeRole} className="!w-full" popupClassName="kmate-dark-select" options={[{ label: 'USER', value: 'USER' }, { label: 'MODERATOR', value: 'MODERATOR' }, { label: 'ADMIN', value: 'ADMIN' }]} /></div>
          <Button type="primary" icon={fakeMethod === 'ai' ? <RobotOutlined /> : <UserAddOutlined />} loading={generating} onClick={handleGenerate} block size="large" className="!rounded-xl !bg-primary !border-primary hover:!bg-primary/90 !font-semibold">{fakeMethod === 'ai' ? 'Generate bằng AI' : 'Tạo Users Ngẫu nhiên'}</Button>
          {generateResult && <Alert type="success" showIcon icon={<CheckCircleOutlined />} message={`Đã tạo thành công ${generateResult.created} users!`} className="!rounded-xl !bg-green-500/5 !border-green-500/20" />}
        </div>
      </GlassCard>
      <GlassCard>
        <SectionHeader title="Thông tin thêm" />
        <div className="space-y-3">{[{ label: 'Email', value: 'fake-xxxx@kmate.local' }, { label: 'Provider', value: 'EMAIL (thường)' }, { label: 'Đăng nhập', value: 'Có — email + password' }, { label: 'Giới hạn', value: 'Tối đa 500 users/lần' }].map((i) => (<div key={i.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5"><span className="text-slate-500 text-xs w-24 flex-shrink-0">{i.label}</span><span className="text-slate-300 text-xs">{i.value}</span></div>))}</div>
      </GlassCard>
    </div>
  );

  // export
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <GlassCard>
        <SectionHeader title="Xuất dữ liệu" subtitle="Tải file Excel danh sách người dùng" />
        <div className="space-y-4">
          <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:border-white/15 transition-colors"><input type="checkbox" checked={exportOAuth} onChange={(e) => setExportOAuth(e.target.checked)} className="mt-0.5 accent-primary" /><div><p className="text-slate-300 text-xs font-medium">Thông tin OAuth</p><p className="text-slate-500 text-xs mt-0.5">Xuất Provider, Google ID</p></div></label>
          <label className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:border-white/15 transition-colors"><input type="checkbox" checked={exportBanned} onChange={(e) => setExportBanned(e.target.checked)} className="mt-0.5 accent-primary" /><div><p className="text-slate-300 text-xs font-medium">Bao gồm users bị ban</p><p className="text-slate-500 text-xs mt-0.5">Mặc định chỉ xuất users hoạt động</p></div></label>
          {exportOAuth && <Alert type="warning" showIcon message="File export có thể chứa Google ID. Hãy bảo mật file này." className="!rounded-xl !bg-amber-500/5 !border-amber-500/20" />}
          <Button type="primary" icon={<DownloadOutlined />} loading={exporting} onClick={handleExport} block size="large" className="!rounded-xl !bg-primary !border-primary hover:!bg-primary/90 !font-semibold">Xuất Excel</Button>
        </div>
      </GlassCard>
      <GlassCard><SectionHeader title="Các cột trong file" /><div className="flex flex-wrap gap-2">{['Name', 'Email', 'ID', 'Role', 'Provider', 'Google ID', 'Coin Balance', 'Streak', 'Banned', 'New User', 'Created Time', 'Last Active'].map((c) => (<Tag key={c} className="!rounded-full !bg-white/5 !text-slate-400 !border-white/10 !text-xs">{c}</Tag>))}</div></GlassCard>
    </div>
  );
}

// Re-export UsersTab as the actual component used
const UsersTabActual = UsersTabInner;

// ════════════════════════════════════════════════════════════
// TAB 3: ACHIEVEMENTS
// ════════════════════════════════════════════════════════════

function AchievementsTab({ msgApi }: { msgApi: ReturnType<typeof message.useMessage>[0] }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [form, setForm] = useState<AchievementInput>({ type: '', name: '', description: '', icon: '🏆', coinReward: 0, xpReward: 0, requirement: 1, isActive: true });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => { setLoading(true); try { const res = await adminService.getAchievements(); setAchievements(res.data.data); } catch { msgApi.error('Lỗi tải thành tựu'); } finally { setLoading(false); } }, [msgApi]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ type: '', name: '', description: '', icon: '🏆', coinReward: 0, xpReward: 0, requirement: 1, isActive: true }); setModalOpen(true); };
  const openEdit = (a: Achievement) => { setEditing(a); setForm({ type: a.type, name: a.name, description: a.description, icon: a.icon, coinReward: a.coinReward, xpReward: a.xpReward, requirement: a.requirement, isActive: a.isActive }); setModalOpen(true); };
  const handleSave = async () => { if (!form.name || !form.type) { msgApi.warning('Nhập tên và loại'); return; } setSaving(true); try { if (editing) { await adminService.updateAchievement(editing.id, form); msgApi.success('Cập nhật thành công!'); } else { await adminService.createAchievement(form); msgApi.success('Tạo thành thành công!'); } setModalOpen(false); load(); } catch (e: any) { msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi lưu'); } finally { setSaving(false); } };
  const handleToggle = async (a: Achievement) => { try { await adminService.updateAchievement(a.id, { ...a, isActive: !a.isActive }); load(); } catch { msgApi.error('Lỗi cập nhật trạng thái'); } };

  return (
    <div className="space-y-5">
      <InlineGuide
        color={C.amber}
        steps={[
          'Nhấn "Tạo thành tựu" để thêm mới',
          'Nhấn nút Sửa để chỉnh sửa thông tin',
          'Nhấn badge trạng thái để bật/tắt thành tựu',
        ]}
      />
      <div className="flex items-center justify-between">
        <div><h3 className="text-white font-bold text-lg">Thành tựu</h3><p className="text-slate-500 text-xs mt-0.5">{achievements.length} thành tựu trong hệ thống</p></div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="!rounded-xl !font-bold" style={{ background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)', border: 'none' }}>Tạo thành tựu</Button>
      </div>
      <GlassCard className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/5">{['Biểu tượng', 'Tên', 'Loại', 'Coins', 'XP', 'Yêu cầu', 'Trạng thái', 'Hành động'].map((h) => <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-5 py-3.5 first:pl-6 last:pr-6">{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="text-center py-16"><Spin /></td></tr>
              : achievements.length === 0 ? <tr><td colSpan={8}><EmptyState icon={<TrophyOutlined style={{ fontSize: 24, color: '#64748b' }} />} message="Chưa có thành tựu nào" /></td></tr>
              : achievements.map((a) => (
                <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 first:pl-6"><span className="text-2xl">{a.icon}</span></td>
                  <td className="px-5 py-3.5"><span className="text-white font-medium text-sm">{a.name}</span><p className="text-slate-500 text-xs mt-0.5 max-w-[180px] truncate">{a.description}</p></td>
                  <td className="px-5 py-3.5"><Tag className="!rounded-full">{ACHIEVEMENT_TYPE_LABELS[a.type] || a.type}</Tag></td>
                  <td className="px-5 py-3.5"><span className="text-amber-400 font-bold">{a.coinReward}</span></td>
                  <td className="px-5 py-3.5"><span className="text-blue-400 font-bold">{a.xpReward}</span></td>
                  <td className="px-5 py-3.5"><span className="text-slate-400">{a.requirement}</span></td>
                  <td className="px-5 py-3.5"><Tag color={a.isActive ? 'green' : 'default'} className="!rounded-full cursor-pointer" onClick={() => handleToggle(a)}>{a.isActive ? 'Bật' : 'Tắt'}</Tag></td>
                  <td className="px-5 py-3.5 last:pr-6"><Button size="small" icon={<EditOutlined />} onClick={() => openEdit(a)} className="!rounded-xl !text-xs !bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
      <Modal title={<span className="text-white font-bold">{editing ? 'Sửa thành tựu' : 'Tạo thành tựu'}</span>} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} className="kmate-modal" width={520}
        styles={{ body: { backgroundColor: '#0f1623', padding: '24px' }, header: { backgroundColor: '#0f1623', borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
        <div className="py-4 space-y-4">
          {[{ label: 'Loại (duy nhất)', key: 'type', placeholder: 'VD: FIRST_VIDEO' }, { label: 'Tên', key: 'name', placeholder: 'Tên thành tựu' }, { label: 'Biểu tượng (emoji)', key: 'icon', placeholder: '🏆' }, { label: 'Mô tả', key: 'description', placeholder: 'Mô tả thành tựu' }].map((f) => (
            <div key={f.key}><label className="block text-xs font-bold text-slate-400 uppercase mb-1">{f.label}</label><Input value={(form as any)[f.key]} onChange={(e) => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="!rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white" /></div>
          ))}
          <div className="grid grid-cols-3 gap-4">
            {[{ label: 'Thưởng Coins', key: 'coinReward' }, { label: 'Thưởng XP', key: 'xpReward' }, { label: 'Yêu cầu', key: 'requirement' }].map((f) => (
              <div key={f.key}><label className="block text-xs font-bold text-slate-400 uppercase mb-1">{f.label}</label><InputNumber min={0} value={(form as any)[f.key]} onChange={(v) => setForm((p: any) => ({ ...p, [f.key]: v ?? 0 }))} className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" /></div>
            ))}
          </div>
          <div className="flex gap-3 pt-2"><Button block onClick={() => setModalOpen(false)} className="!rounded-xl">Huỷ</Button><Button type="primary" block loading={saving} onClick={handleSave} className="!rounded-xl !font-bold" style={{ background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)', border: 'none' }}>Lưu</Button></div>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 4: PACKAGES
// ════════════════════════════════════════════════════════════

function PackagesTab({ msgApi }: { msgApi: ReturnType<typeof message.useMessage>[0] }) {
  const [packages, setPackages] = useState<CoinPackageAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CoinPackageAdmin | null>(null);
  const [form, setForm] = useState<PackageInput>({ name: '', description: '', coinAmount: 0, bonusCoinAmount: 0, price: 0, isActive: true, sortOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const load = useCallback(async () => { setLoading(true); try { const res = await adminService.getPackages(); setPackages(res.data.data); } catch { msgApi.error('Lỗi tải gói coins'); } finally { setLoading(false); } }, [msgApi]);
  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', coinAmount: 0, bonusCoinAmount: 0, price: 0, isActive: true, sortOrder: packages.length + 1 }); setModalOpen(true); };
  const openEdit = (pkg: CoinPackageAdmin) => { setEditing(pkg); setForm({ name: pkg.name, description: pkg.description ?? '', coinAmount: pkg.coinAmount, bonusCoinAmount: pkg.bonusCoinAmount ?? 0, price: pkg.price, isActive: pkg.isActive, sortOrder: pkg.sortOrder }); setModalOpen(true); };
  const handleSave = async () => { if (!form.name || form.coinAmount <= 0 || form.price <= 0) { msgApi.warning('Nhập đầy đủ thông tin bắt buộc'); return; } setSaving(true); try { if (editing) { await adminService.updatePackage(editing.id, form); msgApi.success('Cập nhật thành công!'); } else { await adminService.createPackage(form); msgApi.success('Tạo gói thành công!'); } setModalOpen(false); load(); } catch (e: any) { msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi lưu'); } finally { setSaving(false); } };
  const handleToggle = async (pkg: CoinPackageAdmin) => { try { await adminService.updatePackage(pkg.id, { ...pkg, isActive: !pkg.isActive }); load(); } catch { msgApi.error('Lỗi cập nhật trạng thái'); } };
  const handleDelete = async (id: string) => { setDeleteLoading(id); try { await adminService.deletePackage(id); msgApi.success('Đã xoá gói coins'); load(); } catch (e: any) { msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi xoá gói coins'); } finally { setDeleteLoading(null); } };

  return (
    <div className="space-y-5">
      <InlineGuide
        color={C.green}
        steps={[
          'Nhấn "Tạo gói coins" để thêm mới',
          'Nhấn nút Sửa để chỉnh sửa',
          'Nhấn nút Xoá để xóa vĩnh viễn',
          'Nhấn badge trạng thái để bật/tắt',
        ]}
      />
      <div className="flex items-center justify-between">
        <div><h3 className="text-white font-bold text-lg">Gói Coins</h3><p className="text-slate-500 text-xs mt-0.5">{packages.length} gói coins trong hệ thống</p></div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="!rounded-xl !font-bold" style={{ background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)', border: 'none' }}>Tạo gói coins</Button>
      </div>
      <GlassCard className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/5">{['Tên gói', 'Xu', 'Thưởng', 'Giá', 'Thứ tự', 'Trạng thái', 'Hành động'].map((h) => <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-5 py-3.5 first:pl-6 last:pr-6">{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="text-center py-16"><Spin /></td></tr>
              : packages.length === 0 ? <tr><td colSpan={7}><EmptyState icon={<ShoppingOutlined style={{ fontSize: 24, color: '#64748b' }} />} message="Chưa có gói coins nào" /></td></tr>
              : packages.map((pkg) => (
                <tr key={pkg.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 first:pl-6"><span className="text-white font-medium text-sm">{pkg.name}</span><p className="text-slate-500 text-xs mt-0.5 max-w-[180px] truncate">{pkg.description}</p></td>
                  <td className="px-5 py-3.5"><span className="text-secondary font-bold text-lg">{pkg.coinAmount} Xu</span></td>
                  <td className="px-5 py-3.5">{pkg.bonusCoinAmount != null && pkg.bonusCoinAmount > 0 ? <Tag color="cyan" className="!rounded-full">+{pkg.bonusCoinAmount} Xu</Tag> : <span className="text-slate-600">—</span>}</td>
                  <td className="px-5 py-3.5"><span className="text-green-400 font-bold">{pkg.price.toLocaleString('vi-VN')} đ</span></td>
                  <td className="px-5 py-3.5"><span className="text-slate-400">{pkg.sortOrder}</span></td>
                  <td className="px-5 py-3.5"><Tag color={pkg.isActive ? 'green' : 'default'} className="!rounded-full cursor-pointer" onClick={() => handleToggle(pkg)}>{pkg.isActive ? 'Bật' : 'Tắt'}</Tag></td>
                  <td className="px-5 py-3.5 last:pr-6"><div className="flex gap-2">
                    <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(pkg)} className="!rounded-xl !text-xs !bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20" />
                    <Popconfirm title="Xoá gói coins?" description="Hành động không thể hoàn tác." onConfirm={() => handleDelete(pkg.id)} okText="Xoá" cancelText="Huỷ" okButtonProps={{ danger: true, loading: deleteLoading === pkg.id }}>
                      <Button size="small" danger icon={<DeleteOutlined />} className="!rounded-xl !text-xs" />
                    </Popconfirm>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
      <Modal title={<span className="text-white font-bold">{editing ? 'Sửa gói coins' : 'Tạo gói coins'}</span>} open={modalOpen} onCancel={() => setModalOpen(false)} footer={null} className="kmate-modal" width={520}
        styles={{ body: { backgroundColor: '#0f1623', padding: '24px' }, header: { backgroundColor: '#0f1623', borderBottom: '1px solid rgba(255,255,255,0.08)' } }}>
        <div className="py-4 space-y-4">
          <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tên gói</label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="VD: Gói 100 Xu" className="!rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white" /></div>
          <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mô tả</label><Input.TextArea value={form.description ?? ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="!rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Số Xu</label><InputNumber min={1} value={form.coinAmount} onChange={(v) => setForm((p) => ({ ...p, coinAmount: v ?? 0 }))} className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" /></div>
            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Xu thưởng</label><InputNumber min={0} value={form.bonusCoinAmount} onChange={(v) => setForm((p) => ({ ...p, bonusCoinAmount: v ?? 0 }))} className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" /></div>
            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Giá (VND)</label><InputNumber min={0} value={form.price} onChange={(v) => setForm((p) => ({ ...p, price: v ?? 0 }))} className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} /></div>
            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1">Thứ tự</label><InputNumber min={0} value={form.sortOrder} onChange={(v) => setForm((p) => ({ ...p, sortOrder: v ?? 0 }))} className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" /></div>
          </div>
          <div className="flex items-center gap-3"><span className="text-sm text-slate-400">Bật:</span><Switch checked={form.isActive} onChange={(v) => setForm((p) => ({ ...p, isActive: v }))} /></div>
          <div className="flex gap-3 pt-2"><Button block onClick={() => setModalOpen(false)} className="!rounded-xl">Huỷ</Button><Button type="primary" block loading={saving} onClick={handleSave} className="!rounded-xl !font-bold" style={{ background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)', border: 'none' }}>Lưu</Button></div>
        </div>
      </Modal>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 5: PAYMENTS + TRANSACTIONS
// ════════════════════════════════════════════════════════════

type PayTabKey = 'payments' | 'transactions' | 'create';

function PaymentsTab({ msgApi }: { msgApi: ReturnType<typeof message.useMessage>[0] }) {
  const [payTab, setPayTab] = useState<PayTabKey>('payments');
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create fake payment form
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [formAmount, setFormAmount] = useState(10000);
  const [formCoins, setFormCoins] = useState(100);
  const [formStatus, setFormStatus] = useState<'PENDING' | 'SUCCESS'>('PENDING');
  const [createSaving, setCreateSaving] = useState(false);

  // Edit payment drawer
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);
  const [editPayment, setEditPayment] = useState<AdminPayment | null>(null);
  const [editStatus, setEditStatus] = useState<string>('PENDING');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editPaidAt, setEditPaidAt] = useState<string>('');
  const [editSaving, setEditSaving] = useState(false);

  const loadPayments = useCallback(async (pg = 1, s = statusFilter) => {
    setLoading(true);
    try { const res = await adminService.getPayments({ page: pg, limit: 20, status: s || undefined }); setPayments(res.data.data); setTotal(res.data.pagination.total); setPage(pg); }
    catch { msgApi.error('Lỗi tải danh sách thanh toán'); }
    finally { setLoading(false); }
  }, [msgApi, statusFilter]);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try { const res = await adminService.getTransactions({ limit: 100 }); setTransactions(res.data.data); }
    catch { msgApi.error('Lỗi tải giao dịch coins'); }
    finally { setLoading(false); }
  }, [msgApi]);

  useEffect(() => { loadPayments(1, ''); }, []);

  useEffect(() => {
    if (payTab === 'transactions') loadTransactions();
    if (payTab === 'create') {
      adminService.getUsers({ page: 1, limit: 500 }).then((r) => setUsers(r.data.data)).catch(() => {});
    }
  }, [payTab]);

  const handleApprove = async (id: string) => { setActionLoading(id); try { const res = await adminService.approvePayment(id); msgApi.success(res.data.message); loadPayments(page, statusFilter); } catch { msgApi.error('Lỗi xác nhận thanh toán'); } finally { setActionLoading(null); } };
  const handleReject = async (id: string) => { setActionLoading(id); try { const res = await adminService.rejectPayment(id); msgApi.success(res.data.message); loadPayments(page, statusFilter); } catch { msgApi.error('Lỗi từ chối thanh toán'); } finally { setActionLoading(null); } };

  const handleCreateFake = async () => {
    if (!selectedUser || formAmount <= 0 || formCoins <= 0) { msgApi.warning('Nhập đầy đủ thông tin'); return; }
    setCreateSaving(true);
    try {
      await adminService.createFakePayment({ userId: selectedUser.id, amount: formAmount, coinAmount: formCoins, status: formStatus });
      msgApi.success(`Đã tạo fake payment ${formStatus === 'SUCCESS' ? '(đã duyệt)' : '(đang chờ)'} cho ${selectedUser.name || selectedUser.email}`);
      setPayTab('payments'); loadPayments(1, '');
    } catch (e: any) { msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi tạo fake payment'); }
    finally { setCreateSaving(false); }
  };

  const PAY_TABS: Array<{ key: PayTabKey; icon: React.ReactNode; label: string }> = [
    { key: 'payments', icon: <DollarOutlined />, label: 'Payments' },
    { key: 'transactions', icon: <SwapOutlined />, label: 'Giao dịch Coins' },
    { key: 'create', icon: <PlusOutlined />, label: 'Tạo Fake' },
  ];

  return (
    <div className="space-y-5">
      <InlineGuide
        color={C.amber}
        steps={[
          'Chuyển tab để xem Payments, Giao dịch Coins, hoặc Tạo Fake',
          'Nhấn Xác nhận để duyệt payment đang chờ',
          'Nhấn Từ chối để hủy payment',
        ]}
      />
      {/* Sub-tab bar */}
      <div className="flex gap-1 border-b border-white/5 pb-0">
        {PAY_TABS.map((t) => (
          <button key={t.key} onClick={() => setPayTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all relative ${payTab === t.key ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── PAYMENTS ── */}
      {payTab === 'payments' && (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-slate-500 text-xs">{total > 0 ? `${total.toLocaleString('vi-VN')} giao dịch` : 'Không có dữ liệu'}</p>
            <div className="flex gap-2">
              <Select placeholder="Tất cả trạng thái" allowClear className="!w-44" value={statusFilter || undefined}
                onChange={(v) => { setStatusFilter(v || ''); loadPayments(1, v || ''); }}
                options={[{ value: 'PENDING', label: 'Đang chờ' }, { value: 'SUCCESS', label: 'Thành công' }, { value: 'FAILED', label: 'Thất bại' }, { value: 'EXPIRED', label: 'Hết hạn' }]} />
              <Button onClick={() => loadPayments(page, statusFilter)} className="!rounded-xl !bg-white/5 !text-slate-400 !border-white/10 hover:!bg-white/10" icon={<ReloadOutlined />}>Làm mới</Button>
              <Button onClick={() => setPayTab('create')} className="!rounded-xl !bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20" icon={<PlusOutlined />}>Tạo Fake</Button>
            </div>
          </div>
          <GlassCard className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/5">{['Người dùng', 'Số tiền', 'Xu', 'Mã đơn', 'Trạng thái', 'Thời gian', 'Hành động'].map((h) => <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-5 py-3.5 first:pl-6 last:pr-6">{h}</th>)}</tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={7} className="text-center py-16"><Spin /></td></tr>
                  : payments.length === 0 ? <tr><td colSpan={7}><EmptyState icon={<DollarOutlined style={{ fontSize: 24, color: '#64748b' }} />} message="Không có giao dịch nào" /></td></tr>
                  : payments.map((p) => (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 first:pl-6"><div><p className="text-white text-sm font-medium">{p.user.name || '—'}</p><p className="text-slate-400 text-xs">{p.user.email}</p></div></td>
                      <td className="px-5 py-3.5"><span className="text-green-400 font-bold text-sm">{p.amount.toLocaleString('vi-VN')} đ</span></td>
                      <td className="px-5 py-3.5"><span className="text-secondary font-bold text-sm">{p.coinAmount} Xu</span></td>
                      <td className="px-5 py-3.5"><span className="text-slate-400 text-xs font-mono">{p.payosOrderCode || '—'}</span></td>
                      <td className="px-5 py-3.5"><Tag color={PAYMENT_STATUS_COLORS[p.status] || 'default'} className="!rounded-full">{PAYMENT_STATUS_LABELS[p.status] || p.status}</Tag></td>
                      <td className="px-5 py-3.5 last:pr-6"><p className="text-slate-400 text-xs">Tạo: {dayjs(p.createdAt).format('DD/MM/YY HH:mm')}</p>{p.paidAt && <p className="text-slate-500 text-xs">TT: {dayjs(p.paidAt).format('DD/MM/YY HH:mm')}</p>}</td>
                      <td className="px-5 py-3.5 last:pr-6">
                        <div className="flex gap-1.5 flex-wrap">
                          <Tooltip title="Sửa"><Button size="small" icon={<EditOutlined />} onClick={() => { setEditPayment(p); setEditStatus(p.status); setEditAmount(p.amount); setEditPaidAt(p.paidAt ? dayjs(p.paidAt).format('YYYY-MM-DDTHH:mm') : ''); setEditDrawerOpen(true); }} className="!rounded-xl !text-xs !bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20" /></Tooltip>
                          {p.status === 'PENDING' && (
                            <>
                              <Popconfirm title="Xác nhận thanh toán?" onConfirm={() => handleApprove(p.id)} okText="Xác nhận" cancelText="Huỷ">
                                <Button size="small" type="primary" icon={<CheckCircleOutlined />} loading={actionLoading === p.id} style={{ borderRadius: 8, background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', color: '#fff', fontWeight: 600 }}>Duyệt</Button>
                              </Popconfirm>
                              <Popconfirm title="Từ chối thanh toán?" onConfirm={() => handleReject(p.id)} okText="Từ chối" cancelText="Huỷ" okButtonProps={{ danger: true, loading: actionLoading === `reject-${p.id}` }}>
                                <Button size="small" danger icon={<CloseCircleOutlined />} loading={actionLoading === `reject-${p.id}`} style={{ borderRadius: 8 }}>Từ chối</Button>
                              </Popconfirm>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > 0 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-white/5">
                <p className="text-slate-500 text-xs">Hiển thị {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} / {total.toLocaleString('vi-VN')}</p>
                <div className="flex gap-1">
                  <Button size="small" disabled={page === 1} onClick={() => loadPayments(page - 1, statusFilter)} className="!rounded-xl !bg-white/5 !border-white/10 !text-slate-400 hover:!bg-white/10 disabled:!opacity-30">‹</Button>
                  <div className="flex items-center px-3 text-slate-400 text-xs">{page} / {Math.ceil(total / 20)}</div>
                  <Button size="small" disabled={page >= Math.ceil(total / 20)} onClick={() => loadPayments(page + 1, statusFilter)} className="!rounded-xl !bg-white/5 !border-white/10 !text-slate-400 hover:!bg-white/10 disabled:!opacity-30">›</Button>
                </div>
              </div>
            )}
          </GlassCard>
        </>
      )}

      {/* ── TRANSACTIONS ── */}
      {payTab === 'transactions' && (
        <GlassCard className="!p-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <p className="text-slate-500 text-xs">{transactions.length > 0 ? `${transactions.length} giao dịch coins` : 'Giao dịch'}</p>
            <Button onClick={loadTransactions} className="!rounded-xl !bg-white/5 !text-slate-400 !border-white/10 hover:!bg-white/10" icon={<ReloadOutlined />}>Làm mới</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr className="border-b border-white/5">{['Người dùng', 'Loại', 'Số coins', 'Số dư trước', 'Số dư sau', 'Mô tả', 'Thời gian'].map((h) => <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-5 py-3.5 first:pl-6 last:pr-6">{h}</th>)}</tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7} className="text-center py-16"><Spin /></td></tr>
                : transactions.length === 0 ? <tr><td colSpan={7}><EmptyState icon={<SwapOutlined style={{ fontSize: 24, color: '#64748b' }} />} message="Không có giao dịch nào" /></td></tr>
                : transactions.map((t) => (
                  <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 first:pl-6"><div><p className="text-white text-sm font-medium">{t.user?.name || '—'}</p><p className="text-slate-500 text-xs">{t.user?.email}</p></div></td>
                    <td className="px-5 py-3.5"><Tag className="!rounded-full !font-semibold">{t.type}</Tag></td>
                    <td className="px-5 py-3.5"><span className={t.amount > 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>{t.amount > 0 ? '+' : ''}{t.amount}</span></td>
                    <td className="px-5 py-3.5"><span className="text-slate-400 text-sm">{t.balanceBefore?.toLocaleString('vi-VN') ?? '—'}</span></td>
                    <td className="px-5 py-3.5"><span className="text-slate-400 text-sm">{t.balanceAfter?.toLocaleString('vi-VN') ?? '—'}</span></td>
                    <td className="px-5 py-3.5 max-w-[200px]"><span className="text-slate-400 text-xs truncate block">{t.description || '—'}</span></td>
                    <td className="px-5 py-3.5 last:pr-6"><span className="text-slate-400 text-xs">{dayjs(t.createdAt).format('DD/MM/YY HH:mm')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* ── CREATE FAKE PAYMENT ── */}
      {payTab === 'create' && (
        <div className="max-w-2xl space-y-5">
          <GlassCard>
            <SectionHeader title="Tạo Fake Payment" subtitle="Tạo bản ghi thanh toán giả để test hệ thống" />
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Chọn người dùng</label>
                <Input prefix={<SearchOutlined className="text-slate-500" />} placeholder="Tìm user..." value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setSelectedUser(null); }}
                  className="!rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white placeholder:!text-slate-500" />
                {!selectedUser && (
                  <div className="mt-2 rounded-xl border border-white/10 overflow-hidden max-h-48 overflow-y-auto">
                    {users.filter((u) => !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase()) || (u.name ?? '').toLowerCase().includes(userSearch.toLowerCase())).slice(0, 10).map((u) => (
                      <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-b-0" onClick={() => { setSelectedUser(u); setUserSearch(''); }}>
                        <Avatar src={u.avatar} icon={<TeamOutlined />} size={28} className="!bg-primary/20 !text-primary flex-shrink-0" />
                        <div className="min-w-0 flex-1"><p className="text-white text-xs font-semibold truncate">{u.name || '—'}</p><p className="text-slate-500 text-xs truncate">{u.email}</p></div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <div className="mt-2 flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-primary/20">
                    <Avatar src={selectedUser.avatar} icon={<TeamOutlined />} size={36} className="!bg-primary/20 !text-primary" />
                    <div className="flex-1 min-w-0"><p className="text-white text-sm font-semibold truncate">{selectedUser.name || '—'}</p><p className="text-slate-500 text-xs truncate">{selectedUser.email}</p></div>
                    <Button size="small" danger onClick={() => setSelectedUser(null)} className="!rounded-lg">Huỷ</Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Số tiền (VND)</label>
                  <InputNumber min={1000} value={formAmount} onChange={(v) => setFormAmount(v ?? 10000)} className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                </div>
                <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Số Xu nhận được</label>
                  <InputNumber min={1} value={formCoins} onChange={(v) => setFormCoins(v ?? 100)} className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" />
                </div>
              </div>
              <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Trạng thái</label>
                <div className="flex gap-2">
                  <button onClick={() => setFormStatus('PENDING')} className={`flex-1 p-3 rounded-xl border text-xs font-medium transition-all ${formStatus === 'PENDING' ? 'border-orange-500/50 bg-orange-500/10 text-orange-400' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'}`}>Đang chờ (PENDING)</button>
                  <button onClick={() => setFormStatus('SUCCESS')} className={`flex-1 p-3 rounded-xl border text-xs font-medium transition-all ${formStatus === 'SUCCESS' ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20'}`}>Thành công ngay (SUCCESS)</button>
                </div>
              </div>
              <Alert type="warning" showIcon message={formStatus === 'SUCCESS' ? 'Payment sẽ được tạo ở trạng thái SUCCESS — coins sẽ được cộng ngay cho user.' : 'Payment sẽ được tạo ở trạng thái PENDING — cần duyệt thủ công.'} className="!rounded-xl !bg-amber-500/5 !border-amber-500/20" />
              <div className="flex gap-3 pt-2">
                <Button block onClick={() => setPayTab('payments')} className="!rounded-xl !bg-white/5 !text-slate-400 !border-white/10 hover:!bg-white/10">Huỷ</Button>
                <Button type="primary" block loading={createSaving} onClick={handleCreateFake} icon={<PlusOutlined />} className="!rounded-xl !bg-primary !border-primary hover:!bg-primary/90 !font-semibold">Tạo Fake Payment</Button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Edit Payment Drawer */}
      <Drawer
        title={<div className="flex items-center gap-2"><EditOutlined style={{ color: C.purple }} /><span className="text-white font-bold">Sửa thanh toán</span></div>}
        placement="right"
        width={480}
        onClose={() => { setEditDrawerOpen(false); setEditPayment(null); }}
        open={editDrawerOpen}
        styles={{ body: { backgroundColor: '#0f1623', padding: '24px' }, header: { backgroundColor: '#0f1623', borderBottom: '1px solid rgba(255,255,255,0.08)' } }}
      >
        {editPayment && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
              <Avatar src={editPayment.user.avatar} icon={<TeamOutlined />} size={48} className="!bg-primary/20 !text-primary" />
              <div>
                <p className="text-white font-bold">{editPayment.user.name || '—'}</p>
                <p className="text-slate-400 text-xs">{editPayment.user.email}</p>
                <p className="text-slate-600 text-xs mt-1">ID: {editPayment.id.slice(0, 8)}...</p>
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <p className="text-slate-400 text-xs mb-1">Mã đơn</p>
              <p className="text-white text-sm font-mono">{editPayment.payosOrderCode || '—'}</p>
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Số tiền (VND)</label>
              <InputNumber min={0} value={editAmount} onChange={(v) => setEditAmount(v ?? 0)}
                className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white"
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Trạng thái</label>
              <Select value={editStatus} onChange={(v) => setEditStatus(v)} className="!w-full" popupClassName="kmate-dark-select"
                options={[{ value: 'PENDING', label: 'Đang chờ' }, { value: 'SUCCESS', label: 'Thành công' }, { value: 'FAILED', label: 'Thất bại' }, { value: 'EXPIRED', label: 'Hết hạn' }, { value: 'REFUNDED', label: 'Hoàn tiền' }]} />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Thời gian thanh toán</label>
              <Input type="datetime-local" value={editPaidAt} onChange={(e) => setEditPaidAt(e.target.value)}
                className="!rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white" />
              <p className="text-slate-600 text-xs mt-1">Để trống nếu chưa thanh toán. Chỉ có tác dụng khi trạng thái là "Thành công".</p>
            </div>
            <Alert type="info" showIcon message="Chỉnh sửa chỉ thay đổi thông tin trong bản ghi thanh toán. Coins đã cộng cho user không tự động thay đổi." className="!rounded-xl !bg-primary/5 !border-primary/20" />
            <div className="flex gap-3 pt-2">
              <Button block onClick={() => { setEditDrawerOpen(false); setEditPayment(null); }} className="!rounded-xl !bg-white/5 !text-slate-400 !border-white/10 hover:!bg-white/10">Huỷ</Button>
              <Button type="primary" block loading={editSaving}
                onClick={async () => {
                  setEditSaving(true);
                  try {
                    await adminService.updatePayment(editPayment.id, { amount: editAmount, status: editStatus as any, paidAt: editPaidAt || null });
                    msgApi.success('Cập nhật thanh toán thành công');
                    setEditDrawerOpen(false); setEditPayment(null); loadPayments(page, statusFilter);
                  } catch (e: any) { msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi cập nhật thanh toán'); }
                  finally { setEditSaving(false); }
                }}
                icon={<SaveOutlined />} className="!rounded-xl !bg-primary !border-primary hover:!bg-primary/90 !font-semibold">Lưu thay đổi</Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 6: AI QUEUE + CREATE
// ════════════════════════════════════════════════════════════

type AITabKey = 'queue' | 'create';

function AIQueueTab({ msgApi }: { msgApi: ReturnType<typeof message.useMessage>[0] }) {
  const [aiTab, setAiTab] = useState<AITabKey>('queue');
  const [jobs, setJobs] = useState<AIJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create fake AI job form
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [selectedType, setSelectedType] = useState('SUBTITLE_GENERATION');
  const [selectedStatus, setSelectedStatus] = useState('QUEUED');
  const [selectedPriority, setSelectedPriority] = useState(1);
  const [createSaving, setCreateSaving] = useState(false);
  const [videoIdInput, setVideoIdInput] = useState('');

  const loadJobs = useCallback(async (s = statusFilter) => {
    setLoading(true);
    try { const res = await adminService.getAIQueue({ status: s || undefined }); setJobs(res.data.data); }
    catch { msgApi.error('Lỗi tải hàng đợi AI'); }
    finally { setLoading(false); }
  }, [msgApi, statusFilter]);

  useEffect(() => { loadJobs(''); }, []);

  useEffect(() => {
    if (aiTab === 'create') {
      adminService.getUsers({ page: 1, limit: 500 }).then((r) => setUsers(r.data.data)).catch(() => {});
    }
  }, [aiTab]);

  const handleRetry = async (id: string) => { setActionLoading(id); try { await adminService.retryAIJob(id); msgApi.success('Đã thử lại job'); loadJobs(statusFilter); } catch { msgApi.error('Lỗi thử lại job'); } finally { setActionLoading(null); } };
  const handleCancel = async (id: string) => { setActionLoading(id); try { await adminService.cancelAIJob(id); msgApi.success('Đã huỷ job'); loadJobs(statusFilter); } catch { msgApi.error('Lỗi huỷ job'); } finally { setActionLoading(null); } };

  const handleCreateFake = async () => {
    if (!selectedUser || !videoIdInput.trim()) { msgApi.warning('Chọn user và nhập video ID'); return; }
    setCreateSaving(true);
    try {
      await adminService.createFakeAIJob({ userId: selectedUser.id, videoId: videoIdInput.trim(), type: selectedType, status: selectedStatus, priority: selectedPriority });
      msgApi.success(`Đã tạo fake AI job cho ${selectedUser.name || selectedUser.email}`);
      setAiTab('queue'); loadJobs(statusFilter);
    } catch (e: any) { msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi tạo fake AI job'); }
    finally { setCreateSaving(false); }
  };

  const AI_TABS: Array<{ key: AITabKey; icon: React.ReactNode; label: string }> = [
    { key: 'queue', icon: <RobotOutlined />, label: 'AI Queue' },
    { key: 'create', icon: <PlusOutlined />, label: 'Tạo Fake' },
  ];

  return (
    <div className="space-y-5">
      <InlineGuide
        color={C.blue}
        steps={[
          'Nhấn Thử lại để chạy lại job thất bại',
          'Nhấn Huỷ để dừng job đang chạy',
          'Dùng tab "Tạo Fake" để tạo AI job giả',
        ]}
      />
      <div className="flex gap-1 border-b border-white/5 pb-0">
        {AI_TABS.map((t) => (
          <button key={t.key} onClick={() => setAiTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-xl transition-all relative ${aiTab === t.key ? 'text-primary bg-primary/10' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── QUEUE ── */}
      {aiTab === 'queue' && (
        <>
          <div className="flex items-center justify-between gap-4">
            <p className="text-slate-500 text-xs">{jobs.length > 0 ? `${jobs.length} jobs` : 'Không có dữ liệu'}</p>
            <div className="flex gap-2">
              <Select placeholder="Tất cả trạng thái" allowClear className="!w-44" value={statusFilter || undefined}
                onChange={(v) => { setStatusFilter(v || ''); loadJobs(v || ''); }}
                options={[{ value: 'QUEUED', label: 'Đang chờ' }, { value: 'PROCESSING', label: 'Đang xử lý' }, { value: 'FAILED', label: 'Thất bại' }, { value: 'COMPLETED', label: 'Hoàn thành' }]} />
              <Button onClick={() => loadJobs(statusFilter)} className="!rounded-xl !bg-white/5 !text-slate-400 !border-white/10 hover:!bg-white/10" icon={<ReloadOutlined />}>Làm mới</Button>
              <Button onClick={() => setAiTab('create')} className="!rounded-xl !bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20" icon={<PlusOutlined />}>Tạo Fake</Button>
            </div>
          </div>
          <GlassCard className="!p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-white/5">{['Người dùng', 'Video', 'Loại', 'Trạng thái', 'Tiến trình', 'Thử lại', 'Tạo lúc', 'Hành động'].map((h) => <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-5 py-3.5 first:pl-6 last:pr-6 whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={8} className="text-center py-16"><Spin /></td></tr>
                  : jobs.length === 0 ? <tr><td colSpan={8}><EmptyState icon={<RobotOutlined style={{ fontSize: 24, color: '#64748b' }} />} message="Không có job nào" /></td></tr>
                  : jobs.map((job) => (
                    <tr key={job.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="px-5 py-3.5 first:pl-6"><div><p className="text-white text-sm font-medium">{job.user.name || '—'}</p><p className="text-slate-400 text-xs">{job.user.email}</p></div></td>
                      <td className="px-5 py-3.5 max-w-[200px]"><p className="text-slate-200 text-xs truncate">{job.video.title}</p></td>
                      <td className="px-5 py-3.5"><Tag className="!rounded-full">{AI_TYPE_LABELS[job.type] || job.type}</Tag></td>
                      <td className="px-5 py-3.5"><Tag color={AI_STATUS_COLORS[job.status] || 'default'} className="!rounded-full">{AI_STATUS_LABELS[job.status] || job.status}</Tag></td>
                      <td className="px-5 py-3.5"><div className="flex items-center gap-2"><div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${job.progress}%` }} /></div><span className="text-slate-400 text-xs">{job.progress}%</span></div></td>
                      <td className="px-5 py-3.5"><span className={job.retryCount > 0 ? 'text-red-400' : 'text-slate-400'}>{job.retryCount}x</span></td>
                      <td className="px-5 py-3.5 last:pr-6"><span className="text-slate-400 text-xs">{dayjs(job.createdAt).format('DD/MM HH:mm')}</span></td>
                      <td className="px-5 py-3.5 last:pr-6">
                        <div className="flex gap-2">
                          {(job.status === 'FAILED' || job.status === 'DEAD_LETTER') && (
                            <Popconfirm title="Thử lại job?" onConfirm={() => handleRetry(job.id)} okText="Thử lại" cancelText="Huỷ">
                              <Button size="small" type="primary" loading={actionLoading === job.id} icon={<RiseOutlined />} className="!rounded-lg !text-xs !bg-green-500 !border-green-500">Thử lại</Button>
                            </Popconfirm>
                          )}
                          {(job.status === 'QUEUED' || job.status === 'PROCESSING') && (
                            <Popconfirm title="Huỷ job?" onConfirm={() => handleCancel(job.id)} okText="Huỷ" cancelText="Huỷ">
                              <Button size="small" danger loading={actionLoading === job.id} icon={<StopOutlined />} className="!rounded-lg !text-xs">Huỷ</Button>
                            </Popconfirm>
                          )}
                          {!['FAILED', 'DEAD_LETTER', 'QUEUED', 'PROCESSING'].includes(job.status) && <span className="text-slate-600 text-xs">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}

      {/* ── CREATE FAKE AI JOB ── */}
      {aiTab === 'create' && (
        <div className="max-w-2xl space-y-5">
          <GlassCard>
            <SectionHeader title="Tạo Fake AI Job" subtitle="Tạo bản ghi AI job giả để test hệ thống" />
            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Chọn người dùng</label>
                <Input prefix={<SearchOutlined className="text-slate-500" />} placeholder="Tìm user..." value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setSelectedUser(null); }} className="!rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white placeholder:!text-slate-500" />
                {!selectedUser && (
                  <div className="mt-2 rounded-xl border border-white/10 overflow-hidden max-h-48 overflow-y-auto">
                    {users.filter((u) => !userSearch || u.email.toLowerCase().includes(userSearch.toLowerCase()) || (u.name ?? '').toLowerCase().includes(userSearch.toLowerCase())).slice(0, 10).map((u) => (
                      <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 cursor-pointer border-b border-white/5 last:border-b-0" onClick={() => { setSelectedUser(u); setUserSearch(''); }}>
                        <Avatar src={u.avatar} icon={<TeamOutlined />} size={28} className="!bg-primary/20 !text-primary flex-shrink-0" />
                        <div className="min-w-0 flex-1"><p className="text-white text-xs font-semibold truncate">{u.name || '—'}</p><p className="text-slate-500 text-xs truncate">{u.email}</p></div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedUser && (
                  <div className="mt-2 flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-primary/20">
                    <Avatar src={selectedUser.avatar} icon={<TeamOutlined />} size={36} className="!bg-primary/20 !text-primary" />
                    <div className="flex-1 min-w-0"><p className="text-white text-sm font-semibold truncate">{selectedUser.name || '—'}</p><p className="text-slate-500 text-xs truncate">{selectedUser.email}</p></div>
                    <Button size="small" danger onClick={() => setSelectedUser(null)} className="!rounded-lg">Huỷ</Button>
                  </div>
                )}
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Video ID *</label>
                <Input placeholder="Nhập video ID (UUID bất kỳ)" value={videoIdInput} onChange={(e) => setVideoIdInput(e.target.value)} className="!rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white placeholder:!text-slate-500" />
                <p className="text-slate-600 text-xs mt-1">UUID không cần tồn tại trong database</p>
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1.5">Loại job</label>
                <Select value={selectedType} onChange={setSelectedType} className="!w-full" popupClassName="kmate-dark-select"
                  options={Object.entries(AI_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Trạng thái</label>
                  <Select value={selectedStatus} onChange={setSelectedStatus} className="!w-full" popupClassName="kmate-dark-select"
                    options={[{ value: 'QUEUED', label: 'Đang chờ (QUEUED)' }, { value: 'PROCESSING', label: 'Đang xử lý (PROCESSING)' }, { value: 'COMPLETED', label: 'Hoàn thành (COMPLETED)' }, { value: 'FAILED', label: 'Thất bại (FAILED)' }]} />
                </div>
                <div><label className="text-slate-400 text-xs font-medium block mb-1.5">Độ ưu tiên (1–10)</label>
                  <InputNumber min={1} max={10} value={selectedPriority} onChange={(v) => setSelectedPriority(v ?? 1)} className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button block onClick={() => setAiTab('queue')} className="!rounded-xl !bg-white/5 !text-slate-400 !border-white/10 hover:!bg-white/10">Huỷ</Button>
                <Button type="primary" block loading={createSaving} onClick={handleCreateFake} icon={<PlusOutlined />} className="!rounded-xl !bg-primary !border-primary hover:!bg-primary/90 !font-semibold">Tạo Fake AI Job</Button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 7: REPORTS
// ════════════════════════════════════════════════════════════

function ReportsTab({ msgApi }: { msgApi: ReturnType<typeof message.useMessage>[0] }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; sent: number; failed: number } | null>(null);

  const loadUsers = useCallback(async () => { setLoading(true); try { const res = await adminService.getUsers({ page: 1, limit: 500 }); setUsers(res.data.data); } catch { msgApi.error('Lỗi tải danh sách người dùng'); } finally { setLoading(false); } }, [msgApi]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleBroadcast = async () => { setBroadcasting(true); setStats(null); try { const res = await adminService.broadcastWeeklyReport(); setStats(res.data.data); msgApi.success(res.data.message); } catch { msgApi.error('Lỗi gửi báo cáo hàng loạt'); } finally { setBroadcasting(false); } };
  const handleSendToUser = async (userId: string) => { setSendingUserId(userId); try { const res = await adminService.sendWeeklyReportToUser(userId); msgApi.success(res.data.message); } catch { msgApi.error('Lỗi gửi báo cáo'); } finally { setSendingUserId(null); } };

  return (
    <div className="space-y-5">
      <InlineGuide
        color={C.purple}
        steps={[
          'Nhấn "Gửi báo cáo cho TẤT CẢ users" để gửi hàng loạt',
          'Nhấn "Gửi báo cáo" trên hàng user để gửi riêng',
        ]}
      />
      <div className="flex items-center justify-between gap-4">
        <div><h3 className="text-white font-bold text-lg">Báo cáo tuần</h3><p className="text-slate-500 text-xs mt-0.5">Gửi email thống kê hoạt động học tập</p></div>
        <Button type="primary" icon={<SendOutlined />} onClick={handleBroadcast} loading={broadcasting} size="large"
          className="!rounded-xl !font-semibold" style={{ background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)', border: 'none' }}>
          Gửi báo cáo cho TẤT CẢ users
        </Button>
      </div>

      {stats && !broadcasting && (
        <div className="grid grid-cols-3 gap-4">
          {[{ label: 'Tổng users', value: stats.total, color: C.purple }, { label: 'Gửi thành công', value: stats.sent, color: C.green }, { label: 'Thất bại', value: stats.failed, color: stats.failed > 0 ? C.red : '#94a3b8' }].map((item) => (
            <GlassCard key={item.label}>
              <p className="text-slate-500 text-xs font-semibold mb-1">{item.label}</p>
              <p className="text-white text-2xl font-black" style={{ color: item.color }}>{item.value}</p>
            </GlassCard>
          ))}
        </div>
      )}

      {broadcasting && <GlassCard><div className="flex items-center justify-center gap-3 py-4"><Spin /><p className="text-slate-400 text-sm">Đang gửi báo cáo hàng loạt...</p></div></GlassCard>}

      <GlassCard>
        <div className="flex items-start gap-3">
          <RobotOutlined style={{ fontSize: 20, color: C.cyan, marginTop: 2, flexShrink: 0 }} />
          <div><p className="text-white text-xs font-semibold mb-1">Báo cáo tuần</p><p className="text-slate-400 text-xs">Bao gồm số videos đã xem, flashcards đã ôn, quiz đã làm, streak và coins. Mỗi user chỉ nhận báo cáo nếu có hoạt động trong tuần.</p></div>
        </div>
      </GlassCard>

      <GlassCard className="!p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <p className="text-slate-500 text-xs">{users.length > 0 ? `${users.length} người dùng` : 'Danh sách'}</p>
          <Button onClick={loadUsers} className="!rounded-xl !bg-white/5 !text-slate-400 !border-white/10 hover:!bg-white/10" icon={<ReloadOutlined />}>Làm mới</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/5">{['Người dùng', 'Coins', 'Streak', 'Trạng thái', 'Hành động'].map((h) => <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-5 py-3.5 first:pl-6 last:pr-6">{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={5} className="text-center py-16"><Spin /></td></tr>
              : users.length === 0 ? <tr><td colSpan={5}><EmptyState icon={<MailOutlined style={{ fontSize: 24, color: '#64748b' }} />} message="Không có người dùng nào" /></td></tr>
              : users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 first:pl-6"><div className="flex items-center gap-3"><Avatar src={u.avatar} icon={<TeamOutlined />} size={36} className="!bg-primary/20 !text-primary flex-shrink-0" /><div><p className="text-white font-semibold text-sm">{u.name || '—'}</p><p className="text-slate-400 text-xs">{u.email}</p></div></div></td>
                  <td className="px-5 py-3.5"><span className="text-secondary font-bold text-sm">{u.coinBalance.toLocaleString('vi-VN')}</span></td>
                  <td className="px-5 py-3.5"><span className="text-amber-400 font-semibold text-sm">{u.streak} ngày</span></td>
                  <td className="px-5 py-3.5">{u.isBanned ? <Tag color="red" className="!rounded-full !font-semibold">Bị cấm</Tag> : <Tag color="green" className="!rounded-full !font-semibold">Hoạt động</Tag>}</td>
                  <td className="px-5 py-3.5 last:pr-6">
                    <Button size="small" icon={<SendOutlined />} loading={sendingUserId === u.id} onClick={() => handleSendToUser(u.id)} disabled={u.isBanned}
                      className="!rounded-xl !text-xs !bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20">Gửi báo cáo</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB 8: LOGS
// ════════════════════════════════════════════════════════════

function LogsTab({ msgApi }: { msgApi: ReturnType<typeof message.useMessage>[0] }) {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async (pg = 1, a = actionFilter) => {
    setLoading(true);
    try { const res = await adminService.getLogs({ page: pg, limit: 50, action: a || undefined }); setLogs(res.data.data); setTotal(res.data.pagination.total); setPage(pg); }
    catch { msgApi.error('Lỗi tải nhật ký'); }
    finally { setLoading(false); }
  }, [msgApi, actionFilter]);

  useEffect(() => { load(1, ''); }, []);

  return (
    <div className="space-y-5">
      <InlineGuide
        color={C.cyan}
        steps={[
          'Xem toàn bộ nhật ký hành động admin',
          'Dùng dropdown để lọc theo loại hành động',
          'Nhấn "Làm mới" để cập nhật danh sách',
        ]}
      />
      <div className="flex items-center justify-between gap-4">
        <div><h3 className="text-white font-bold text-lg">Nhật ký hệ thống</h3><p className="text-slate-500 text-xs mt-0.5">{total > 0 ? `${total} hành động` : 'Không có hành động nào'} được ghi lại</p></div>
        <div className="flex gap-2">
          <Select placeholder="Tất cả hành động" allowClear className="!w-52" value={actionFilter || undefined}
            onChange={(v) => { setActionFilter(v || ''); load(1, v || ''); }}
            options={[
              { value: 'USER_BAN', label: 'Cấm người dùng' }, { value: 'USER_UNBAN', label: 'Mở cấm' },
              { value: 'USER_UPDATE', label: 'Cập nhật người dùng' }, { value: 'USER_GRANT_COINS', label: 'Cấp coins' },
              { value: 'PAYMENT_APPROVE', label: 'Duyệt thanh toán' }, { value: 'PAYMENT_REJECT', label: 'Từ chối thanh toán' },
              { value: 'PAYMENT_CREATE', label: 'Tạo thanh toán' },
              { value: 'AI_JOB_RETRY', label: 'Thử lại AI job' }, { value: 'AI_JOB_CANCEL', label: 'Huỷ AI job' }, { value: 'AI_JOB_CREATE', label: 'Tạo AI job' },
              { value: 'ACHIEVEMENT_CREATE', label: 'Tạo thành tựu' }, { value: 'ACHIEVEMENT_UPDATE', label: 'Cập nhật thành tựu' },
              { value: 'PACKAGE_CREATE', label: 'Tạo gói coins' }, { value: 'PACKAGE_UPDATE', label: 'Cập nhật gói coins' }, { value: 'PACKAGE_DELETE', label: 'Xoá gói coins' },
              { value: 'WEEKLY_REPORT_BROADCAST', label: 'Gửi báo cáo tuần' },
            ]} />
          <Button onClick={() => load(page, actionFilter)} className="!rounded-xl !bg-white/5 !text-slate-400 !border-white/10 hover:!bg-white/10" icon={<ReloadOutlined />}>Làm mới</Button>
        </div>
      </div>

      <Alert type="info" showIcon icon={<FileTextOutlined />} message="Nhật ký được tự động ghi lại khi bạn thực hiện các thao tác CRUD ở các tab khác (Users, Payments, AI Queue, Achievements, Packages). Không thể tạo log thủ công." className="!rounded-xl !bg-primary/5 !border-primary/20" />

      <GlassCard className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-white/5">{['Admin', 'Hành động', 'Loại mục tiêu', 'ID mục tiêu', 'Chi tiết', 'Thời gian'].map((h) => <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-5 py-3.5 first:pl-6 last:pr-6">{h}</th>)}</tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="text-center py-16"><Spin /></td></tr>
              : logs.length === 0 ? <tr><td colSpan={6}><EmptyState icon={<FileTextOutlined style={{ fontSize: 24, color: '#64748b' }} />} message="Không có nhật ký nào" /></td></tr>
              : logs.map((log) => (
                <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 first:pl-6"><div><p className="text-white text-sm font-medium">{log.admin.name || '—'}</p><p className="text-slate-500 text-xs">{log.admin.email}</p></div></td>
                  <td className="px-5 py-3.5"><Tag color={ACTION_COLORS[log.action] || 'default'} className="!rounded-full">{ACTION_LABELS[log.action] || log.action}</Tag></td>
                  <td className="px-5 py-3.5"><Tag className="!rounded-full">{TARGET_TYPE_LABELS[log.targetType] || log.targetType}</Tag></td>
                  <td className="px-5 py-3.5"><span className="text-slate-400 text-xs font-mono">{log.targetId ? `${log.targetId.slice(0, 8)}...` : '—'}</span></td>
                  <td className="px-5 py-3.5 max-w-[200px]">{log.newData ? <span className="text-slate-400 text-xs font-mono truncate block">{JSON.stringify(log.newData).slice(0, 60)}...</span> : <span className="text-slate-600 text-xs">—</span>}</td>
                  <td className="px-5 py-3.5 last:pr-6"><span className="text-slate-400 text-xs">{dayjs(log.createdAt).format('DD/MM/YYYY HH:mm:ss')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/5">
            <p className="text-slate-500 text-xs">Hiển thị {((page - 1) * 50) + 1}–{Math.min(page * 50, total)} / {total.toLocaleString('vi-VN')}</p>
            <div className="flex gap-1">
              <Button size="small" disabled={page === 1} onClick={() => load(page - 1, actionFilter)} className="!rounded-xl !bg-white/5 !border-white/10 !text-slate-400 hover:!bg-white/10 disabled:!opacity-30">‹</Button>
              <div className="flex items-center px-3 text-slate-400 text-xs">{page} / {Math.ceil(total / 50)}</div>
              <Button size="small" disabled={page >= Math.ceil(total / 50)} onClick={() => load(page + 1, actionFilter)} className="!rounded-xl !bg-white/5 !border-white/10 !text-slate-400 hover:!bg-white/10 disabled:!opacity-30">›</Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// TAB: ANALYTICS (Biểu đồ học tập)
// ════════════════════════════════════════════════════════════

type AnalyticsSubKey = 'flashcard' | 'video' | 'quiz';

const ANALYTICS_TABS: Array<{ key: AnalyticsSubKey; icon: React.ReactNode; label: string }> = [
  { key: 'flashcard', icon: <FileTextOutlined />, label: 'Flashcard ôn' },
  { key: 'video', icon: <RiseOutlined />, label: 'Video đã xem' },
  { key: 'quiz', icon: <TrophyOutlined />, label: 'Quiz làm' },
];

const ANALYTICS_COLORS = {
  flashcard: C.purple,
  video: C.cyan,
  quiz: C.amber,
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 px-3 py-2 text-xs" style={{ backgroundColor: '#0f1623' }}>
      <p className="text-slate-300 font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: <span className="text-white">{typeof p.value === 'number' ? p.value.toLocaleString('vi-VN') : p.value}</span>
        </p>
      ))}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 p-5" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
      <div className="mb-4">
        <h3 className="text-white font-bold text-sm">{title}</h3>
        {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function AnalyticsTab({ msgApi }: { msgApi: ReturnType<typeof message.useMessage>[0] }) {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<AnalyticsSubKey>('flashcard');
  const [range, setRange] = useState<'7' | '14' | '30'>('14');

  // Edit/Create drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'edit' | 'create'>('edit');
  const [editDate, setEditDate] = useState<{ date: string; label: string } | null>(null);
  const [createDate, setCreateDate] = useState<string>(dayjs().format('YYYY-MM-DD'));
  const [editForm, setEditForm] = useState({
    videosWatched: 0,
    minutesLearned: 0,
    flashcardsReviewed: 0,
    quizzesTaken: 0,
    averageQuizScore: 0,
    coinsEarned: 0,
    coinsSpent: 0,
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getAnalytics();
      setAnalytics(res.data.data);
    } catch { msgApi.error('Lỗi tải dữ liệu biểu đồ'); }
    finally { setLoading(false); }
  }, [msgApi]);

  useEffect(() => { load(); }, [load]);

  const handleEditRow = (d: typeof rawData[0]) => {
    setDrawerMode('edit');
    setEditDate({ date: d.date, label: dayjs(d.date).format('DD/MM/YYYY') });
    setEditForm({
      videosWatched: d.videosWatched,
      minutesLearned: d.minutesLearned,
      flashcardsReviewed: d.flashcardsReviewed,
      quizzesTaken: d.quizzesTaken,
      averageQuizScore: 0,
      coinsEarned: d.coinsEarned,
      coinsSpent: d.coinsSpent,
    });
    setDrawerOpen(true);
  };

  const handleCreateRow = () => {
    setDrawerMode('create');
    setEditDate(null);
    setCreateDate(dayjs().format('YYYY-MM-DD'));
    setEditForm({
      videosWatched: 0,
      minutesLearned: 0,
      flashcardsReviewed: 0,
      quizzesTaken: 0,
      averageQuizScore: 0,
      coinsEarned: 0,
      coinsSpent: 0,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (drawerMode === 'edit' && !editDate) return;
    if (drawerMode === 'create' && !createDate) {
      msgApi.warning('Vui lòng chọn ngày');
      return;
    }
    setSaving(true);
    try {
      await adminService.updateDailyStats({
        date: drawerMode === 'edit' ? editDate!.date : createDate,
        ...editForm,
      });
      msgApi.success(
        drawerMode === 'edit'
          ? `Đã lưu dữ liệu ngày ${editDate!.label}`
          : `Đã thêm dữ liệu ngày ${dayjs(createDate).format('DD/MM/YYYY')}`
      );
      setDrawerOpen(false);
      load();
    } catch (e: any) {
      msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi lưu dữ liệu');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-16"><Spin size="large" /></div>;
  if (!analytics) return <EmptyState icon={<BarChartOutlined style={{ fontSize: 24, color: '#64748b' }} />} message="Không tải được dữ liệu" />;

  const days = parseInt(range);
  const rawData = (analytics.dailyStats ?? []).slice(-days).reverse();
  const labels = rawData.map((d) => dayjs(d.date).format('DD/MM'));

  const flashcardData = rawData.map((d) => ({ date: dayjs(d.date).format('DD/MM/YYYY'), value: d.flashcardsReviewed }));
  const videoData = rawData.map((d) => ({ date: dayjs(d.date).format('DD/MM/YYYY'), value: d.videosWatched }));
  const quizData = rawData.map((d) => ({ date: dayjs(d.date).format('DD/MM/YYYY'), value: d.quizzesTaken }));

  const totalFlashcard = flashcardData.reduce((s, d) => s + d.value, 0);
  const totalVideo = videoData.reduce((s, d) => s + d.value, 0);
  const totalQuiz = quizData.reduce((s, d) => s + d.value, 0);
  const avgFlashcard = days > 0 ? Math.round(totalFlashcard / days) : 0;
  const avgVideo = days > 0 ? Math.round(totalVideo / days) : 0;
  const avgQuiz = days > 0 ? Math.round(totalQuiz / days) : 0;

  const axisStyle = { fontSize: 11, fill: '#64748b', fontWeight: 500 } as const;
  const gridProps = { stroke: 'rgba(255,255,255,0.04)', strokeDasharray: '4 4' } as const;

  const renderChart = (data: { date: string; value: number }[], color: string, label: string) => (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<CustomTooltip />} />
        <Line
          type="monotone"
          dataKey="value"
          name={label}
          stroke={color}
          strokeWidth={2.5}
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 5, fill: color, strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderBarChart = (data: Array<{ date: string; fc: number; vc: number; qz: number }>, color: string, label: string) => (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<CustomTooltip />} />
        <Bar dataKey="value" name={label} fill={color} radius={[6, 6, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );

  const comboData = rawData.map((d) => ({
    date: dayjs(d.date).format('DD/MM/YYYY'),
    dateShort: dayjs(d.date).format('DD/MM'),
    fc: d.flashcardsReviewed,
    vc: d.videosWatched,
    qz: d.quizzesTaken,
  }));

  const renderComboChart = () => (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={comboData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
        <Line type="monotone" dataKey="fc" name="Flashcard" stroke={C.purple} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="vc" name="Video" stroke={C.cyan} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        <Line type="monotone" dataKey="qz" name="Quiz" stroke={C.amber} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  );

  const renderBarComboChart = () => (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={comboData} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
        <CartesianGrid {...gridProps} />
        <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} />
        <ChartTooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
        <Bar dataKey="fc" name="Flashcard" fill={C.purple} radius={[6, 6, 0, 0]} maxBarSize={40} />
        <Bar dataKey="vc" name="Video" fill={C.cyan} radius={[6, 6, 0, 0]} maxBarSize={40} />
        <Bar dataKey="qz" name="Quiz" fill={C.amber} radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-5">
      <InlineGuide
        color={C.purple}
        steps={[
          'Chọn loại biểu đồ: Flashcard / Video / Quiz',
          'Chọn khoảng thời gian: 7 / 14 / 30 ngày',
          'Xem biểu đồ đường từng loại hoặc kết hợp',
        ]}
      />

      {/* Sub-tab */}
      <div className="flex flex-wrap items-center gap-2">
        {ANALYTICS_TABS.map((tab) => {
          const isActive = subTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                backgroundColor: isActive ? `${ANALYTICS_COLORS[tab.key]}20` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isActive ? `${ANALYTICS_COLORS[tab.key]}50` : 'rgba(255,255,255,0.08)'}`,
                color: isActive ? ANALYTICS_COLORS[tab.key] : '#94a3b8',
              }}
            >
              <span style={{ fontSize: 13 }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Range selector */}
      <div className="flex items-center gap-3">
        <span className="text-slate-500 text-xs font-medium">Khoảng thời gian:</span>
        <div className="flex gap-1">
          {(['7', '14', '30'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={{
                backgroundColor: range === r ? `${C.purple}20` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${range === r ? `${C.purple}50` : 'rgba(255,255,255,0.08)'}`,
                color: range === r ? C.purple : '#64748b',
              }}
            >
              {r} ngày
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          label="Tổng Flashcard"
          value={totalFlashcard.toLocaleString('vi-VN')}
          icon={<FileTextOutlined />}
          color={C.purple}
          bg="rgba(124,77,255,0.08)"
          sub={`TB ${avgFlashcard}/ngày`}
        />
        <StatCard
          label="Tổng Video"
          value={totalVideo.toLocaleString('vi-VN')}
          icon={<RiseOutlined />}
          color={C.cyan}
          bg="rgba(0,229,255,0.08)"
          sub={`TB ${avgVideo}/ngày`}
        />
        <StatCard
          label="Tổng Quiz"
          value={totalQuiz.toLocaleString('vi-VN')}
          icon={<TrophyOutlined />}
          color={C.amber}
          bg="rgba(245,158,11,0.08)"
          sub={`TB ${avgQuiz}/ngày`}
        />
      </div>

      {/* Individual chart */}
      <ChartCard
        title={ANALYTICS_TABS.find(t => t.key === subTab)?.label ?? ''}
        subtitle={`Theo ngày — ${days} ngày gần nhất`}
      >
        {subTab === 'flashcard' && renderChart(flashcardData, C.purple, 'Flashcard ôn')}
        {subTab === 'video' && renderChart(videoData, C.cyan, 'Video đã xem')}
        {subTab === 'quiz' && renderChart(quizData, C.amber, 'Quiz làm')}
      </ChartCard>

      {/* Combined line chart */}
      <ChartCard
        title="Biểu đồ kết hợp"
        subtitle="So sánh 3 loại hoạt động theo thời gian"
      >
        {renderComboChart()}
      </ChartCard>

      {/* Combined bar chart */}
      <ChartCard
        title="Biểu đồ cột kết hợp"
        subtitle="So sánh 3 loại hoạt động theo ngày"
      >
        {renderBarComboChart()}
      </ChartCard>

      {/* Raw data table */}
      <ChartCard
        title="Dữ liệu chi tiết theo ngày"
        subtitle={`${days} ngày gần nhất — nhấn biểu tượng ✏️ để chỉnh sửa`}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-slate-500 text-xs">{rawData.length} bản ghi</span>
          <Button
            size="small"
            icon={<PlusOutlined />}
            onClick={handleCreateRow}
            className="!rounded-xl !bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20"
          >
            Thêm ngày
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Ngày', 'Flashcard ôn', 'Video xem', 'Quiz làm', 'Coins nhận', 'Coins tiêu', 'Hành động'].map((h) => (
                  <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-4 py-3 first:pl-0">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rawData.map((d) => (
                <tr key={d.date} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 first:pl-0 text-slate-300 text-xs font-medium">{dayjs(d.date).format('DD/MM/YYYY')}</td>
                  <td className="px-4 py-3 text-white text-xs font-medium">{d.flashcardsReviewed.toLocaleString()}</td>
                  <td className="px-4 py-3 text-white text-xs font-medium">{d.videosWatched.toLocaleString()}</td>
                  <td className="px-4 py-3 text-white text-xs font-medium">{d.quizzesTaken.toLocaleString()}</td>
                  <td className="px-4 py-3 text-green-400 text-xs font-medium">{d.coinsEarned.toLocaleString()}</td>
                  <td className="px-4 py-3 text-red-400 text-xs font-medium">{d.coinsSpent.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <Tooltip title="Chỉnh sửa">
                      <button
                        onClick={() => handleEditRow(d)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all hover:bg-primary/10 border border-transparent hover:border-primary/20"
                      >
                        <EditOutlined style={{ fontSize: 12, color: C.purple }} />
                      </button>
                    </Tooltip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <div className="flex justify-end">
        <Button onClick={load} icon={<ReloadOutlined />} className="!rounded-xl !bg-white/5 !text-slate-400 !border-white/10 hover:!bg-white/10">
          Làm mới dữ liệu
        </Button>
      </div>

      {/* Edit / Create Drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            {drawerMode === 'edit' ? (
              <>
                <EditOutlined style={{ color: C.purple }} />
                <span className="text-white font-bold">Chỉnh sửa dữ liệu ngày</span>
                {editDate && <Tag color="purple" className="!rounded-full">{editDate.label}</Tag>}
              </>
            ) : (
              <>
                <PlusOutlined style={{ color: C.green }} />
                <span className="text-white font-bold">Thêm dữ liệu ngày mới</span>
              </>
            )}
          </div>
        }
        placement="right"
        width={480}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        styles={{
          body: { backgroundColor: '#0f1623', padding: '24px' },
          header: { backgroundColor: '#0f1623', borderBottom: '1px solid rgba(255,255,255,0.08)' },
        }}
      >
        <div className="space-y-5">
          <Alert
            type="info"
            showIcon
            message={
              drawerMode === 'edit'
                ? 'Chỉnh sửa dữ liệu tổng hợp theo ngày cho toàn bộ nền tảng. Biểu đồ sẽ được cập nhật ngay sau khi lưu.'
                : 'Thêm dữ liệu học tập cho một ngày mới. Biểu đồ sẽ được cập nhật ngay sau khi lưu.'
            }
            className="!rounded-xl !bg-primary/5 !border-primary/20"
          />

          {drawerMode === 'create' && (
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Ngày</label>
              <DatePicker
                value={createDate ? dayjs(createDate, 'YYYY-MM-DD') : null}
                onChange={(d) => setCreateDate(d ? d.format('YYYY-MM-DD') : '')}
                format="DD/MM/YYYY"
                className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-picker-input>input]:!text-white [&_.ant-picker-suffix]:!text-slate-400"
                disabledDate={(current) => current && current > dayjs().endOf('day')}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Video đã xem</label>
              <InputNumber
                min={0}
                value={editForm.videosWatched}
                onChange={(v) => setEditForm((f) => ({ ...f, videosWatched: v ?? 0 }))}
                className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Phút học</label>
              <InputNumber
                min={0}
                value={editForm.minutesLearned}
                onChange={(v) => setEditForm((f) => ({ ...f, minutesLearned: v ?? 0 }))}
                className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Flashcard ôn</label>
              <InputNumber
                min={0}
                value={editForm.flashcardsReviewed}
                onChange={(v) => setEditForm((f) => ({ ...f, flashcardsReviewed: v ?? 0 }))}
                className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Quiz làm</label>
              <InputNumber
                min={0}
                value={editForm.quizzesTaken}
                onChange={(v) => setEditForm((f) => ({ ...f, quizzesTaken: v ?? 0 }))}
                className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Điểm quiz TB</label>
              <InputNumber
                min={0}
                max={100}
                value={editForm.averageQuizScore}
                onChange={(v) => setEditForm((f) => ({ ...f, averageQuizScore: v ?? 0 }))}
                className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white"
              />
            </div>
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Coins nhận</label>
              <InputNumber
                min={0}
                value={editForm.coinsEarned}
                onChange={(v) => setEditForm((f) => ({ ...f, coinsEarned: v ?? 0 }))}
                className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Coins tiêu</label>
              <InputNumber
                min={0}
                value={editForm.coinsSpent}
                onChange={(v) => setEditForm((f) => ({ ...f, coinsSpent: v ?? 0 }))}
                className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white"
              />
            </div>
          </div>

          <Button
            block
            size="large"
            loading={saving}
            onClick={handleSave}
            icon={<SaveOutlined />}
            className="!rounded-xl !bg-primary !border-primary hover:!bg-primary/90 !text-white !font-semibold"
          >
            Lưu thay đổi
          </Button>
        </div>
      </Drawer>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────

export default function AdminSystemEditorClient() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [msgApi, contextHolder] = message.useMessage();
  const [guideOpen, setGuideOpen] = useState(false);

  return (
    <div className="space-y-6">
      {contextHolder}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-xl border border-white/10 text-slate-400 hover:text-white hover:border-white/20 flex items-center justify-center transition-all"
        >
          <span style={{ fontSize: 16 }}>&#8592;</span>
        </button>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${C.purple}20`, color: C.purple }}>
          <EditOutlined />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white">System Editor</h2>
          <p className="text-slate-500 text-xs mt-0.5">Chỉnh sửa toàn bộ dữ liệu hệ thống — CRUD & Fake Data</p>
        </div>
        <button
          onClick={() => setGuideOpen(!guideOpen)}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border"
          style={{
            backgroundColor: guideOpen ? `${C.purple}20` : 'rgba(255,255,255,0.04)',
            borderColor: guideOpen ? `${C.purple}50` : 'rgba(255,255,255,0.08)',
            color: guideOpen ? C.purple : '#94a3b8',
          }}
        >
          <FileTextOutlined />
          {guideOpen ? 'Ẩn hướng dẫn' : 'Xem hướng dẫn'}
        </button>
        <button
          onClick={() => router.push('/admin/user-management')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border"
          style={{
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderColor: 'rgba(255,255,255,0.08)',
            color: '#94a3b8',
          }}
        >
          <UserAddOutlined />
          Fake người dùng
        </button>
      </div>

      {/* Guide Panel */}
      {guideOpen && (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ backgroundColor: '#0d1421', borderColor: `${C.purple}25` }}
        >
          {/* Guide Header */}
          <div
            className="flex items-center gap-3 px-6 py-4"
            style={{ background: `linear-gradient(135deg, ${C.purple}15, ${C.cyan}08)`, borderBottom: `1px solid ${C.purple}20` }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${C.purple}20`, color: C.purple }}
            >
              <FileTextOutlined style={{ fontSize: 20 }} />
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Hướng dẫn sử dụng System Editor</h3>
              <p className="text-slate-400 text-xs mt-0.5">Mọi thao tác đều được ghi lại trong Nhật ký hệ thống. Chỉ admin mới có quyền truy cập.</p>
            </div>
          </div>

          {/* Guide Content */}
          <div className="p-6 space-y-8">
            {/* Quick nav */}
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => { setActiveTab(tab.key); setGuideOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={{
                    backgroundColor: activeTab === tab.key ? `${C.purple}20` : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${activeTab === tab.key ? `${C.purple}40` : 'rgba(255,255,255,0.08)'}`,
                    color: activeTab === tab.key ? C.purple : '#94a3b8',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Column 1 */}
              <div className="space-y-5">
                {/* Dashboard */}
                <GuideSection
                  icon={<DashboardOutlined />}
                  title="1. Dashboard — Tổng quan hệ thống"
                  color={C.purple}
                  steps={[
                    { label: 'Xem thống kê', desc: 'Biểu đồ hiển thị Users mới (30 ngày), Hoạt động (7 ngày), Doanh thu, AI Jobs, Payments.' },
                    { label: 'Cấp Coins', desc: 'Nhấn "Cấp Coins" → Tìm user → Nhập số coins → Nhấn "Cấp". Coins được cộng ngay vào ví, user nhận thông báo real-time. Không cần thanh toán.' },
                    { label: 'Làm mới dữ liệu', desc: 'Nhấn nút "Làm mới" trên bảng để cập nhật số liệu mới nhất.' },
                  ]}
                />
                {/* Users */}
                <GuideSection
                  icon={<TeamOutlined />}
                  title="2. Người dùng — Quản lý tài khoản"
                  color={C.cyan}
                  steps={[
                    { label: 'Tìm user', desc: 'Nhập tên hoặc email vào ô tìm kiếm → nhấn "Tìm". Hỗ trợ tìm một phần.' },
                    { label: 'Sửa thông tin', desc: 'Nhấn nút "Sửa" (biểu tượng bút) trên hàng user → Mở drawer bên phải → Chỉnh sửa tên, email, vai trò, coins, streak → Nhấn "Lưu thay đổi".' },
                    { label: 'Cấm / Mở cấm', desc: 'Nhấn nút "Cấm" để khóa tài khoản. Nhấn "Mở cấm" để khôi phục. Hành động được ghi vào Nhật ký.' },
                    { label: 'Cấp thêm Coins', desc: 'Trong form sửa user, nhấn "+ Cấp thêm Coins" → Nhập số → Nhấn "Cấp". Số dư tự động cập nhật.' },
                    { label: 'Tạo Fake Users', desc: 'Chuyển tab "Fake Users" → Nhập số lượng (1-500) → Chọn phương thức (Ngẫu nhiên / AI Generate) → Chọn Role → Nhấn "Tạo".' },
                    { label: 'Import Excel', desc: 'Chuyển tab "Import" → Kéo thả file .xlsx/.csv → Tick "Bỏ qua trùng lặp" (nếu cần) → Nhấn "Nhập dữ liệu". Cột bắt buộc: Name, Email. Tùy chọn: Password, Provider, Google ID, Role.' },
                    { label: 'Export Excel', desc: 'Chuyển tab "Export" → Tick các tùy chọn (OAuth, Banned users) → Nhấn "Xuất Excel". File tự động tải về.' },
                  ]}
                />
                {/* Achievements */}
                <GuideSection
                  icon={<TrophyOutlined />}
                  title="3. Thành tựu — Quản lý achievements"
                  color={C.amber}
                  steps={[
                    { label: 'Tạo thành tựu mới', desc: 'Nhấn "Tạo thành tựu" (góc trên phải) → Điền Loại (duy nhất, VD: STREAK_7_DAYS), Tên, Emoji, Mô tả, Thưởng Coins, Thưởng XP, Yêu cầu → Nhấn "Lưu".' },
                    { label: 'Sửa thành tựu', desc: 'Nhấn nút "Sửa" (biểu tượng bút) trên hàng thành tựu → Chỉnh sửa thông tin → Nhấn "Lưu".' },
                    { label: 'Bật / Tắt thành tựu', desc: 'Nhấn trực tiếp vào badge trạng thái (Bật/Tắt) trên hàng để toggle. Thành tựu bị tắt sẽ không được trao cho user.' },
                  ]}
                />
                {/* Packages */}
                <GuideSection
                  icon={<ShoppingOutlined />}
                  title="4. Gói Coins — Quản lý pricing"
                  color={C.green}
                  steps={[
                    { label: 'Tạo gói coins', desc: 'Nhấn "Tạo gói coins" → Điền Tên, Mô tả, Số Xu, Xu thưởng (bonus), Giá (VND), Thứ tự hiển thị → Bật/tắt trạng thái → Nhấn "Lưu".' },
                    { label: 'Sửa gói', desc: 'Nhấn nút "Sửa" trên hàng → Chỉnh sửa thông tin → Nhấn "Lưu".' },
                    { label: 'Xoá gói', desc: 'Nhấn nút "Xoá" (biểu tượng thùng rác) → Xác nhận trong popup → Gói bị xóa vĩnh viễn khỏi hệ thống. Hành động không thể hoàn tác.' },
                    { label: 'Bật / Tắt gói', desc: 'Nhấn vào badge trạng thái trên hàng để toggle. Gói bị tắt sẽ không hiển thị cho user nhưng vẫn tồn tại trong database.' },
                  ]}
                />
              </div>

              {/* Column 2 */}
              <div className="space-y-5">
                {/* Payments */}
                <GuideSection
                  icon={<DollarOutlined />}
                  title="5. Thanh toán — Duyệt & Fake payment"
                  color={C.amber}
                  steps={[
                    { label: 'Duyệt thanh toán', desc: 'Trong tab "Payments", tìm payment có trạng thái "Đang chờ" → Nhấn "Xác nhận". Coins được cộng ngay vào ví user + ghi nhận giao dịch trong lịch sử coins.' },
                    { label: 'Từ chối thanh toán', desc: 'Nhấn "Từ chối" trên payment đang chờ. Payment chuyển sang FAILED. User không nhận được coins.' },
                    { label: 'Tạo Fake Payment', desc: 'Chuyển tab "Tạo Fake" → Chọn user → Nhập số tiền (VND) → Nhập số Xu nhận được → Chọn trạng thái → Nhấn "Tạo Fake Payment". Chọn SUCCESS để cộng coins ngay lập tức.' },
                    { label: 'Xem giao dịch Coins', desc: 'Chuyển tab "Giao dịch Coins" để xem toàn bộ lịch sử giao dịch coins: mua coins, cấp admin, tiêu coins xem video, v.v.' },
                  ]}
                />
                {/* AI Queue */}
                <GuideSection
                  icon={<RobotOutlined />}
                  title="6. AI Queue — Quản lý jobs AI"
                  color={C.blue}
                  steps={[
                    { label: 'Thử lại job thất bại', desc: 'Tìm job có trạng thái "Thất bại" hoặc "Dead letter" → Nhấn "Thử lại". Job được đưa lại vào hàng đợi với retryCount tăng thêm 1.' },
                    { label: 'Huỷ job đang chờ', desc: 'Tìm job có trạng thái "Đang chờ" hoặc "Đang xử lý" → Nhấn "Huỷ". Job được đánh dấu FAILED với error message "Đã bị hủy bởi quản trị viên".' },
                    { label: 'Tạo Fake AI Job', desc: 'Chuyển tab "Tạo Fake" → Chọn user → Nhập Video ID (UUID từ bảng Video) → Chọn loại job (SUBTITLE_GENERATION, VOCABULARY_ANALYSIS, v.v.) → Chọn trạng thái → Nhấn "Tạo Fake AI Job".' },
                    { label: 'Loại job AI', desc: 'WHISPER_TRANSCRIPTION: Chuyển âm thanh → văn bản (OpenAI Whisper). TRANSLATION: Dịch phụ đề. VOCABULARY_ANALYSIS: Phân tích từ vựng. QUIZ_GENERATION: Tạo quiz. SUBTITLE_SYNC: Đồng bộ phụ đề. SUBTITLE_GENERATION: Toàn bộ pipeline tạo phụ đề.' },
                  ]}
                />
                {/* Reports */}
                <GuideSection
                  icon={<MailOutlined />}
                  title="7. Báo cáo tuần — Gửi email cho user"
                  color={C.purple}
                  steps={[
                    { label: 'Gửi cho tất cả', desc: 'Nhấn nút "Gửi báo cáo cho TẤT CẢ users" (góc trên phải). Email được gửi hàng loạt cho tất cả user trong hệ thống. Chỉ user có hoạt động trong tuần mới nhận được email.' },
                    { label: 'Gửi cho từng user', desc: 'Tìm user trong bảng → Nhấn "Gửi báo cáo" trên hàng đó. User đã bị cấm (Bị cấm) sẽ không nhận được email.' },
                    { label: 'Nội dung báo cáo', desc: 'Báo cáo tuần bao gồm: số videos đã xem, flashcards đã ôn, quiz đã làm, streak hiện tại, coins kiếm được và tiêu trong tuần.' },
                  ]}
                />
                {/* Logs */}
                <GuideSection
                  icon={<FileTextOutlined />}
                  title="8. Nhật ký — Theo dõi hành động admin"
                  color={C.cyan}
                  steps={[
                    { label: 'Xem nhật ký', desc: 'Tab Logs ghi lại TẤT CẢ hành động của admin trên System Editor: tạo, sửa, xóa, cấm, cấp coins, duyệt thanh toán, v.v.' },
                    { label: 'Lọc theo hành động', desc: 'Sử dụng dropdown "Tất cả hành động" để lọc: Cấm/Mở cấm user, Duyệt/Từ chối thanh toán, Tạo thành tựu, Tạo gói coins, Gửi báo cáo tuần, v.v.' },
                    { label: 'Đọc chi tiết', desc: 'Cột "Chi tiết" hiển thị JSON data của hành động (VD: số coins cấp, user bị cấm, payment được duyệt). Cột "ID mục tiêu" hiển thị 8 ký tự đầu của ID record bị tác động.' },
                  ]}
                />
                {/* Analytics */}
                <GuideSection
                  icon={<BarChartOutlined />}
                  title="9. Biểu đồ học tập — Thống kê hoạt động"
                  color={C.purple}
                  steps={[
                    { label: 'Xem biểu đồ từng loại', desc: 'Chọn tab con: Flashcard ôn, Video đã xem, hoặc Quiz làm để xem biểu đồ đường cho từng loại hoạt động theo thời gian.' },
                    { label: 'Chọn khoảng thời gian', desc: 'Sử dụng bộ chọn: 7 ngày, 14 ngày, 30 ngày để xem dữ liệu trong khoảng thời gian phù hợp. Tất cả biểu đồ và bảng đều cập nhật theo lựa chọn này.' },
                    { label: 'Biểu đồ kết hợp', desc: 'Tab "Biểu đồ kết hợp" hiển thị cả 3 loại hoạt động trên cùng 1 biểu đồ đường để dễ so sánh. Biểu đồ cột kết hợp cho thấy tỷ lệ giữa các loại hoạt động theo ngày.' },
                  ]}
                />
                {/* Important Notes */}
                <div className="rounded-xl border p-4 space-y-2" style={{ backgroundColor: `${C.red}08`, borderColor: `${C.red}20` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <WarningOutlined style={{ color: C.red, fontSize: 16 }} />
                    <span className="text-red-400 text-sm font-bold">Lưu ý quan trọng</span>
                  </div>
                  {[
                    'Tất cả thao tác (tạo/sửa/xóa/cấm/cấp coins) đều được ghi vào Nhật ký hệ thống — không thể xóa.',
                    'Xóa gói coins là hành động VĨNH VIỄN, không thể hoàn tác.',
                    'Fake payment với trạng thái SUCCESS sẽ cộng coins ngay — chỉ dùng để test.',
                    'Fake AI job cần Video ID hợp lệ từ bảng Video trong database.',
                    'Không nên tạo quá 500 Fake Users cùng lúc để tránh quá tải server.',
                  ].map((note, i) => (
                    <p key={i} className="text-slate-400 text-xs flex gap-2">
                      <span style={{ color: C.red, flexShrink: 0 }}>•</span>
                      {note}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="bg-[#151c2a] rounded-2xl border border-white/10 overflow-hidden">
        <div className="flex border-b border-white/5 overflow-x-auto">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-4 text-sm font-medium transition-all relative whitespace-nowrap ${
                  isActive ? 'text-primary' : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <span style={{ fontSize: 15 }}>{tab.icon}</span>
                <span>{tab.label}</span>
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-0.5" style={{ backgroundColor: C.purple }} />}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {activeTab === 'dashboard' && <TabErrorBoundary tabName="Dashboard"><DashboardTab msgApi={msgApi} /></TabErrorBoundary>}
          {activeTab === 'users' && <TabErrorBoundary tabName="Người dùng"><UsersTab msgApi={msgApi} /></TabErrorBoundary>}
          {activeTab === 'achievements' && <TabErrorBoundary tabName="Thành tựu"><AchievementsTab msgApi={msgApi} /></TabErrorBoundary>}
          {activeTab === 'packages' && <TabErrorBoundary tabName="Gói Coins"><PackagesTab msgApi={msgApi} /></TabErrorBoundary>}
          {activeTab === 'payments' && <TabErrorBoundary tabName="Thanh toán"><PaymentsTab msgApi={msgApi} /></TabErrorBoundary>}
          {activeTab === 'ai-queue' && <TabErrorBoundary tabName="AI Queue"><AIQueueTab msgApi={msgApi} /></TabErrorBoundary>}
          {activeTab === 'reports' && <TabErrorBoundary tabName="Báo cáo tuần"><ReportsTab msgApi={msgApi} /></TabErrorBoundary>}
          {activeTab === 'logs' && <TabErrorBoundary tabName="Nhật ký"><LogsTab msgApi={msgApi} /></TabErrorBoundary>}
          {activeTab === 'analytics' && <TabErrorBoundary tabName="Biểu đồ học tập"><AnalyticsTab msgApi={msgApi} /></TabErrorBoundary>}
        </div>
      </div>
    </div>
  );
}
