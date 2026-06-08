'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Avatar, Tag, Button, Spin, message, Descriptions, Tabs, Card,
  Modal, InputNumber, Form, Select, notification,
} from 'antd';
import {
  ArrowLeftOutlined, StopOutlined, CheckCircleOutlined,
  UserOutlined, DollarOutlined, CheckCircleFilled,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminService, coinService, type AdminUserDetail, type CoinPackage } from '@/lib/api-services';

export default function AdminUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [grantOpen, setGrantOpen] = useState(false);
  const [grantLoading, setGrantLoading] = useState(false);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [form] = Form.useForm();
  const [selectedMode, setSelectedMode] = useState<'preset' | 'custom'>('preset');
  const notificationRef = useRef<ReturnType<typeof notification.open> | null>(null);

  const fetchUser = () => {
    const id = params.id as string;
    adminService.getUser(id)
      .then((r) => setUser(r.data.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUser();
  }, [params.id]);

  useEffect(() => {
    if (grantOpen) {
      coinService.getPackages()
        .then((r) => setPackages(r.data.data.filter((p: CoinPackage) => p.isActive)))
        .catch(() => {});
    }
  }, [grantOpen]);

  const handleBan = async () => {
    setActionLoading(true);
    try {
      await adminService.banUser(params.id as string);
      setUser((u) => u ? { ...u, isBanned: true } : u);
      message.success('Đã ban user');
    } catch { message.error('Lỗi'); }
    finally { setActionLoading(false); }
  };

  const handleUnban = async () => {
    setActionLoading(true);
    try {
      await adminService.unbanUser(params.id as string);
      setUser((u) => u ? { ...u, isBanned: false } : u);
      message.success('Đã unban user');
    } catch { message.error('Lỗi'); }
    finally { setActionLoading(false); }
  };

  const handleGrantCoins = async (values: { preset?: number; amount?: number; reason?: string }) => {
    const finalAmount = values.amount ?? values.preset;
    if (!finalAmount || finalAmount <= 0) {
      message.error('Vui lòng chọn hoặc nhập số xu');
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

      // Antd notification toast ben phai man hinh
      notification.success({
        message: 'Cấp xu thành công',
        description: (
          <span>
            Đã cấp <strong>{finalAmount.toLocaleString()} xu</strong> cho{' '}
            <strong>{user?.name || user?.email}</strong>.
            {values.reason && <> Lý do: <em>{values.reason}</em>.</>}
          </span>
        ),
        icon: <CheckCircleFilled className="text-green-400" />,
        placement: 'topRight',
        duration: 5,
        style: {
          backgroundColor: '#1a2a3a',
          border: '1px solid #22c55e',
          borderRadius: 12,
        },
        className: '!text-white',
      });

      message.success(`Đã cấp ${finalAmount.toLocaleString()} xu cho người dùng`);
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      const resp = e?.response as Record<string, unknown> | undefined;
      const data = resp?.data as Record<string, unknown> | undefined;
      const error = data?.error as Record<string, unknown> | undefined;
      message.error((error?.message as string) || 'Lỗi khi cấp xu');
    } finally {
      setGrantLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#0B0B0F]">
      <Spin size="large" />
    </div>
  );
  if (!user) return <div className="p-8 text-white">Không tìm thấy user</div>;

  return (
    <div className="min-h-screen bg-[#0B0B0F] p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button onClick={() => router.back()} className="!rounded-xl">
          <ArrowLeftOutlined /> Quay lại
        </Button>
        <h1 className="text-2xl font-bold text-white">Chi tiết User</h1>
        <Tag color={user.isBanned ? 'red' : 'green'}>
          {user.isBanned ? 'Banned' : 'Active'}
        </Tag>
      </div>

      {/* Profile Card */}
      <Card className="!bg-[#151c2a] !border-white/10 mb-6">
        <div className="flex items-center gap-6">
          <Avatar size={80} src={user.avatar} icon={<UserOutlined />} className="!bg-primary/20 !text-primary !text-2xl" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white">{user.name || '—'}</h2>
            <p className="text-slate-400">{user.role}</p>
            <p className="text-slate-500 text-sm">{user.email}</p>
            <div className="flex gap-6 mt-3">
              <span className="text-sm text-slate-400">
                Coins: <span className="text-primary font-bold">{user.coinBalance.toLocaleString()}</span>
              </span>
              <span className="text-sm text-slate-400">
                Streak: <span className="text-primary font-bold">{user.streak} ngày</span>
              </span>
              <span className="text-sm text-slate-400">
                Flashcards: <span className="text-primary font-bold">{user._count.flashcards}</span>
              </span>
              <span className="text-sm text-slate-400">
                Quizzes: <span className="text-primary font-bold">{user._count.quizzes}</span>
              </span>
            </div>
            <p className="text-slate-500 text-sm mt-2">
              Tham gia {dayjs(user.createdAt).format('DD/MM/YYYY')}
            </p>
          </div>
        </div>

        <div className="mt-6 flex gap-3 flex-wrap">
          {user.isBanned ? (
            <Button
              type="primary"
              onClick={handleUnban}
              loading={actionLoading}
              className="!rounded-xl !font-bold !bg-green-500 !border-green-500"
            >
              <CheckCircleOutlined /> Unban
            </Button>
          ) : (
            <Button danger onClick={handleBan} loading={actionLoading} className="!rounded-xl">
              <StopOutlined /> Ban User
            </Button>
          )}
          <Button
            type="default"
            onClick={() => setGrantOpen(true)}
            className="!rounded-xl !border-primary !text-primary hover:!bg-primary/10"
          >
            <DollarOutlined /> Cấp xu
          </Button>
        </div>
      </Card>

      {/* Tabs */}
      <Card className="!bg-[#151c2a] !border-white/10">
        <Tabs
          defaultActiveKey="info"
          items={[
            {
              key: 'info',
              label: 'Thông tin',
              children: (
                <Descriptions column={2} className="[&_.ant-descriptions-item-label]:!text-slate-400 [&_.ant-descriptions-item-content]:!text-white">
                  <Descriptions.Item label="ID">{user.id}</Descriptions.Item>
                  <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
                  <Descriptions.Item label="Name">{user.name || '—'}</Descriptions.Item>
                  <Descriptions.Item label="Role">{user.role}</Descriptions.Item>
                  <Descriptions.Item label="Created">{dayjs(user.createdAt).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
                  <Descriptions.Item label="Last Active">
                    {user.lastActiveAt ? dayjs(user.lastActiveAt).format('DD/MM/YYYY HH:mm') : '—'}
                  </Descriptions.Item>
                </Descriptions>
              ),
            },
            {
              key: 'stats',
              label: 'Thống kê',
              children: (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Flashcards', value: user._count.flashcards },
                    { label: 'Quizzes', value: user._count.quizzes },
                    { label: 'Videos Watched', value: user._count.watchProgress },
                    { label: 'Payments', value: user._count.payments },
                  ].map((item) => (
                    <Card key={item.label} className="!bg-white/5 !border-white/10">
                      <div className="text-2xl font-black text-primary">{item.value}</div>
                      <div className="text-xs text-slate-400 mt-1">{item.label}</div>
                    </Card>
                  ))}
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Grant Coins Modal */}
      <Modal
        title={
          <span className="text-white">
            <DollarOutlined className="mr-2 text-primary" />
            Cấp xu cho người dùng
          </span>
        }
        open={grantOpen}
        onCancel={() => { setGrantOpen(false); form.resetFields(); }}
        footer={null}
        className="[&_.ant-modal-content]:!bg-[#151c2a] [&_.ant-modal-header]:!bg-[#151c2a]"
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleGrantCoins}
          className="mt-4"
        >
          {/* Preset package options */}
          {packages.length > 0 ? (
            <>
              <Form.Item name="preset" label={<span className="text-slate-400">Số xu</span>}>
                <Select
                  placeholder="-- Chọn gói xu --"
                  className="!w-full"
                  options={packages.map((pkg) => ({
                    label: (
                      <span className="flex justify-between w-full">
                        <span className="text-white font-medium">{pkg.name}</span>
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
                <Form.Item
                  name="amount"
                  label={<span className="text-slate-400">Số xu tùy chỉnh</span>}
                >
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
            <Form.Item
              name="amount"
              label={<span className="text-slate-400">Số xu</span>}
              rules={[{ required: true, message: 'Nhập số xu cần cấp' }]}
            >
              <InputNumber
                placeholder="Nhập số xu muốn cấp"
                min={1}
                className="!w-full !bg-white/5 !border-white/10 !text-white"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => Number(String(value).replace(/,/g, '')) as any}
              />
            </Form.Item>
          )}

          {/* Reason */}
          <Form.Item name="reason" label={<span className="text-slate-400">Lý do (tùy chọn)</span>}>
            <Select
              placeholder="Chọn lý do"
              allowClear
              className="!w-full"
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
            <Button onClick={() => { setGrantOpen(false); form.resetFields(); }}>
              Hủy
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={grantLoading}
              className="!rounded-xl !bg-primary !border-primary"
            >
              <DollarOutlined /> Xác nhận cấp xu
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
