'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UserOutlined,
  VideoCameraOutlined,
  DollarOutlined,
  RobotOutlined,
  ArrowUpOutlined,
  TeamOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { Spin, message } from 'antd';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { adminService, type AdminDashboard, type AdminAnalytics } from '@/lib/api-services';

const C = {
  purple: '#7C4DFF',
  cyan: '#00e5ff',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  slate: '#64748b',
};

const CHART_COLORS = [C.purple, C.cyan, C.green, C.amber, C.red];

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1623] border border-white/15 rounded-xl px-4 py-3 shadow-2xl min-w-[150px]">
      <p className="text-slate-400 text-xs font-semibold mb-2 border-b border-white/10 pb-2">{label}</p>
      {payload.map((e, i) => (
        <div key={i} className="flex items-center justify-between gap-6 py-0.5">
          <span className="text-slate-400 text-xs flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
            {e.name}
          </span>
          <span className="text-white text-xs font-bold">{e.value.toLocaleString('vi-VN')}</span>
        </div>
      ))}
    </div>
  );
}

function RevenueTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0f1623] border border-white/15 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-slate-400 text-xs font-semibold mb-2 border-b border-white/10 pb-2">{label}</p>
      <div className="flex items-center justify-between gap-6">
        <span className="text-slate-400 text-xs flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: C.amber }} />
          Doanh thu
        </span>
        <span className="text-amber-400 text-xs font-bold">{payload[0].value.toLocaleString('vi-VN')} đ</span>
      </div>
    </div>
  );
}

function PaymentTooltip({ active, payload, label, analytics }: {
  active?: boolean;
  payload?: Array<{ value: number; color: string }>;
  label?: string;
  analytics: AdminAnalytics | null;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const amt = (analytics?.paymentBreakdown ?? []).find((p) => p.status === label)?.totalAmount ?? 0;
  return (
    <div className="bg-[#0f1623] border border-white/15 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-white text-sm font-bold mb-2">{label}</p>
      <div className="flex items-center justify-between gap-6">
        <span className="text-slate-400 text-xs">Số giao dịch</span>
        <span className="text-white text-xs font-bold">{entry.value.toLocaleString('vi-VN')}</span>
      </div>
      <div className="flex items-center justify-between gap-6 mt-1">
        <span className="text-slate-400 text-xs">Tổng tiền</span>
        <span className="text-amber-400 text-xs font-bold">{amt.toLocaleString('vi-VN')} đ</span>
      </div>
    </div>
  );
}

function PieTooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { percent: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-[#0f1623] border border-white/15 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-white text-sm font-bold">{d.name}</p>
      <p className="text-slate-400 text-xs mt-1">{d.value.toLocaleString('vi-VN')} người ({(d.payload.percent * 100).toFixed(1)}%)</p>
    </div>
  );
}

function AITooltip({ active, payload, label }: {
  active?: unknown;
  payload?: unknown;
  label?: unknown;
}) {
  const p = payload as Array<{ value: number }> | undefined;
  if (!active || !p?.length) return null;
  return (
    <div className="bg-[#0f1623] border border-white/15 rounded-xl px-4 py-3 shadow-2xl">
      <p className="text-white text-xs font-bold mb-1">{label as string}</p>
      <p className="text-slate-300 text-xs">{p[0].value} jobs (7 ngày)</p>
    </div>
  );
}

function StatCard({ title, value, sub, icon, color, bg }: {
  title: string; value: string | number; sub?: string; icon: React.ReactNode; color: string; bg: string;
}) {
  return (
    <div
      className="rounded-2xl border p-5 relative overflow-hidden flex flex-col gap-1"
      style={{ backgroundColor: bg, borderColor: `${color}30` }}
    >
      <div className="absolute top-0 right-0 w-20 h-20 opacity-10 blur-3xl rounded-full" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {icon}
        </div>
        {sub && <span className="text-slate-500 text-xs mt-1">{sub}</span>}
      </div>
      <p className="text-white text-2xl font-black mt-1">{value}</p>
      <p className="text-slate-400 text-xs font-medium">{title}</p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-[#151c2a] rounded-2xl border border-white/10 p-5">
      <div className="mb-4">
        <h3 className="text-white font-bold text-sm">{title}</h3>
        {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

const commonGrid = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.04)' };
const commonAxis = {
  stroke: 'rgba(255,255,255,0)' as const,
  tick: { fill: C.slate, fontSize: 11 } as any,
  axisLine: false,
  tickLine: false,
} as any;

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      message.error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
      setTimeout(() => { router.push('/login'); }, 1500);
      return;
    }

    Promise.allSettled([
      adminService.getDashboard(),
      adminService.getAnalytics(),
    ]).then(([dashRes, analyticsRes]) => {
      if (dashRes.status === 'fulfilled') setData(dashRes.value.data.data);
      if (analyticsRes.status === 'fulfilled') setAnalytics(analyticsRes.value.data.data);
      else message.error('Không thể tải một số dữ liệu analytics.');
    }).catch(() => message.error('Không thể tải dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spin size="large" /></div>;
  }

  const activityChart = (analytics?.dailyStats ?? []).slice(-14).map((d) => ({
    date: new Date(d.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
    'Videos xem': d.videosWatched,
    'Flashcards ôn': d.flashcardsReviewed,
    'Quiz làm': d.quizzesTaken,
    'Coins nhận': d.coinsEarned,
  }));

  const revenueChart = (analytics?.revenueStats ?? []).slice(-14).map((d) => ({
    date: new Date(d.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
    'Doanh thu': d.amount,
  }));

  const userGrowthChart = (analytics?.platformStats ?? []).slice(-14).map((d) => ({
    date: new Date(d.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
    'Người dùng mới': d.newUsers,
    'Hoạt động': d.activeUsers,
  }));

  const aiJobChart = (analytics?.aiJobStats?.typeBreakdown ?? []).map((d) => ({
    name: d.type.replace(/_/g, ' ').replace(/^\w/, (c: string) => c.toUpperCase()),
    count: d.count,
  }));

  const paymentChart = (analytics?.paymentBreakdown ?? []).map((d) => ({
    name: d.status,
    count: d.count,
    amount: d.totalAmount,
  }));

  const roleChart = (analytics?.userStats?.roleBreakdown ?? []).map((d, i) => ({
    name: d.role === 'ADMIN' ? 'Admin' : d.role === 'MODERATOR' ? 'Moderator' : 'Người dùng',
    value: d.count,
    color: CHART_COLORS[i % CHART_COLORS.length],
  }));

  const totalRevenue = (analytics?.paymentBreakdown ?? [])
    .filter((p) => p.status === 'SUCCESS')
    .reduce((s, p) => s + p.totalAmount, 0);

  const aiJobsTotal = analytics?.aiJobStats?.total ?? 0;
  const aiJobsFailed = analytics?.aiJobStats?.failed ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-black text-white">Tổng quan</h2>
        <span className="text-slate-500 text-sm">Thống kê nền tảng</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Tổng người dùng" value={data?.totalUsers ?? 0} sub={`+${analytics?.userStats.newLast30d ?? 0} tháng này`} icon={<UserOutlined />} color={C.purple} bg="rgba(124,77,255,0.08)" />
        <StatCard title="Hoạt động (7 ngày)" value={analytics?.userStats.activeLast7d ?? 0} sub={`${data?.activeUsers ?? 0} 24 giờ`} icon={<TeamOutlined />} color={C.green} bg="rgba(34,197,94,0.08)" />
        <StatCard title="Tổng video" value={data?.totalVideos ?? 0} icon={<VideoCameraOutlined />} color={C.cyan} bg="rgba(0,229,255,0.08)" />
        <StatCard title="Doanh thu" value={`${(totalRevenue / 1000).toFixed(1)}k đ`} sub={`${data?.totalPayments ?? 0} giao dịch`} icon={<DollarOutlined />} color={C.amber} bg="rgba(245,158,11,0.08)" />
        <StatCard title="AI Jobs" value={aiJobsTotal} sub={`${aiJobsFailed} thất bại`} icon={<RobotOutlined />} color={aiJobsFailed > 0 ? C.red : C.purple} bg={aiJobsFailed > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(124,77,255,0.08)'} />
        <StatCard title="Coins nhận (7 ngày)" value={(analytics?.dailyStats ?? []).reduce((s, d) => s + d.coinsEarned, 0).toLocaleString()} icon={<TrophyOutlined />} color={C.amber} bg="rgba(245,158,11,0.08)" />
      </div>

      {/* Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <ChartCard title="Hoạt động học tập" subtitle="Videos xem, Flashcards ôn, Quiz làm — 14 ngày gần nhất · Di chuột để xem chi tiết">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={activityChart} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <CartesianGrid {...commonGrid} />
                <XAxis dataKey="date" {...commonAxis} />
                <YAxis {...commonAxis} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8', paddingTop: 8 } as React.CSSProperties} />
                <Line type="monotone" dataKey="Videos xem" stroke={C.purple} strokeWidth={2} dot={{ r: 2.5, fill: C.purple }} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Flashcards ôn" stroke={C.cyan} strokeWidth={2} dot={{ r: 2.5, fill: C.cyan }} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Quiz làm" stroke={C.green} strokeWidth={2} dot={{ r: 2.5, fill: C.green }} activeDot={{ r: 5, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Coins nhận" stroke={C.amber} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <div className="lg:col-span-2">
          <ChartCard title="Doanh thu theo ngày" subtitle="Giao dịch thành công — 14 ngày gần nhất · Di chuột để xem chi tiết">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenueChart} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.amber} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={C.amber} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...commonGrid} />
                <XAxis dataKey="date" {...commonAxis} />
                <YAxis {...commonAxis} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<RevenueTooltip />} />
                <Area type="monotone" dataKey="Doanh thu" stroke={C.amber} strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <ChartCard title="Tăng trưởng người dùng" subtitle="Người dùng mới & hoạt động — 14 ngày · Di chuột để xem chi tiết">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={userGrowthChart} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barGap={4}>
              <CartesianGrid {...commonGrid} vertical={false} />
              <XAxis dataKey="date" {...commonAxis} />
              <YAxis {...commonAxis} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' } as React.CSSProperties} />
              <Bar dataKey="Người dùng mới" fill={C.purple} radius={[3, 3, 0, 0]} />
              <Bar dataKey="Hoạt động" fill={C.cyan} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Giao dịch theo trạng thái" subtitle="30 ngày gần nhất · Di chuột để xem số lượng & tổng tiền">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={paymentChart} layout="vertical" margin={{ top: 0, right: 8, left: 60, bottom: 0 }}>
              <CartesianGrid {...commonGrid} horizontal={false} />
              <XAxis type="number" {...commonAxis} />
              <YAxis type="category" dataKey="name" {...commonAxis} width={60} />
              <Tooltip content={<PaymentTooltip analytics={analytics} />} />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {(analytics?.paymentBreakdown ?? []).map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Phân bổ người dùng theo vai trò" subtitle="Tỷ lệ Admin / Moderator / Người dùng · Di chuột để xem chi tiết">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={roleChart}
                cx="40%"
                cy="45%"
                innerRadius={48}
                outerRadius={76}
                paddingAngle={3}
                dataKey="value"
              >
                {roleChart.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, color: '#94a3b8', right: 4, top: '25%' } as React.CSSProperties}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="AI Processing Jobs" subtitle="Phân loại jobs đã xử lý — 7 ngày gần nhất · Di chuột để xem chi tiết">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={aiJobChart} margin={{ top: 4, right: 8, left: -24, bottom: 32 }}>
              <CartesianGrid {...commonGrid} vertical={false} />
              <XAxis dataKey="name" {...commonAxis} angle={-20} textAnchor="end" interval={0} />
              <YAxis {...commonAxis} />
              <Tooltip content={<AITooltip />} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {aiJobChart.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Trạng thái AI Queue" subtitle="Tổng quan jobs đang chờ & đang xử lý">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Đang chờ', value: analytics?.aiJobStats?.queued ?? 0, color: C.purple },
              { label: 'Đang xử lý', value: analytics?.aiJobStats?.processing ?? 0, color: C.cyan },
              { label: 'Hoàn thành', value: analytics?.aiJobStats?.completed ?? 0, color: C.green },
              { label: 'Thất bại', value: (analytics?.aiJobStats?.failed ?? 0) + (analytics?.aiJobStats?.deadLetter ?? 0), color: C.red },
            ].map((item) => (
              <div key={item.label} className="bg-[#0f1623] rounded-xl border border-white/10 p-4 flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <div>
                  <p className="text-white text-lg font-black">{item.value.toLocaleString()}</p>
                  <p className="text-slate-500 text-xs">{item.label}</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Quick Actions */}
      <div className="bg-[#151c2a] rounded-2xl border border-white/10 p-5">
        <h3 className="text-white font-bold text-sm mb-4">Thao tác nhanh</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Quản lý người dùng', href: '/admin/users', color: C.purple },
            { label: 'Xem giao dịch', href: '/admin/payments', color: C.green },
            { label: 'AI Queue', href: '/admin/ai-queue', color: C.red },
            { label: 'Nhật ký hệ thống', href: '/admin/logs', color: C.cyan },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 hover:border-white/20 transition-all text-sm font-medium text-white"
              style={{ borderColor: `${item.color}30` }}
            >
              <ArrowUpOutlined style={{ color: item.color }} />
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
