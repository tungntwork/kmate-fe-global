'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Avatar, Tag, Button, Spin, Descriptions, Tabs,
  Modal, InputNumber, Form, Select, notification,
  Upload, Input, App,
} from 'antd';
import {
  ArrowLeftOutlined, StopOutlined, CheckCircleOutlined,
  UserOutlined, DollarOutlined, CheckCircleFilled,
  EditOutlined, SaveOutlined, CameraOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import dayjs from 'dayjs';
import { adminService, coinService, type AdminUserDetail, type CoinPackage } from '@/lib/api-services';

const C = {
  purple: '#7C4DFF',
  cyan: '#00e5ff',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
};

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#151c2a] rounded-2xl border border-white/10 ${className}`}>
      {children}
    </div>
  );
}

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

interface EditFormValues {
  name: string;
  avatar: string;
  role: 'USER' | 'MODERATOR' | 'ADMIN';
  coinBalance: number;
  streak: number;
  isNewUser: boolean;
  lastActiveAt: string;
}

export default function AdminUserDetailPage() {
  const { message: antdMessage } = App.useApp();
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
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const fetchUser = () => {
    const id = params.id as string;
    adminService.getUser(id)
      .then((r) => {
        const u = r.data.data;
        setUser(u);
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
      name: user.name || '',
      avatar: user.avatar || '',
      role: user.role,
      coinBalance: user.coinBalance,
      streak: user.streak,
      isNewUser: user.isNewUser,
      lastActiveAt: user.lastActiveAt ? dayjs(user.lastActiveAt).format('YYYY-MM-DDTHH:mm') : '',
    });
    setAvatarPreview(user.avatar || '');
    setEditOpen(true);
  };

  const handleAvatarUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setAvatarPreview(url);
    editForm.setFieldValue('avatar', url);
  };

  const handleAvatarFileChange: UploadProps['onChange'] = ({ fileList: fl }) => {
    if (fl.length > 0 && fl[0].originFileObj) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setAvatarPreview(dataUrl);
        editForm.setFieldValue('avatar', dataUrl);
      };
      reader.readAsDataURL(fl[0].originFileObj as Blob);
    }
  };

  const handleSaveEdit = async (values: EditFormValues) => {
    setEditLoading(true);
    try {
      const res = await adminService.updateUser(params.id as string, {
        name: values.name || undefined,
        avatar: values.avatar || undefined,
        role: values.role,
        coinBalance: values.coinBalance,
        streak: values.streak,
        isNewUser: values.isNewUser,
        lastActiveAt: values.lastActiveAt ? new Date(values.lastActiveAt).toISOString() : null,
      });
      const updated = res.data.data;
      setUser((u) => u ? { ...u, ...updated } : u);
      setEditOpen(false);
      notification.success({
        message: 'Cập nhật thành công',
        description: <span>Thông tin người dùng đã được lưu.</span>,
        icon: <CheckCircleFilled style={{ color: C.green }} />,
        placement: 'topRight',
        duration: 4,
        style: { backgroundColor: '#1a2a3a', border: `1px solid ${C.green}`, borderRadius: 12 },
      });
      antdMessage.success('Cập nhật thông tin người dùng thành công!');
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      const resp = e?.response as Record<string, unknown> | undefined;
      const data = resp?.data as Record<string, unknown> | undefined;
      const error = data?.error as Record<string, unknown> | undefined;
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
    if (!finalAmount || finalAmount <= 0) {
      antdMessage.error('Vui lòng chọn hoặc nhập số xu');
      return;
    }
    setGrantLoading(true);
    try {
      const result = await adminService.grantCoins(params.id as string, {
        amount: finalAmount,
        reason: values.reason,
      });
      setUser((u) => u ? { ...u, coinBalance: result.data.data.balance } : u);
      setGrantOpen(false);
      form.resetFields();
      notification.success({
        message: 'Cấp xu thành công',
        description: (
          <span>
            Đã cấp <strong>{finalAmount.toLocaleString()} xu</strong> cho{' '}
            <strong>{user?.name || user?.email}</strong>.
            {values.reason && <> Lý do: <em>{values.reason}</em>.</>}
          </span>
        ),
        icon: <CheckCircleFilled style={{ color: C.green }} />,
        placement: 'topRight',
        duration: 5,
        style: { backgroundColor: '#1a2a3a', border: `1px solid ${C.green}`, borderRadius: 12 },
      });
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      const resp = e?.response as Record<string, unknown> | undefined;
      const data = resp?.data as Record<string, unknown> | undefined;
      const error = data?.error as Record<string, unknown> | undefined;
      antdMessage.error((error?.message as string) || 'Lỗi khi cấp xu');
    } finally {
      setGrantLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0B0B0F]">
      <Spin size="large" />
    </div>
  );
  if (!user) return <div className="p-8 text-white">Không tìm thấy người dùng</div>;

  return (
    <div className="min-h-screen bg-[#0B0B0F] p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.back()}
            className="!rounded-xl !bg-white/5 !border-white/10 !text-slate-300 hover:!bg-white/10 hover:!text-white"
          >
            <ArrowLeftOutlined /> Quay lại
          </Button>
          <div>
            <h1 className="text-2xl font-black text-white">Chi tiết người dùng</h1>
            <p className="text-slate-500 text-xs mt-0.5">Xem và quản lý thông tin tài khoản</p>
          </div>
        </div>
        <Button
          icon={<EditOutlined />}
          onClick={openEdit}
          className="!rounded-xl !bg-primary/10 !border-primary/20 !text-primary hover:!bg-primary/20"
        >
          Chỉnh sửa
        </Button>
      </div>

      {/* Profile + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Profile card */}
        <GlassCard className="lg:col-span-2 p-6 flex flex-col items-center gap-4">
          {/* Avatar */}
          <div className="relative">
            <Avatar
              size={96}
              src={user.avatar}
              icon={<UserOutlined />}
              className="!bg-primary/20 !text-primary !text-4xl"
            />
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-[#151c2a]"
              style={{
                backgroundColor: user.isBanned ? C.red : C.green,
              }}
            />
          </div>

          <div className="text-center">
            <h2 className="text-xl font-black text-white">{user.name || '—'}</h2>
            <p className="text-slate-400 text-sm mt-0.5">{user.email}</p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Tag color={user.role === 'ADMIN' ? 'red' : user.role === 'MODERATOR' ? 'orange' : 'default'} className="!rounded-full !font-semibold">
                {user.role === 'ADMIN' ? 'Admin' : user.role === 'MODERATOR' ? 'Moderator' : 'Người dùng'}
              </Tag>
              {user.isBanned && <Tag color="red" className="!rounded-full">Bị cấm</Tag>}
            </div>
          </div>

          {/* Meta */}
          <div className="w-full space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Provider</span>
              <span className="text-slate-300 font-medium">{user.provider}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Tham gia</span>
              <span className="text-slate-300">{dayjs(user.createdAt).format('DD/MM/YYYY')}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Hoạt động cuối</span>
              <span className="text-slate-300">{user.lastActiveAt ? dayjs(user.lastActiveAt).format('DD/MM/YYYY HH:mm') : '—'}</span>
            </div>
            {user.banReason && (
              <div className="flex items-start justify-between gap-2">
                <span className="text-slate-500">Lý do cấm</span>
                <span className="text-red-400 text-right text-xs">{user.banReason}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="w-full flex flex-col gap-2 mt-2">
            {user.isBanned ? (
              <Button
                type="primary"
                onClick={handleUnban}
                loading={actionLoading}
                icon={<CheckCircleOutlined />}
                className="!rounded-xl !font-semibold !bg-green-500 !border-green-500 hover:!bg-green-600"
                block
              >
                Mở cấm người dùng
              </Button>
            ) : (
              <Button
                danger
                onClick={handleBan}
                loading={actionLoading}
                icon={<StopOutlined />}
                className="!rounded-xl !font-semibold"
                block
              >
                Cấm người dùng
              </Button>
            )}
            <Button
              type="default"
              onClick={() => setGrantOpen(true)}
              icon={<DollarOutlined />}
              className="!rounded-xl !border-primary/20 !text-primary hover:!bg-primary/10"
              block
            >
              Cấp xu
            </Button>
          </div>
        </GlassCard>

        {/* Stats */}
        <div className="lg:col-span-3 grid grid-cols-2 gap-4">
          <StatCard
            label="Số dư xu"
            value={user.coinBalance.toLocaleString('vi-VN')}
            icon={<DollarOutlined />}
            color={C.amber}
            bg="rgba(245,158,11,0.08)"
          />
          <StatCard
            label="Chuỗi học tập"
            value={`${user.streak} ngày`}
            icon={<UserOutlined />}
            color={C.green}
            bg="rgba(34,197,94,0.08)"
          />
          <StatCard
            label="Flashcards"
            value={user._count.flashcards}
            icon={<span className="text-base">📇</span>}
            color={C.cyan}
            bg="rgba(0,229,255,0.08)"
          />
          <StatCard
            label="Quizzes"
            value={user._count.quizzes}
            icon={<span className="text-base">📝</span>}
            color={C.purple}
            bg="rgba(124,77,255,0.08)"
          />
          <StatCard
            label="Videos đã xem"
            value={user._count.watchProgress}
            icon={<span className="text-base">🎬</span>}
            color={C.purple}
            bg="rgba(124,77,255,0.08)"
          />
          <StatCard
            label="Thanh toán"
            value={user._count.payments}
            icon={<DollarOutlined />}
            color={C.green}
            bg="rgba(34,197,94,0.08)"
          />
        </div>
      </div>

      {/* Info Tab */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-bold text-sm">Thông tin chi tiết</h3>
        </div>
        <Descriptions
          column={{ xs: 1, sm: 2, md: 3 }}
          className="[&_.ant-descriptions-item-label]:!text-slate-500 [&_.ant-descriptions-item-content]:!text-white [&_.ant-descriptions-item]:!pb-3"
        >
          <Descriptions.Item label="ID">
            <span className="text-slate-400 text-xs font-mono">{user.id}</span>
          </Descriptions.Item>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
          <Descriptions.Item label="Name">{user.name || '—'}</Descriptions.Item>
          <Descriptions.Item label="Role">
            <Tag color={user.role === 'ADMIN' ? 'red' : user.role === 'MODERATOR' ? 'orange' : 'default'} className="!rounded-full">
              {user.role}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Provider">{user.provider}</Descriptions.Item>
          <Descriptions.Item label="New User">
            {user.isNewUser ? 'Có' : 'Không'}
          </Descriptions.Item>
          <Descriptions.Item label="Created">{dayjs(user.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="Last Active">
            {user.lastActiveAt ? dayjs(user.lastActiveAt).format('DD/MM/YYYY HH:mm') : '—'}
          </Descriptions.Item>
          <Descriptions.Item label="Banned">
            {user.isBanned ? (
              <Tag color="red" className="!rounded-full">Có</Tag>
            ) : (
              <Tag color="green" className="!rounded-full">Không</Tag>
            )}
          </Descriptions.Item>
        </Descriptions>
      </GlassCard>

      {/* Grant Coins Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <DollarOutlined style={{ color: C.amber }} />
            <span className="text-white font-bold">Cấp xu cho người dùng</span>
          </div>
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
                      <span className="flex justify-between w-full">
                        <span className="text-white font-medium text-sm">{pkg.name}</span>
                        <span className="text-primary font-bold">{pkg.coinAmount.toLocaleString()} xu</span>
                      </span>
                    ),
                    value: pkg.coinAmount,
                  }))}
                />
              </Form.Item>
              <div className="flex gap-3 mb-4">
                <Button
                  type={selectedMode === 'preset' ? 'primary' : 'default'}
                  onClick={() => { setSelectedMode('preset'); form.setFieldsValue({ amount: undefined }); }}
                  className={selectedMode !== 'preset' ? '!border-primary !text-primary' : '!bg-primary !border-primary'}
                >
                  Chọn gói
                </Button>
                <Button
                  type={selectedMode === 'custom' ? 'primary' : 'default'}
                  onClick={() => { setSelectedMode('custom'); form.setFieldsValue({ preset: undefined }); }}
                  className={selectedMode !== 'custom' ? '!border-primary !text-primary' : '!bg-primary !border-primary'}
                >
                  Nhập số khác
                </Button>
              </div>
              {selectedMode === 'custom' && (
                <Form.Item name="amount" label={<span className="text-slate-400 text-xs">Số xu tùy chỉnh</span>}>
                  <InputNumber
                    placeholder="Nhập số xu muốn cấp"
                    min={1}
                    className="!w-full !bg-white/5 !border-white/10 !text-white"
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => Number(String(value).replace(/,/g, '')) as any}
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
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => Number(String(value).replace(/,/g, '')) as any}
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
              className="!rounded-xl !bg-primary !border-primary hover:!bg-primary/90"
            >
              Xác nhận cấp xu
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <EditOutlined style={{ color: C.purple }} />
            <span className="text-white font-bold">Chỉnh sửa người dùng</span>
          </div>
        }
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        footer={null}
        width={680}
        className="[&_.ant-modal-content]:!bg-[#151c2a] [&_.ant-modal-header]:!bg-[#151c2a] [&_.ant-modal-title]:!text-white [&_.ant-modal-body]:!p-6"
        destroyOnClose
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleSaveEdit}
          className="mt-2"
          initialValues={{
            name: user.name || '',
            avatar: user.avatar || '',
            role: user.role,
            coinBalance: user.coinBalance,
            streak: user.streak,
            isNewUser: user.isNewUser,
            lastActiveAt: user.lastActiveAt ? dayjs(user.lastActiveAt).format('YYYY-MM-DDTHH:mm') : '',
          }}
        >
          {/* Avatar */}
          <div className="mb-6 flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
              <Avatar
                size={80}
                src={avatarPreview}
                icon={<UserOutlined />}
                className="!bg-primary/20 !text-primary !text-2xl border-2 border-primary/20"
              />
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <CameraOutlined className="text-white text-xl" />
              </div>
            </div>
            <p className="text-slate-500 text-xs">Click avatar để chọn ảnh mới</p>

            <input
              ref={avatarInputRef}
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

            <Form.Item name="avatar" noStyle>
              <Input
                placeholder="Hoặc dán URL avatar..."
                className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white placeholder:!text-slate-500"
                onChange={handleAvatarUrlChange}
              />
            </Form.Item>
          </div>

          {/* Fields grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item
              name="name"
              label={<span className="text-slate-400 text-xs">Tên hiển thị</span>}
            >
              <Input
                placeholder="Tên người dùng"
                className="!rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white placeholder:!text-slate-500"
              />
            </Form.Item>

            <Form.Item
              name="role"
              label={<span className="text-slate-400 text-xs">Vai trò</span>}
              rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
            >
              <Select
                className="!w-full"
                popupClassName="kmate-dark-select"
                options={[
                  { label: <span className="text-slate-300 text-sm">USER</span>, value: 'USER' },
                  { label: <span className="text-slate-300 text-sm">MODERATOR</span>, value: 'MODERATOR' },
                  { label: <span className="text-slate-300 text-sm">ADMIN</span>, value: 'ADMIN' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="coinBalance"
              label={<span className="text-slate-400 text-xs">Số dư xu</span>}
              rules={[{ required: true, message: 'Vui lòng nhập số dư xu' }]}
            >
              <InputNumber
                min={0}
                className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => Number(String(value).replace(/,/g, '')) as any}
              />
            </Form.Item>

            <Form.Item
              name="streak"
              label={<span className="text-slate-400 text-xs">Chuỗi học tập (ngày)</span>}
              rules={[{ required: true, message: 'Vui lòng nhập chuỗi học tập' }]}
            >
              <InputNumber
                min={0}
                className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white"
              />
            </Form.Item>

            <Form.Item
              name="lastActiveAt"
              label={<span className="text-slate-400 text-xs">Hoạt động cuối</span>}
            >
              <Input
                type="datetime-local"
                className="!rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white"
              />
            </Form.Item>

            <Form.Item
              name="isNewUser"
              label={<span className="text-slate-400 text-xs">Người dùng mới</span>}
              valuePropName="checked"
            >
              <Select
                className="!w-full"
                popupClassName="kmate-dark-select"
                options={[
                  { label: <span className="text-slate-300 text-sm">Có</span>, value: true },
                  { label: <span className="text-slate-300 text-sm">Không</span>, value: false },
                ]}
              />
            </Form.Item>
          </div>

          <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-white/5">
            <Button onClick={() => setEditOpen(false)} className="!rounded-xl !bg-white/5 !border-white/10 !text-slate-300 hover:!bg-white/10">
              Hủy bỏ
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={editLoading}
              icon={<SaveOutlined />}
              className="!rounded-xl !bg-primary !border-primary hover:!bg-primary/90"
            >
              Lưu thay đổi
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
