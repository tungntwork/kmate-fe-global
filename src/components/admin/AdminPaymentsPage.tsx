'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CheckOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Table, Button, Tag, Spin, Select, Popconfirm, message } from 'antd';
import { App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { adminService, type AdminPayment } from '@/lib/api-services';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Đang chờ',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
  PROCESSING: 'Đang xử lý',
  EXPIRED: 'Hết hạn',
  REFUNDED: 'Đã hoàn tiền',
  CANCELLED: 'Đã huỷ',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'orange',
  SUCCESS: 'green',
  FAILED: 'red',
  PROCESSING: 'blue',
  EXPIRED: 'default',
  REFUNDED: 'purple',
  CANCELLED: 'default',
};

export default function AdminPaymentsPage() {
  const { message: messageApi } = App.useApp();
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = async (pg = 1, s = status) => {
    setLoading(true);
    try {
      const res = await adminService.getPayments({ page: pg, limit: 20, status: s || undefined });
      setPayments(res.data.data);
      setTotal(res.data.pagination.total);
      setPage(pg);
    } catch { messageApi.error('Lỗi tải danh sách thanh toán'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1, ''); }, []);

  const handleApprove = async (paymentId: string) => {
    setActionLoading(paymentId);
    try {
      const res = await adminService.approvePayment(paymentId);
      messageApi.success(res.data.message);
      load(page, status);
    } catch {
      messageApi.error('Lỗi xác nhận thanh toán');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (paymentId: string) => {
    setActionLoading(paymentId);
    try {
      const res = await adminService.rejectPayment(paymentId);
      messageApi.success(res.data.message);
      load(page, status);
    } catch {
      messageApi.error('Lỗi từ chối thanh toán');
    } finally {
      setActionLoading(null);
    }
  };

  const columns: ColumnsType<AdminPayment> = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_, record) => (
        <div>
          <p className="text-white text-sm font-medium">{record.user.name || '—'}</p>
          <p className="text-slate-400 text-xs">{record.user.email}</p>
        </div>
      ),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      render: (v: number) => (
        <span className="text-green-400 font-bold">{v.toLocaleString('vi-VN')} đ</span>
      ),
    },
    {
      title: 'Xu',
      dataIndex: 'coinAmount',
      key: 'coinAmount',
      render: (c: number) => <span className="text-secondary font-bold">{c} Xu</span>,
    },
    {
      title: 'Mã đơn hàng',
      dataIndex: 'payosOrderCode',
      key: 'payosOrderCode',
      render: (c: string | null) => (
        <span className="text-slate-400 text-xs font-mono">{c || '—'}</span>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => {
        const icon = record.status === 'SUCCESS' ? <CheckCircleOutlined /> :
          record.status === 'PENDING' ? <ClockCircleOutlined /> :
          record.status === 'FAILED' || record.status === 'EXPIRED' ? <CloseCircleOutlined /> : null;
        return (
          <Tag color={STATUS_COLORS[record.status] || 'default'} icon={icon} className="!rounded-full">
            {STATUS_LABELS[record.status] || record.status}
          </Tag>
        );
      },
    },
    {
      title: 'Thời gian',
      key: 'time',
      render: (_, record) => (
        <div>
          <p className="text-slate-400 text-xs">Tạo: {dayjs(record.createdAt).format('DD/MM/YY HH:mm')}</p>
          {record.paidAt && <p className="text-slate-500 text-xs">Thanh toán: {dayjs(record.paidAt).format('DD/MM/YY HH:mm')}</p>}
        </div>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 180,
      render: (_, record) => {
        if (record.status !== 'PENDING') {
          return <span className="text-slate-600 text-xs">—</span>;
        }
        const isLoading = actionLoading === record.id || actionLoading === `reject-${record.id}`;
        return (
          <div style={{ display: 'flex', gap: 8 }}>
            <Popconfirm
              title="Xác nhận thanh toán?"
              description={`Cộng ${record.coinAmount} coins cho ${record.user.name || record.user.email}`}
              okText="Xác nhận"
              cancelText="Huỷ"
              okButtonProps={{ danger: false, loading: actionLoading === record.id }}
              onConfirm={() => handleApprove(record.id)}
              disabled={isLoading}
            >
              <Button
                size="small"
                type="primary"
                icon={<CheckCircleOutlined />}
                loading={actionLoading === record.id}
                style={{ borderRadius: 8, background: 'linear-gradient(135deg, #22c55e, #16a34a)', border: 'none', color: '#fff', fontWeight: 600 }}
              >
                Xác nhận
              </Button>
            </Popconfirm>
            <Popconfirm
              title="Từ chối thanh toán?"
              description="Đánh dấu thanh toán này là thất bại."
              okText="Từ chối"
              cancelText="Huỷ"
              okButtonProps={{ danger: true, loading: actionLoading === `reject-${record.id}` }}
              onConfirm={() => handleReject(record.id)}
              disabled={isLoading}
            >
              <Button
                size="small"
                danger
                icon={<CloseCircleOutlined />}
                loading={actionLoading === `reject-${record.id}`}
                style={{ borderRadius: 8 }}
              >
                Từ chối
              </Button>
            </Popconfirm>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-white">Quản lý Thanh toán</h2>
        <div className="flex items-center gap-3">
          <Select
            placeholder="Tất cả trạng thái"
            allowClear
            className="!w-44"
            value={status || undefined}
            onChange={(v) => { setStatus(v || ''); load(1, v || ''); }}
            options={[
              { value: 'PENDING', label: 'Đang chờ' },
              { value: 'SUCCESS', label: 'Thành công' },
              { value: 'FAILED', label: 'Thất bại' },
              { value: 'EXPIRED', label: 'Hết hạn' },
            ]}
          />
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={payments}
        rowKey="id"
        loading={loading}
        pagination={{ current: page, pageSize: 20, total, onChange: (p) => load(p, status), showSizeChanger: false }}
        className="kmate-table"
      />
    </div>
  );
}
