'use client';

import {
  UserOutlined,
  MailOutlined,
  TrophyOutlined,
  DollarOutlined,
  TeamOutlined,
  RobotOutlined,
  EditOutlined,
  SaveOutlined,
  CrownOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { Avatar, Button, Input, Tag, Spin } from 'antd';
import { useState, useEffect } from 'react';
import { App } from 'antd';
import { adminService, type AdminAnalytics } from '@/lib/api-services';
import { useAuthStore } from '@/store/auth.store';
import dayjs from 'dayjs';

const C = { primary: '#7C4DFF', amber: '#f59e0b', green: '#22c55e', cyan: '#00e5ff', red: '#ef4444', purple: '#7C4DFF' };

export default function AdminProfilePage() {
  const { message } = App.useApp();
  const { user, setUser } = useAuthStore();
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setEditName(user?.name || '');
    adminService.getAnalytics()
      .then((r) => setAnalytics(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await adminService.updateUser(user.id, { name: editName });
      setUser({ ...user, name: editName || null });
      message.success('Cập nhật tên thành công');
      setEditing(false);
    } catch (e: any) {
      message.error(e?.response?.data?.error?.message ?? 'Lỗi khi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  const roleLabels: Record<string, { label: string; color: string }> = {
    ADMIN: { label: 'Quản trị viên', color: '#ef4444' },
    MODERATOR: { label: 'Người kiểm duyệt', color: '#f59e0b' },
    USER: { label: 'Người dùng', color: '#6366f1' },
  };
  const role = user?.role ?? 'USER';
  const roleInfo = roleLabels[role] ?? roleLabels.USER;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-black text-white">Hồ sơ</h2>
        <div className="flex items-center gap-2">
          <a
            href="/admin/system-editor"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all"
            style={{
              backgroundColor: 'rgba(249,115,22,0.12)',
              borderColor: 'rgba(249,115,22,0.30)',
              color: '#fb923c',
            }}
          >
            Quản lý cá nhân
          </a>
          <a
            href="/admin/user-management"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all"
            style={{
              backgroundColor: 'rgba(249,115,22,0.12)',
              borderColor: 'rgba(249,115,22,0.30)',
              color: '#fb923c',
            }}
          >
            Quản lý doanh thu
          </a>
        </div>
      </div>

      {/* Profile Card */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1421] overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[120px] rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="relative p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* Avatar */}
            <div className="shrink-0 relative">
              <Avatar
                size={96}
                src={user?.avatar}
                icon={<UserOutlined />}
                className="!bg-primary/20 !text-primary text-3xl"
              />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-[#0d1421] flex items-center justify-center" style={{ backgroundColor: roleInfo.color }}>
                <CrownOutlined style={{ fontSize: 10, color: '#fff' }} />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 w-full">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {editing ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Nhập tên của bạn"
                        className="!bg-white/5 !border !border-white/20 !text-white !rounded-xl !max-w-xs"
                      />
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={saving}
                        onClick={handleSaveName}
                        className="!font-bold !rounded-xl !bg-primary !border-primary"
                      >
                        Lưu
                      </Button>
                      <Button
                        onClick={() => { setEditing(false); setEditName(user?.name || ''); }}
                        className="!rounded-xl"
                      >
                        Huỷ
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-black text-white">
                        {user?.name || 'Admin'}
                      </h2>
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => setEditing(true)}
                        className="!text-slate-400 hover:!text-white"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <MailOutlined className="text-slate-500" style={{ fontSize: 12 }} />
                    <span className="text-slate-400 text-sm">{user?.email}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-3 flex-wrap">
                    <Tag
                      className="!rounded-full !px-3 !py-0.5 !text-xs !font-bold"
                      style={{ backgroundColor: `${roleInfo.color}20`, color: roleInfo.color, borderColor: `${roleInfo.color}40` }}
                    >
                      {roleInfo.label}
                    </Tag>
                    <span className="text-slate-600 text-xs flex items-center gap-1">
                      <CalendarOutlined style={{ fontSize: 11 }} />
                      Tham gia {(user as unknown as { createdAt?: string })?.createdAt ? dayjs((user as unknown as { createdAt?: string }).createdAt).format('DD/MM/YYYY') : '—'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <TeamOutlined />, label: 'Tổng người dùng', value: analytics?.totalUsers?.toLocaleString('vi-VN') ?? '—', color: '#818cf8', bg: 'rgba(129,140,248,0.1)' },
          { icon: <DollarOutlined />, label: 'Thanh toán thành công', value: analytics?.totalPayments?.toLocaleString('vi-VN') ?? '—', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
          { icon: <TrophyOutlined />, label: 'Thành tựu', value: analytics?.totalAchievements?.toLocaleString('vi-VN') ?? '—', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { icon: <RobotOutlined />, label: 'AI Jobs đã xử lý', value: analytics?.totalAIJobs?.toLocaleString('vi-VN') ?? '—', color: C.primary, bg: `${C.primary}20` },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-white/5 p-5 relative overflow-hidden"
            style={{ backgroundColor: '#0d1421', borderColor: `${item.color}30` }}
          >
            <div
              className="absolute top-0 right-0 w-20 h-20 opacity-10 blur-2xl rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <div className="flex items-center gap-3 mb-3">
              <span style={{ color: item.color, fontSize: 20 }}>{item.icon}</span>
              <span className="text-xs font-bold uppercase tracking-wider" style={{ color: item.color }}>
                {item.label}
              </span>
            </div>
            <p className="text-2xl font-black text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Account Info */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1421] p-6">
        <h3 className="text-white font-bold text-base mb-4 flex items-center gap-2">
          <CrownOutlined style={{ color: C.primary }} />
          Thông tin tài khoản
        </h3>
        <div className="space-y-3">
          {[
            { label: 'Họ tên', value: user?.name || '—' },
            { label: 'Email', value: user?.email || '—' },
            { label: 'Vai trò', value: roleInfo.label },
            { label: 'Ngày tạo', value: (user as unknown as { createdAt?: string })?.createdAt ? dayjs((user as unknown as { createdAt?: string }).createdAt).format('DD/MM/YYYY HH:mm') : '—' },
            { label: 'ID', value: user?.id?.slice(0, 8) + '...' || '—' },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-b-0">
              <span className="text-slate-500 text-sm">{item.label}</span>
              <span className="text-white text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
