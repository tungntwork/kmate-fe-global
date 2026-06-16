'use client';

import { useState, useEffect } from 'react';
import { Table, Tag, Spin, Select,  } from "antd";
import { App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { adminService, type AdminLog } from '@/lib/api-services';

const ACTION_LABELS: Record<string, string> = {
  USER_BAN: 'Cấm người dùng',
  USER_UNBAN: 'Mở cấm người dùng',
  USER_CREATE: 'Tạo người dùng',
  USER_UPDATE: 'Cập nhật người dùng',
  USER_DELETE: 'Xoá người dùng',
  PAYMENT_APPROVE: 'Duyệt thanh toán',
  PAYMENT_REJECT: 'Từ chối thanh toán',
  PAYMENT_REFUND: 'Hoàn tiền thanh toán',
  AI_JOB_RETRY: 'Thử lại AI job',
  AI_JOB_CANCEL: 'Huỷ AI job',
  ACHIEVEMENT_CREATE: 'Tạo thành tựu',
  ACHIEVEMENT_UPDATE: 'Cập nhật thành tựu',
  PACKAGE_CREATE: 'Tạo gói coins',
  PACKAGE_UPDATE: 'Cập nhật gói coins',
  FEATURE_TOGGLE: 'Bật/tắt tính năng',
  CONTENT_MODERATE: 'Kiểm duyệt nội dung',
};

const ACTION_COLORS: Record<string, string> = {
  USER_BAN: 'red',
  USER_UNBAN: 'green',
  USER_CREATE: 'blue',
  USER_UPDATE: 'cyan',
  USER_DELETE: 'orange',
  PAYMENT_APPROVE: 'green',
  PAYMENT_REJECT: 'red',
  PAYMENT_REFUND: 'purple',
  AI_JOB_RETRY: 'orange',
  AI_JOB_CANCEL: 'red',
  ACHIEVEMENT_CREATE: 'purple',
  ACHIEVEMENT_UPDATE: 'cyan',
  PACKAGE_CREATE: 'gold',
  PACKAGE_UPDATE: 'orange',
  FEATURE_TOGGLE: 'blue',
  CONTENT_MODERATE: 'orange',
};

const TARGET_TYPE_LABELS: Record<string, string> = {
  USER: 'Người dùng',
  PAYMENT: 'Thanh toán',
  AI_JOB: 'AI Job',
  ACHIEVEMENT: 'Thành tựu',
  PACKAGE: 'Gói coins',
  VIDEO: 'Video',
  FEATURE_FLAG: 'Tính năng',
};

export default function AdminLogsPage() {
  const { message } = App.useApp();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = async (pg = 1, a = action) => {
    setLoading(true);
    try {
      const res = await adminService.getLogs({ page: pg, limit: 50, action: a || undefined });
      setLogs(res.data.data);
      setTotal(res.data.pagination.total);
      setPage(pg);
    } catch { message.error('Lỗi tải nhật ký'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1, ''); }, []);

  const columns: ColumnsType<AdminLog> = [
    {
      title: 'Admin',
      key: 'admin',
      render: (_, record) => (
        <div>
          <p className="text-white text-sm font-medium">{record.admin.name || '—'}</p>
          <p className="text-slate-400 text-xs">{record.admin.email}</p>
        </div>
      ),
    },
    {
      title: 'Hành động',
      key: 'action',
      render: (_, record) => (
        <Tag color={ACTION_COLORS[record.action] || 'default'} className="!rounded-full">
          {ACTION_LABELS[record.action] || record.action}
        </Tag>
      ),
    },
    {
      title: 'Loại mục tiêu',
      dataIndex: 'targetType',
      key: 'targetType',
      render: (t: string) => <Tag className="!rounded-full">{TARGET_TYPE_LABELS[t] || t}</Tag>,
    },
    {
      title: 'ID mục tiêu',
      dataIndex: 'targetId',
      key: 'targetId',
      render: (id: string) => <span className="text-slate-400 text-xs font-mono">{id.slice(0, 8)}...</span>,
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (t: string) => <span className="text-slate-400 text-xs">{dayjs(t).format('DD/MM/YYYY HH:mm:ss')}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">Nhật ký hệ thống</h2>
        <Select
          placeholder="Tất cả hành động"
          allowClear
          className="!w-52"
          value={action || undefined}
          onChange={(v) => { setAction(v || ''); load(1, v || ''); }}
          options={[
            { value: 'USER_BAN', label: 'Cấm người dùng' },
            { value: 'USER_UNBAN', label: 'Mở cấm người dùng' },
            { value: 'ACHIEVEMENT_CREATE', label: 'Tạo thành tựu' },
            { value: 'ACHIEVEMENT_UPDATE', label: 'Cập nhật thành tựu' },
            { value: 'PACKAGE_CREATE', label: 'Tạo gói coins' },
            { value: 'PACKAGE_UPDATE', label: 'Cập nhật gói coins' },
          ]}
        />
      </div>

      <Table
        columns={columns}
        dataSource={logs}
        rowKey="id"
        loading={loading}
        pagination={{ current: page, pageSize: 50, total, onChange: (p) => load(p, action), showSizeChanger: false }}
        className="kmate-table"
        scroll={{ x: 800 }}
      />
    </div>
  );
}
