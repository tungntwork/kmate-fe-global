'use client';

import { useState, useEffect } from 'react';
import {
  SearchOutlined,
  UserOutlined,
  StopOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  FilterOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { Input, Button, Tag, Avatar, Popconfirm } from 'antd';
import { App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useRouter } from 'next/navigation';
import { adminService, type AdminUser } from '@/lib/api-services';

const C = {
  purple: '#7C4DFF',
  cyan: '#00e5ff',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
};

function StatCard({ label, value, icon, color, bg }: {
  label: string; value: string | number; icon: React.ReactNode; color: string; bg: string;
}) {
  return (
    <div
      className="rounded-2xl border p-4 relative overflow-hidden flex flex-col gap-1"
      style={{ backgroundColor: bg, borderColor: `${color}30` }}
    >
      <div className="absolute top-0 right-0 w-16 h-16 opacity-10 blur-2xl rounded-full" style={{ backgroundColor: color }} />
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {icon}
        </div>
      </div>
      <p className="text-white text-2xl font-black mt-1">{value}</p>
      <p className="text-slate-400 text-xs font-medium">{label}</p>
    </div>
  );
}

export default function AdminUsersPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionId, setActionId] = useState<string | null>(null);
  const [statLoading, setStatLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [bannedUsers, setBannedUsers] = useState(0);

  const load = async (pg = 1, q = search) => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({ page: pg, limit: 20, search: q || undefined });
      setUsers(res.data.data);
      setTotal(res.data.pagination.total);
      setPage(pg);
    } catch { message.error('Lỗi tải người dùng'); }
    finally { setLoading(false); }
  };

  const loadStats = async () => {
    setStatLoading(true);
    try {
      const res = await adminService.getUsers({ page: 1, limit: 1 });
      setTotalUsers(res.data.pagination?.total ?? 0);
    } catch { /* silent */ }
    setStatLoading(false);
  };

  useEffect(() => { load(1, ''); loadStats(); }, []);

  const handleBan = async (id: string) => {
    setActionId(id);
    try {
      await adminService.banUser(id);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isBanned: true } : u));
      setBannedUsers((n) => n + 1);
      message.success({ content: 'Đã cấm người dùng', style: { marginTop: 64 } });
    } catch { message.error('Lỗi cấm người dùng'); }
    finally { setActionId(null); }
  };

  const handleUnban = async (id: string) => {
    setActionId(id);
    try {
      await adminService.unbanUser(id);
      setUsers((prev) => prev.map((u) => u.id === id ? { ...u, isBanned: false } : u));
      setBannedUsers((n) => Math.max(0, n - 1));
      message.success({ content: 'Đã mở cấm người dùng', style: { marginTop: 64 } });
    } catch { message.error('Lỗi mở cấm người dùng'); }
    finally { setActionId(null); }
  };

  const columns: ColumnsType<AdminUser> = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_, record) => (
        <div className="flex items-center gap-3 min-w-0">
          <Avatar
            src={record.avatar}
            icon={<UserOutlined />}
            className="!bg-primary/20 !text-primary flex-shrink-0"
            size={36}
          />
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate max-w-[160px]">{record.name || '—'}</p>
            <p className="text-slate-400 text-xs truncate max-w-[200px]">{record.email}</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 130,
      render: (r: string) => (
        <Tag
          color={r === 'ADMIN' ? 'red' : r === 'MODERATOR' ? 'orange' : 'default'}
          className="!rounded-full !font-semibold"
        >
          {r === 'ADMIN' ? 'Admin' : r === 'MODERATOR' ? 'Moderator' : 'Người dùng'}
        </Tag>
      ),
    },
    {
      title: 'Coins',
      dataIndex: 'coinBalance',
      key: 'coinBalance',
      width: 100,
      render: (c: number) => (
        <span className="text-secondary font-bold text-sm">{c.toLocaleString('vi-VN')}</span>
      ),
    },
    {
      title: 'Chuỗi',
      dataIndex: 'streak',
      key: 'streak',
      width: 100,
      render: (s: number) => (
        <div className="flex items-center gap-1">
          <span className="text-amber-400 font-semibold text-sm">{s}</span>
          <span className="text-slate-500 text-xs">ngày</span>
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_, record) =>
        record.isBanned ? (
          <Tag color="red" className="!rounded-full !font-semibold">Bị cấm</Tag>
        ) : (
          <Tag color="green" className="!rounded-full !font-semibold">Hoạt động</Tag>
        ),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_, record) => (
        <div className="flex gap-2 items-center">
          <Button
            size="small"
            onClick={() => router.push(`/admin/users/${record.id}`)}
            className="!rounded-xl !text-xs !bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20"
          >
            Chi tiết
          </Button>
          {record.isBanned ? (
            <Popconfirm
              title="Mở cấm người dùng này?"
              onConfirm={() => handleUnban(record.id)}
              okText="Mở cấm"
              cancelText="Huỷ"
              okButtonProps={{ className: '!bg-green-500 !border-green-500' }}
            >
              <Button
                size="small"
                loading={actionId === record.id}
                className="!rounded-xl !text-xs !bg-green-500/10 !text-green-400 !border-green-500/20 hover:!bg-green-500/20"
              >
                <CheckCircleOutlined /> Mở cấm
              </Button>
            </Popconfirm>
          ) : (
            <Popconfirm
              title="Cấm người dùng này?"
              onConfirm={() => handleBan(record.id)}
              okText="Cấm"
              cancelText="Huỷ"
              okButtonProps={{ danger: true }}
            >
              <Button
                size="small"
                danger
                loading={actionId === record.id}
                className="!rounded-xl !text-xs"
              >
                <StopOutlined /> Cấm
              </Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Quản lý Người dùng</h2>
          <p className="text-slate-500 text-xs mt-0.5">Xem, tìm kiếm và quản lý tài khoản người dùng</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Tổng người dùng"
          value={totalUsers.toLocaleString('vi-VN')}
          icon={<TeamOutlined />}
          color={C.purple}
          bg="rgba(124,77,255,0.08)"
        />
        <StatCard
          label="Đang hoạt động"
          value={(totalUsers - bannedUsers).toLocaleString('vi-VN')}
          icon={<CheckCircleOutlined />}
          color={C.green}
          bg="rgba(34,197,94,0.08)"
        />
        <StatCard
          label="Bị cấm"
          value={bannedUsers.toLocaleString('vi-VN')}
          icon={<StopOutlined />}
          color={C.red}
          bg="rgba(239,68,68,0.08)"
        />
      </div>

      {/* Main card */}
      <div className="bg-[#151c2a] rounded-2xl border border-white/10 overflow-hidden">
        {/* Table header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 border-b border-white/5">
          <div>
            <h3 className="text-white font-bold text-sm">Danh sách người dùng</h3>
            <p className="text-slate-500 text-xs mt-0.5">
              {total > 0 ? `${total.toLocaleString('vi-VN')} người dùng` : 'Không có dữ liệu'}
            </p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Input
              prefix={<SearchOutlined className="text-slate-500" />}
              placeholder="Tìm theo email hoặc tên..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={() => load(1, search)}
              className="!w-full sm:!w-72 !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white placeholder:!text-slate-500 hover:!border-primary/30 focus:!border-primary/50"
            />
            <Button
              onClick={() => load(1, search)}
              className="!rounded-xl !bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20"
              icon={<SearchOutlined />}
            >
              Tìm
            </Button>
            <Button
              onClick={() => { setSearch(''); load(1, ''); }}
              className="!rounded-xl !bg-white/5 !text-slate-400 !border-white/10 hover:!bg-white/10"
              icon={<ReloadOutlined />}
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <div className="kmate-table">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  {['Người dùng', 'Vai trò', 'Coins', 'Chuỗi', 'Trạng thái', 'Hành động'].map((h) => (
                    <th
                      key={h}
                      className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-5 py-3.5 first:pl-6 last:pr-6"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex justify-center items-center">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                          <UserOutlined className="text-slate-600 text-2xl" />
                        </div>
                        <div>
                          <p className="text-slate-300 text-sm font-medium">Không tìm thấy người dùng</p>
                          <p className="text-slate-500 text-xs mt-1">Thử thay đổi từ khoá tìm kiếm</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user, idx) => (
                    <tr
                      key={user.id}
                      className={`border-b border-white/5 transition-colors hover:bg-white/[0.02] ${
                        idx === users.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      {/* User */}
                      <td className="px-5 py-3.5 first:pl-6">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar
                            src={user.avatar}
                            icon={<UserOutlined />}
                            className="!bg-primary/20 !text-primary flex-shrink-0"
                            size={36}
                          />
                          <div className="min-w-0">
                            <p className="text-white font-semibold text-sm truncate max-w-[160px]">{user.name || '—'}</p>
                            <p className="text-slate-400 text-xs truncate max-w-[200px]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      {/* Role */}
                      <td className="px-5 py-3.5">
                        <Tag
                          color={user.role === 'ADMIN' ? 'red' : user.role === 'MODERATOR' ? 'orange' : 'default'}
                          className="!rounded-full !font-semibold"
                        >
                          {user.role === 'ADMIN' ? 'Admin' : user.role === 'MODERATOR' ? 'Moderator' : 'Người dùng'}
                        </Tag>
                      </td>
                      {/* Coins */}
                      <td className="px-5 py-3.5">
                        <span className="text-secondary font-bold text-sm">{user.coinBalance.toLocaleString('vi-VN')}</span>
                      </td>
                      {/* Streak */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <span className="text-amber-400 font-semibold text-sm">{user.streak}</span>
                          <span className="text-slate-500 text-xs">ngày</span>
                        </div>
                      </td>
                      {/* Status */}
                      <td className="px-5 py-3.5">
                        {user.isBanned ? (
                          <Tag color="red" className="!rounded-full !font-semibold">Bị cấm</Tag>
                        ) : (
                          <Tag color="green" className="!rounded-full !font-semibold">Hoạt động</Tag>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-5 py-3.5 last:pr-6">
                        <div className="flex gap-2 items-center">
                          <Button
                            size="small"
                            onClick={() => router.push(`/admin/users/${user.id}`)}
                            className="!rounded-xl !text-xs !bg-primary/10 !text-primary !border-primary/20 hover:!bg-primary/20"
                          >
                            Chi tiết
                          </Button>
                          {user.isBanned ? (
                            <Popconfirm
                              title="Mở cấm người dùng này?"
                              onConfirm={() => handleUnban(user.id)}
                              okText="Mở cấm"
                              cancelText="Huỷ"
                              okButtonProps={{ className: '!bg-green-500 !border-green-500' }}
                            >
                              <Button
                                size="small"
                                loading={actionId === user.id}
                                className="!rounded-xl !text-xs !bg-green-500/10 !text-green-400 !border-green-500/20 hover:!bg-green-500/20"
                              >
                                <CheckCircleOutlined /> Mở cấm
                              </Button>
                            </Popconfirm>
                          ) : (
                            <Popconfirm
                              title="Cấm người dùng này?"
                              onConfirm={() => handleBan(user.id)}
                              okText="Cấm"
                              cancelText="Huỷ"
                              okButtonProps={{ danger: true }}
                            >
                              <Button
                                size="small"
                                danger
                                loading={actionId === user.id}
                                className="!rounded-xl !text-xs"
                              >
                                <StopOutlined /> Cấm
                              </Button>
                            </Popconfirm>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/5">
            <p className="text-slate-500 text-xs">
              Hiển thị {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} trong {total.toLocaleString('vi-VN')} người dùng
            </p>
            <div className="flex gap-1">
              <Button
                size="small"
                disabled={page === 1}
                onClick={() => load(page - 1, search)}
                className="!rounded-xl !bg-white/5 !border-white/10 !text-slate-400 hover:!bg-white/10 disabled:!opacity-30"
              >
                ‹
              </Button>
              <div className="flex items-center px-3 text-slate-400 text-xs">
                {page} / {Math.ceil(total / 20)}
              </div>
              <Button
                size="small"
                disabled={page >= Math.ceil(total / 20)}
                onClick={() => load(page + 1, search)}
                className="!rounded-xl !bg-white/5 !border-white/10 !text-slate-400 hover:!bg-white/10 disabled:!opacity-30"
              >
                ›
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
