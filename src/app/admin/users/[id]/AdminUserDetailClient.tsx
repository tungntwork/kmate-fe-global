'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Avatar, Tag, Button, Spin, Descriptions,
  Modal, InputNumber, Form, Select,
  Input, DatePicker, Upload, Divider, Tooltip, message,
} from 'antd';
import {
  ArrowLeftOutlined, StopOutlined, CheckCircleOutlined,
  UserOutlined, DollarOutlined, CheckCircleFilled,
  EditOutlined, SaveOutlined, CameraOutlined, ReloadOutlined,
  InfoCircleOutlined, MailOutlined,
} from '@ant-design/icons';
import type { GetProp, UploadFile, UploadProps } from 'antd';
import { App } from 'antd';
import dayjs from 'dayjs';
import { adminService, coinService, type AdminUserDetail, type CoinPackage } from '@/lib/api-services';

const C = {
  purple: '#7C4DFF',
  cyan: '#00e5ff',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  border: 'rgba(255,255,255,0.1)',
};

function SectionCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ background: '#151c2a', borderColor: C.border }}
    >
      {title && (
        <div
          className="px-5 py-3 font-bold text-sm text-white flex items-center gap-2"
          style={{ borderBottom: `1px solid ${C.border}` }}
        >
          {title}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-slate-500 text-sm shrink-0 w-40">{label}</span>
      <span className="text-slate-200 text-sm text-right break-all">{value}</span>
    </div>
  );
}

function StatPill({ label, value, icon, color }: {
  label: string; value: string | number; icon: React.ReactNode; color: string;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-xl border"
      style={{ background: `${color}10`, borderColor: `${color}30` }}
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: `${color}20`, color }}
      >
        {icon}
      </div>
      <div>
        <p className="text-white text-base font-black leading-none">{value}</p>
        <p className="text-slate-400 text-xs mt-0.5">{label}</p>
      </div>
    </div>
  );
}

interface EditFormValues {
  email: string;
  name: string;
  avatar: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  coinBalance: number;
  streak: number;
  isNewUser: boolean;
  lastActiveAt: dayjs.Dayjs | null;
  quizCount: number;
  watchProgressCount: number;
  paymentCount: number;
  totalPaymentAmount: number;
  flashcardCount: number;
}

export default function AdminUserDetailPage() {
  const { message: antdMessage, notification: antdNotification } = App.useApp();
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantLoading, setGrantLoading] = useState(false);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [selectedMode, setSelectedMode] = useState<'preset' | 'custom'>('preset');
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string>('');

  const fetchUser = () => {
    const id = params.id as string;
    adminService.getUser(id)
      .then((r) => {
        const u = r.data.data;
        setUser(u as AdminUserDetail);
        setAvatarPreview(u.avatar || '');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUser(); }, [params.id]);

  useEffect(() => {
    if (grantOpen) {
      coinService.getPackages()
        .then((r) => setPackages(r.data.data.filter((p: CoinPackage) => p.isActive)))
        .catch(() => {});
    }
  }, [grantOpen]);

  // ── Edit modal ───────────────────────────────────────────────
  const openEdit = () => {
    if (!user) return;
    editForm.setFieldsValue({
      email: user.email || '',
      name: user.name || '',
      avatar: user.avatar || '',
      role: user.role as 'USER' | 'MODERATOR' | 'ADMIN',
      coinBalance: user.coinBalance,
      streak: user.streak,
      isNewUser: user.isNewUser ?? false,
      lastActiveAt: user.lastActiveAt ? dayjs(user.lastActiveAt) : null,
      quizCount: (user as any)._count?.quizzes ?? 0,
      watchProgressCount: (user as any)._count?.watchProgress ?? 0,
      paymentCount: (user as any)._count?.payments ?? 0,
      totalPaymentAmount: (user as any).totalPaymentAmount ?? 0,
      flashcardCount: (user as any)._count?.flashcards ?? 0,
    });
    setAvatarPreview(user.avatar || '');
    setEditOpen(true);
  };

  const handleAvatarFileChange: UploadProps['onChange'] = ({ fileList }) => {
    if (fileList.length > 0 && fileList[0].originFileObj) {
      const file = fileList[0].originFileObj;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setAvatarPreview(dataUrl);
        editForm.setFieldValue('avatar', dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async (values: EditFormValues) => {
    setEditLoading(true);
    try {
      const statsPayload: Parameters<typeof adminService.overrideUserStats>[1] = {};

      if (values.quizCount !== (user as any)._count?.quizzes) {
        statsPayload.quizCount = values.quizCount;
      }
      if (values.watchProgressCount !== (user as any)._count?.watchProgress) {
        statsPayload.watchProgressCount = values.watchProgressCount;
      }
      if (values.paymentCount !== (user as any)._count?.payments) {
        statsPayload.paymentCount = values.paymentCount;
      }
      if (values.totalPaymentAmount !== (user as any).totalPaymentAmount) {
        statsPayload.totalPaymentAmount = values.totalPaymentAmount;
      }
      if (values.flashcardCount !== (user as any)._count?.flashcards) {
        statsPayload.flashcardCount = values.flashcardCount;
      }

      const [userRes, statsRes] = await Promise.all([
        adminService.updateUser(params.id as string, {
          email: values.email || undefined,
          name: values.name || undefined,
          avatar: values.avatar || undefined,
          role: values.role,
          coinBalance: values.coinBalance,
          streak: values.streak,
          isNewUser: values.isNewUser,
          lastActiveAt: values.lastActiveAt ? values.lastActiveAt.toISOString() : null,
        }),
        Object.keys(statsPayload).length > 0
          ? adminService.overrideUserStats(params.id as string, statsPayload)
          : Promise.resolve(null),
      ]);

      const merged = { ...userRes.data.data, ...(statsRes ? statsRes.data.data : {}) };
      setUser((u) => u ? { ...u, ...merged } as AdminUserDetail : u);
      setEditOpen(false);
      antdNotification.success({
        message: 'Cập nhật thành công',
        description: 'Thông tin người dùng đã được lưu.',
        icon: <CheckCircleFilled style={{ color: C.green }} />,
        placement: 'topRight',
        duration: 4,
        style: { background: '#1a2a3a', border: `1px solid ${C.green}`, borderRadius: 12 },
      });
      antdMessage.success('Cập nhật thông tin người dùng thành công!');
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      const resp = (e?.response as Record<string, unknown>) ?? {};
      const data = (resp?.data as Record<string, unknown>) ?? {};
      const error = (data?.error as Record<string, unknown>) ?? {};
      antdMessage.error((error?.message as string) || 'Lỗi khi cập nhật');
    } finally {
      setEditLoading(false);
    }
  };

  // ── Ban / Unban ──────────────────────────────────────────────
  const handleBan = async () => {
    setActionLoading(true);
    try {
      await adminService.banUser(params.id as string);
      setUser((u) => u ? { ...u, isBanned: true } : u);
      antdMessage.success('Đã cấm người dùng');
    } catch { antdMessage.error('Lỗi cấm người dùng'); }
    finally { setActionLoading(false); }
  };

  const handleUnban = async () => {
    setActionLoading(true);
    try {
      await adminService.unbanUser(params.id as string);
      setUser((u) => u ? { ...u, isBanned: false } : u);
      antdMessage.success('Đã mở cấm người dùng');
    } catch { antdMessage.error('Lỗi mở cấm người dùng'); }
    finally { setActionLoading(false); }
  };

  // ── Grant coins ──────────────────────────────────────────────
  const handleGrantCoins = async (values: { preset?: number; amount?: number; reason?: string }) => {
    const finalAmount = values.amount ?? values.preset;
    if (!finalAmount || finalAmount <= 0) { antdMessage.error('Vui lòng chọn hoặc nhập số xu'); return; }
    setGrantLoading(true);
    try {
      const result = await adminService.grantCoins(params.id as string, { amount: finalAmount, reason: values.reason });
      setUser((u) => u ? { ...u, coinBalance: result.data.data.balance } : u);
      setGrantOpen(false);
      form.resetFields();
      antdNotification.success({
        message: 'Cấp xu thành công',
        description: (
          <span>Đã cấp <strong>{finalAmount.toLocaleString()} xu</strong> cho <strong>{user?.name || user?.email}</strong>.</span>
        ),
        icon: <CheckCircleFilled style={{ color: C.green }} />,
        placement: 'topRight', duration: 5,
        style: { background: '#1a2a3a', border: `1px solid ${C.green}`, borderRadius: 12 },
      });
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      const resp = (e?.response as Record<string, unknown>) ?? {};
      const data = (resp?.data as Record<string, unknown>) ?? {};
      const error = (data?.error as Record<string, unknown>) ?? {};
      antdMessage.error((error?.message as string) || 'Lỗi khi cấp xu');
    } finally { setGrantLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen" style={{ background: '#0B0B0F' }}>
      <Spin size="large" />
    </div>
  );

  if (!user) return <div className="p-8 text-white">Không tìm thấy người dùng</div>;

  const roleColor: Record<string, string> = { ADMIN: 'red', MODERATOR: 'orange', USER: 'default' };
  const roleLabel: Record<string, string> = { ADMIN: 'Admin', MODERATOR: 'Moderator', USER: 'Người dùng' };

  return (
    <div className="min-h-screen p-6 space-y-5" style={{ background: '#0B0B0F' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.back()}
            className="!rounded-xl !bg-white/5 !border-white/10 !text-slate-300 hover:!bg-white/10 hover:!text-white"
          >
            <ArrowLeftOutlined /> Quay lại
          </Button>
          <div>
            <h1 className="text-xl font-black text-white">Chi tiết người dùng</h1>
            <p className="text-slate-500 text-xs mt-0.5">Quản lý thông tin tài khoản</p>
          </div>
        </div>
        <Button
          icon={<InfoCircleOutlined />}
          onClick={openEdit}
          className="!rounded-xl !font-semibold !bg-[rgba(124,77,255,0.15)] !border-[rgba(124,77,255,0.3)] !text-[#7C4DFF] hover:!bg-[rgba(124,77,255,0.25)]"
        >
          Chi tiết
        </Button>
      </div>

      {/* ── Top Row: Profile + Stats ───────────────────────── */}
      <div className="grid gap-5" style={{ gridTemplateColumns: '380px 1fr' }}>

        {/* Profile card */}
        <SectionCard>
          <div className="flex flex-col items-center gap-4">

            {/* Avatar */}
            <div className="relative">
              <Avatar
                size={96}
                src={user.avatar}
                icon={<UserOutlined />}
                className="!bg-[rgba(124,77,255,0.2)] !text-[#7C4DFF] !text-4xl"
              />
              <div
                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[#151c2a]"
                style={{ background: user.isBanned ? C.red : C.green }}
              />
            </div>

            <div className="text-center">
              <h2 className="text-lg font-black text-white">{user.name || '—'}</h2>
              <p className="text-slate-400 text-sm">{user.email}</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Tag color={roleColor[user.role] || 'default'} className="!rounded-full !font-semibold">
                  {roleLabel[user.role] || user.role}
                </Tag>
                {user.isBanned && (
                  <Tag color="red" className="!rounded-full">Bị cấm</Tag>
                )}
              </div>
            </div>

            <Divider className="!my-0" style={{ borderColor: C.border }} />

            <div className="w-full space-y-1">
              <FieldRow label="Provider" value={(user as any).provider || 'EMAIL'} />
              <FieldRow label="Tham gia" value={dayjs(user.createdAt).format('DD/MM/YYYY')} />
              <FieldRow
                label="Hoạt động cuối"
                value={user.lastActiveAt ? dayjs(user.lastActiveAt).format('DD/MM/YYYY HH:mm') : '—'}
              />
              {(user as any).banReason && (
                <FieldRow
                  label="Lý do cấm"
                  value={<span className="text-red-400">{(user as any).banReason}</span>}
                />
              )}
            </div>

            <Divider className="!my-0" style={{ borderColor: C.border }} />

            {/* Action buttons */}
            <div className="w-full space-y-2">
              {user.isBanned ? (
                <Button
                  type="primary"
                  block
                  loading={actionLoading}
                  onClick={handleUnban}
                  icon={<CheckCircleOutlined />}
                  className="!rounded-xl !font-semibold !bg-green-500 !border-green-500 hover:!bg-green-600"
                >
                  Mở cấm người dùng
                </Button>
              ) : (
                <Button
                  danger
                  block
                  loading={actionLoading}
                  onClick={handleBan}
                  icon={<StopOutlined />}
                  className="!rounded-xl !font-semibold"
                >
                  Cấm người dùng
                </Button>
              )}
              <Button
                block
                onClick={() => setGrantOpen(true)}
                icon={<DollarOutlined />}
                className="!rounded-xl !border-[rgba(245,158,11,0.3)] !text-[#f59e0b] hover:!bg-[rgba(245,158,11,0.1)]"
              >
                Cấp xu
              </Button>
            </div>
          </div>
        </SectionCard>

        {/* Stats */}
        <SectionCard>
          <p className="text-white font-bold text-sm mb-4">Thống kê</p>
          <div className="grid grid-cols-2 gap-3">
            <StatPill
              label="Số dư xu"
              value={user.coinBalance.toLocaleString('vi-VN')}
              icon={<DollarOutlined />}
              color={C.amber}
            />
            <StatPill
              label="Chuỗi học tập"
              value={`${user.streak} ngày`}
              icon={<UserOutlined />}
              color={C.green}
            />
            <StatPill
              label="Flashcards"
              value={user._count.flashcards}
              icon={<span className="text-sm">📇</span>}
              color={C.cyan}
            />
            <StatPill
              label="Quizzes"
              value={user._count.quizzes}
              icon={<span className="text-sm">📝</span>}
              color={C.purple}
            />
            <StatPill
              label="Videos đã xem"
              value={user._count.watchProgress}
              icon={<span className="text-sm">🎬</span>}
              color={C.purple}
            />
            <StatPill
              label="Thanh toán"
              value={`${user._count.payments} lần`}
              icon={<DollarOutlined />}
              color={C.green}
            />
            <StatPill
              label="Tổng thanh toán"
              value={`${((user as any).totalPaymentAmount ?? 0).toLocaleString('vi-VN')} đ`}
              icon={<DollarOutlined />}
              color={C.amber}
            />
          </div>

          <Divider className="!my-4" style={{ borderColor: C.border }} />

          <Descriptions
            column={2}
            size="small"
            className="[&_.ant-descriptions-item-label]:!text-slate-500 [&_.ant-descriptions-item-content]:!text-slate-200 [&_.ant-descriptions-item]:!py-1.5"
          >
            <Descriptions.Item label="ID"><span className="text-xs font-mono text-slate-400">{user.id.slice(0, 8)}…</span></Descriptions.Item>
            <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
            <Descriptions.Item label="Name">{user.name || '—'}</Descriptions.Item>
            <Descriptions.Item label="Role"><Tag color={roleColor[user.role]} className="!rounded-full">{user.role}</Tag></Descriptions.Item>
            <Descriptions.Item label="Created">{dayjs(user.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="Last Active">
              {user.lastActiveAt ? dayjs(user.lastActiveAt).format('DD/MM/YYYY HH:mm') : '—'}
            </Descriptions.Item>
          </Descriptions>
        </SectionCard>
      </div>

      {/* ── Grant Coins Modal ───────────────────────────────── */}
      <Modal
        title={
          <span className="flex items-center gap-2 text-white font-bold">
            <DollarOutlined style={{ color: C.amber }} />
            Cấp xu cho người dùng
          </span>
        }
        open={grantOpen}
        onCancel={() => { setGrantOpen(false); form.resetFields(); }}
        footer={null}
        className="[&_.ant-modal-content]:!bg-[#151c2a] [&_.ant-modal-header]:!bg-[#151c2a] [&_.ant-modal-title]:!text-white"
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleGrantCoins} className="mt-4">
          {packages.length > 0 ? (
            <>
              <Form.Item name="preset" label={<span className="text-slate-400 text-xs">Số xu</span>}>
                <Select
                  placeholder="-- Chọn gói xu --"
                  className="!w-full"
                  popupClassName="kmate-dark-select"
                  options={packages.map((pkg) => ({
                    label: (
                      <span className="flex justify-between w-full items-center">
                        <span className="text-white text-sm font-medium">{pkg.name}</span>
                        <span className="text-[#7C4DFF] font-bold">{pkg.coinAmount.toLocaleString()} xu</span>
                      </span>
                    ),
                    value: pkg.coinAmount,
                  }))}
                />
              </Form.Item>
              <div className="flex gap-3 mb-4">
                {(['preset', 'custom'] as const).map((m) => (
                  <Button
                    key={m}
                    type={selectedMode === m ? 'primary' : 'default'}
                    onClick={() => {
                      setSelectedMode(m);
                      form.setFieldsValue(m === 'preset' ? { amount: undefined } : { preset: undefined });
                    }}
                    className={selectedMode !== m ? '!border-[rgba(124,77,255,0.3)] !text-[#7C4DFF]' : '!bg-[#7C4DFF] !border-[#7C4DFF]'}
                  >
                    {m === 'preset' ? 'Chọn gói' : 'Nhập số khác'}
                  </Button>
                ))}
              </div>
              {selectedMode === 'custom' && (
                <Form.Item name="amount" label={<span className="text-slate-400 text-xs">Số xu tùy chỉnh</span>}>
                  <InputNumber
                    placeholder="Nhập số xu muốn cấp"
                    min={1}
                    className="!w-full !bg-white/5 !border-white/10 !text-white"
                    formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(v) => String(v).replace(/,/g, '') as unknown as 1}
                  />
                </Form.Item>
              )}
            </>
          ) : (
            <Form.Item name="amount" label={<span className="text-slate-400 text-xs">Số xu</span>} rules={[{ required: true, message: 'Nhập số xu cần cấp' }]}>
              <InputNumber
                placeholder="Nhập số xu muốn cấp"
                min={1}
                className="!w-full !bg-white/5 !border-white/10 !text-white"
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => String(v).replace(/,/g, '') as unknown as 1}
              />
            </Form.Item>
          )}

          <Form.Item name="reason" label={<span className="text-slate-400 text-xs">Lý do (tùy chọn)</span>}>
            <Select
              placeholder="Chọn lý do"
              allowClear
              className="!w-full"
              popupClassName="kmate-dark-select"
              options={[
                { label: 'Thưởng tháng', value: 'Thưởng tháng' },
                { label: 'Thưởng tuần', value: 'Thưởng tuần' },
                { label: 'Bồi thường', value: 'Bồi thường' },
                { label: 'Quà tặng', value: 'Quà tặng' },
                { label: 'Khác', value: 'Lý do khác' },
              ]}
            />
          </Form.Item>

          <div className="flex gap-3 justify-end mt-6">
            <Button onClick={() => { setGrantOpen(false); form.resetFields(); }} className="!rounded-xl">
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={grantLoading}
              icon={<DollarOutlined />}
              className="!rounded-xl !bg-[#7C4DFF] !border-[#7C4DFF] hover:!bg-[rgba(124,77,255,0.8)]"
            >
              Xác nhận cấp xu
            </Button>
          </div>
        </Form>
      </Modal>

      {/* ── Edit User Modal ─────────────────────────────────── */}
      <Modal
        title={
          <span className="flex items-center gap-2 text-white font-bold">
            <EditOutlined style={{ color: C.purple }} />
            Chỉnh sửa người dùng
          </span>
        }
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        footer={null}
        width={700}
        className="[&_.ant-modal-content]:!bg-[#151c2a] [&_.ant-modal-header]:!bg-[#151c2a] [&_.ant-modal-title]:!text-white"
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleSaveEdit}
          className="mt-4"
        >
          {/* Avatar upload */}
          <div className="flex gap-6 items-start mb-6 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.border}` }}>
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative group cursor-pointer" onClick={() => document.getElementById('avatar-file-input')?.click()}>
                <Avatar
                  size={80}
                  src={avatarPreview}
                  icon={<UserOutlined />}
                  className="!bg-[rgba(124,77,255,0.2)] !text-[#7C4DFF] !text-2xl border-2 border-[rgba(124,77,255,0.3)]"
                />
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <CameraOutlined className="text-white" />
                </div>
              </div>
              <p className="text-slate-500 text-xs text-center">Click để upload</p>
              <input
                id="avatar-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const dataUrl = ev.target?.result as string;
                    setAvatarPreview(dataUrl);
                    editForm.setFieldValue('avatar', dataUrl);
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold mb-1">Ảnh đại diện</p>
              <p className="text-slate-500 text-xs mb-3">Upload file ảnh hoặc dán URL bên dưới</p>
              <Form.Item name="avatar" noStyle>
                <Input
                  placeholder="Dán URL avatar (https://...)"
                  className="!rounded-lg !bg-white/5 !border-white/10 !text-sm !text-white placeholder:!text-slate-600"
                  prefix={<CameraOutlined className="text-slate-500" />}
                  allowClear
                  onChange={(e) => setAvatarPreview(e.target.value)}
                />
              </Form.Item>
            </div>
          </div>

          {/* Form fields — 2 columns */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">

            <Form.Item
              name="email"
              label={<span className="text-slate-400 text-xs">Email</span>}
              className="col-span-2"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
            >
              <Input
                placeholder="Nhập email người dùng"
                className="!rounded-lg !bg-white/5 !border-white/10 !text-sm !text-white placeholder:!text-slate-600"
                prefix={<MailOutlined className="text-slate-500" />}
              />
            </Form.Item>

            <Form.Item
              name="name"
              label={<span className="text-slate-400 text-xs">Tên hiển thị</span>}
            >
              <Input
                placeholder="Nhập tên người dùng"
                className="!rounded-lg !bg-white/5 !border-white/10 !text-sm !text-white placeholder:!text-slate-600"
                prefix={<UserOutlined className="text-slate-500" />}
              />
            </Form.Item>

            <Form.Item
              name="role"
              label={<span className="text-slate-400 text-xs">Vai trò</span>}
              rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
            >
              <Select
                placeholder="Chọn vai trò"
                className="!w-full"
                popupClassName="kmate-dark-select"
                options={[
                  { label: <span className="text-slate-300 text-sm">USER — Người dùng</span>, value: 'USER' },
                  { label: <span className="text-slate-300 text-sm">MODERATOR — Kiểm duyệt</span>, value: 'MODERATOR' },
                  { label: <span className="text-slate-300 text-sm">ADMIN — Quản trị</span>, value: 'ADMIN' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="coinBalance"
              label={<span className="text-slate-400 text-xs">Số dư xu</span>}
              rules={[{ required: true, message: 'Vui lòng nhập số dư xu' }]}
            >
              <InputNumber
                placeholder="0"
                min={0}
                className="!w-full !rounded-lg !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input-wrap]:!text-white"
                prefix={<span className="text-slate-500 text-sm">💰</span>}
              />
            </Form.Item>

            <Form.Item
              name="streak"
              label={<span className="text-slate-400 text-xs">Chuỗi học tập (ngày)</span>}
              rules={[{ required: true, message: 'Vui lòng nhập chuỗi học tập' }]}
            >
              <InputNumber
                placeholder="0"
                min={0}
                className="!w-full !rounded-lg !bg-white/5 !border-white/10 !text-sm !text-white"
                prefix={<span className="text-slate-500 text-sm">🔥</span>}
              />
            </Form.Item>

            <Form.Item
              name="lastActiveAt"
              label={<span className="text-slate-400 text-xs">Hoạt động cuối</span>}
            >
              <DatePicker
                showTime
                format="DD/MM/YYYY HH:mm"
                placeholder="Chọn ngày giờ"
                className="!w-full !rounded-lg [&_.ant-picker]:!bg-white/5 [&_.ant-picker]:!border-white/10 [&_.ant-picker-input>input]:!text-white [&_.ant-picker-suffix]:!text-slate-500"
                popupClassName="kmate-dark-select"
              />
            </Form.Item>

            <Form.Item
              name="isNewUser"
              label={<span className="text-slate-400 text-xs">Người dùng mới</span>}
            >
              <Select
                placeholder="Chọn"
                className="!w-full"
                popupClassName="kmate-dark-select"
                options={[
                  { label: <span className="text-slate-300 text-sm">Có — new user</span>, value: true },
                  { label: <span className="text-slate-300 text-sm">Không — đã quen</span>, value: false },
                ]}
              />
            </Form.Item>

            {/* Stats override section */}
            <Divider className="!mt-4 !mb-2" style={{ borderColor: C.border }} />
            <div className="col-span-2 mb-2">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide">Thống kê — Quản lý số liệu</p>
            </div>

            <Form.Item
              name="quizCount"
              label={<span className="text-slate-400 text-xs">Số Quiz</span>}
              rules={[{ required: true, message: 'Vui lòng nhập số quiz' }]}
            >
              <InputNumber
                placeholder="0"
                min={0}
                className="!w-full !rounded-lg !bg-white/5 !border-white/10 !text-sm !text-white"
                prefix={<span className="text-slate-500 text-sm">📝</span>}
              />
            </Form.Item>

            <Form.Item
              name="watchProgressCount"
              label={<span className="text-slate-400 text-xs">Số video đã xem</span>}
              rules={[{ required: true, message: 'Vui lòng nhập số video đã xem' }]}
            >
              <InputNumber
                placeholder="0"
                min={0}
                className="!w-full !rounded-lg !bg-white/5 !border-white/10 !text-sm !text-white"
                prefix={<span className="text-slate-500 text-sm">🎬</span>}
              />
            </Form.Item>

            <Form.Item
              name="paymentCount"
              label={<span className="text-slate-400 text-xs">Số thanh toán</span>}
              rules={[{ required: true, message: 'Vui lòng nhập số thanh toán' }]}
            >
              <InputNumber
                placeholder="0"
                min={0}
                className="!w-full !rounded-lg !bg-white/5 !border-white/10 !text-sm !text-white"
                prefix={<DollarOutlined className="text-slate-500" />}
              />
            </Form.Item>

            <Form.Item
              name="totalPaymentAmount"
              label={<span className="text-slate-400 text-xs">Tổng tiền thanh toán (VNĐ)</span>}
              rules={[{ required: true, message: 'Vui lòng nhập tổng tiền' }]}
            >
              <InputNumber
                placeholder="0"
                min={0}
                className="!w-full !rounded-lg !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input-wrap]:!text-white"
                prefix={<DollarOutlined className="text-slate-500" />}
                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(v) => String(v).replace(/,/g, '') as unknown as 0}
              />
            </Form.Item>

            <Form.Item
              name="flashcardCount"
              label={<span className="text-slate-400 text-xs">Số Flashcards</span>}
              rules={[{ required: true, message: 'Vui lòng nhập số flashcards' }]}
            >
              <InputNumber
                placeholder="0"
                min={0}
                className="!w-full !rounded-lg !bg-white/5 !border-white/10 !text-sm !text-white"
                prefix={<span className="text-slate-500 text-sm">📇</span>}
              />
            </Form.Item>

          </div>

          <div className="flex gap-3 justify-end mt-6 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
            <Button
              onClick={() => setEditOpen(false)}
              className="!rounded-lg !bg-white/5 !border-white/10 !text-slate-300 hover:!bg-white/10"
            >
              Hủy bỏ
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={editLoading}
              icon={<SaveOutlined />}
              className="!rounded-lg !bg-[#7C4DFF] !border-[#7C4DFF] hover:!bg-[rgba(124,77,255,0.8)] !font-semibold"
            >
              Lưu thay đổi
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
