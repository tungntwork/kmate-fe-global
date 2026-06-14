'use client';

import { useState, useEffect } from 'react';
import { Table, Tag, Button, Spin, Select, Popconfirm, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined, StopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { adminService, type AIJob } from '@/lib/api-services';

const STATUS_COLORS: Record<string, string> = {
  QUEUED: 'blue',
  PROCESSING: 'orange',
  FAILED: 'red',
  COMPLETED: 'green',
  DEAD_LETTER: 'purple',
  CANCELLED: 'default',
};

const STATUS_LABELS: Record<string, string> = {
  QUEUED: 'Đang chờ',
  PROCESSING: 'Đang xử lý',
  FAILED: 'Thất bại',
  COMPLETED: 'Hoàn thành',
  DEAD_LETTER: 'Dead letter',
  CANCELLED: 'Đã huỷ',
};

const TYPE_LABELS: Record<string, string> = {
  WHISPER_TRANSCRIPTION: 'Chuyển âm',
  TRANSLATION: 'Dịch thuật',
  VOCABULARY_ANALYSIS: 'Phân tích từ vựng',
  QUIZ_GENERATION: 'Tạo quiz',
  SUBTITLE_SYNC: 'Đồng bộ phụ đề',
  SUBTITLE_GENERATION: 'Tạo phụ đề',
};

const STAGE_LABELS: Record<string, string> = {
  PENDING: 'Đang chờ',
  DOWNLOADING: 'Đang tải',
  EXTRACTING_AUDIO: 'Tách âm thanh',
  TRANSCRIBING: 'Đang chuyển âm',
  TRANSLATING: 'Đang dịch',
  SYNCING: 'Đang đồng bộ',
  UPLOADING: 'Đang tải lên',
  COMPLETED: 'Hoàn thành',
  FAILED: 'Thất bại',
  DONE: 'Xong',
  CANCELLED: 'Đã huỷ',
};

const STAGE_ICONS: Record<string, string> = {
  PENDING: '⏳',
  DOWNLOADING: '📥',
  EXTRACTING_AUDIO: '🎵',
  TRANSCRIBING: '🎤',
  TRANSLATING: '🌐',
  SYNCING: '⏱️',
  UPLOADING: '☁️',
  COMPLETED: '✅',
  DONE: '✅',
  FAILED: '❌',
  CANCELLED: '🚫',
};

export default function AdminAIQueuePage() {
  const [jobs, setJobs] = useState<AIJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.getAIQueue({ status: status || undefined });
      setJobs(res.data.data);
    } catch { message.error('Lỗi tải hàng đợi AI'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [status]);

  const handleRetry = async (id: string) => {
    setActionId(id);
    try {
      await adminService.retryAIJob(id);
      message.success('Đã thử lại job');
      load();
    } catch { message.error('Lỗi thử lại job'); }
    finally { setActionId(null); }
  };

  const handleCancel = async (id: string) => {
    setActionId(id);
    try {
      await adminService.cancelAIJob(id);
      message.success('Đã huỷ job');
      load();
    } catch { message.error('Lỗi huỷ job'); }
    finally { setActionId(null); }
  };

  const columns: ColumnsType<AIJob> = [
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
      title: 'Video',
      key: 'video',
      render: (_, record) => (
        <div className="max-w-[200px]">
          <p className="text-slate-200 text-xs truncate">{record.video.title}</p>
        </div>
      ),
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => <Tag className="!rounded-full">{TYPE_LABELS[t] || t}</Tag>,
    },
    {
      title: 'Giai đoạn',
      dataIndex: 'stage',
      key: 'stage',
      render: (s: string) => (
        <span className="text-lg">{STAGE_ICONS[s] || '🔄'} <span className="text-xs text-slate-400">{STAGE_LABELS[s] || s}</span></span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (s: string) => (
        <Tag color={STATUS_COLORS[s] || 'default'} className="!rounded-full">
          {STATUS_LABELS[s] || s}
        </Tag>
      ),
    },
    {
      title: 'Tiến trình',
      dataIndex: 'progress',
      key: 'progress',
      render: (p: number) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${p}%` }} />
          </div>
          <span className="text-slate-400 text-xs">{p}%</span>
        </div>
      ),
    },
    {
      title: 'Thử lại',
      dataIndex: 'retryCount',
      key: 'retryCount',
      render: (r: number) => <span className={r > 0 ? 'text-red-400' : 'text-slate-400'}>{r}x</span>,
    },
    {
      title: 'Tạo lúc',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (t: string) => (
        <span className="text-slate-400 text-xs">{dayjs(t).format('DD/MM HH:mm')}</span>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <div className="flex gap-2">
          {(record.status === 'FAILED' || record.status === 'DEAD_LETTER') && (
            <Popconfirm title="Thử lại job này?" onConfirm={() => handleRetry(record.id)} okText="Thử lại">
              <Button size="small" type="primary" loading={actionId === record.id} icon={<ReloadOutlined />} className="!rounded-lg !text-xs !bg-green-500 !border-green-500">
                Thử lại
              </Button>
            </Popconfirm>
          )}
          {(record.status === 'QUEUED' || record.status === 'PROCESSING') && (
            <Popconfirm title="Huỷ job này?" onConfirm={() => handleCancel(record.id)} okText="Huỷ">
              <Button size="small" danger loading={actionId === record.id} icon={<StopOutlined />} className="!rounded-lg !text-xs">
                Huỷ
              </Button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-white">AI Queue</h2>
        <div className="flex items-center gap-3">
          <Select
            placeholder="Tất cả trạng thái"
            allowClear
            className="!w-44"
            value={status || undefined}
            onChange={(v) => setStatus(v || '')}
            options={[
              { value: 'QUEUED', label: 'Đang chờ' },
              { value: 'PROCESSING', label: 'Đang xử lý' },
              { value: 'FAILED', label: 'Thất bại' },
              { value: 'COMPLETED', label: 'Hoàn thành' },
            ]}
          />
          <Button onClick={load} className="!rounded-xl">Làm mới</Button>
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={jobs}
        rowKey="id"
        loading={loading}
        pagination={false}
        className="kmate-table"
        scroll={{ x: 1000 }}
      />
    </div>
  );
}
