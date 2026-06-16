'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Tag, Spin, Input, Modal,  } from "antd";
import { App } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { adminService, type Achievement, type AchievementInput } from '@/lib/api-services';

const TYPE_LABELS: Record<string, string> = {
  FIRST_VIDEO: 'Video đầu tiên',
  STREAK_7_DAYS: 'Chuỗi 7 ngày',
  STREAK_30_DAYS: 'Chuỗi 30 ngày',
  FLASHCARD_100: '100 flashcards',
  FLASHCARD_500: '500 flashcards',
  QUIZ_PERFECT_SCORE: 'Điểm quiz tuyệt đối',
  VIDEOS_COMPLETED_10: '10 videos hoàn thành',
  VIDEOS_COMPLETED_50: '50 videos hoàn thành',
  COINS_EARNED_1000: '1000 coins kiếm được',
  REFERRAL_5_USERS: 'Giới thiệu 5 người',
};

export default function AdminAchievementsPage() {
  const { message } = App.useApp();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(false);
  const [editing, setEditing] = useState<Achievement | null>(null);
  const [form, setForm] = useState<AchievementInput>({
    type: '', name: '', description: '', icon: '', coinReward: 0, xpReward: 0, requirement: 1, isActive: true,
  });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminService.getAchievements();
      setAchievements(res.data.data);
    } catch { message.error('Lỗi tải thành tựu'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ type: '', name: '', description: '', icon: '🏆', coinReward: 0, xpReward: 0, requirement: 1, isActive: true });
    setEditModal(true);
  };
  const openEdit = (a: Achievement) => {
    setEditing(a);
    setForm({
      type: a.type, name: a.name, description: a.description, icon: a.icon,
      coinReward: a.coinReward, xpReward: a.xpReward, requirement: a.requirement, isActive: a.isActive,
    });
    setEditModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.type) { message.error('Vui lòng nhập tên và loại'); return; }
    setSaving(true);
    try {
      if (editing) {
        await adminService.updateAchievement(editing.id, form);
        message.success('Đã cập nhật thành tựu');
      } else {
        await adminService.createAchievement(form);
        message.success('Đã tạo thành tựu');
      }
      setEditModal(false);
      load();
    } catch { message.error('Lỗi lưu thành tựu'); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (a: Achievement) => {
    try {
      await adminService.updateAchievement(a.id, { ...a, isActive: !a.isActive });
      load();
    } catch { message.error('Lỗi cập nhật trạng thái'); }
  };

  const columns: ColumnsType<Achievement> = [
    {
      title: 'Biểu tượng',
      dataIndex: 'icon',
      key: 'icon',
      render: (i: string) => <span className="text-2xl">{i}</span>,
    },
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
      render: (n: string) => <span className="text-white font-medium">{n}</span>,
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (t: string) => <Tag className="!rounded-full">{TYPE_LABELS[t] || t}</Tag>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (d: string) => <span className="text-slate-400 text-xs max-w-[200px] truncate block">{d}</span>,
    },
    {
      title: 'Thưởng Coins',
      dataIndex: 'coinReward',
      key: 'coinReward',
      render: (c: number) => <span className="text-yellow-400 font-bold">{c}</span>,
    },
    {
      title: 'Thưởng XP',
      dataIndex: 'xpReward',
      key: 'xpReward',
      render: (x: number) => <span className="text-blue-400 font-bold">{x}</span>,
    },
    {
      title: 'Yêu cầu',
      dataIndex: 'requirement',
      key: 'requirement',
      render: (r: number) => <span className="text-slate-400">{r}</span>,
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      render: (_, record) => (
        <Tag
          color={record.isActive ? 'green' : 'default'}
          className="!rounded-full cursor-pointer"
          onClick={() => handleToggleActive(record)}
        >
          {record.isActive ? 'Bật' : 'Tắt'}
        </Tag>
      ),
    },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_, record) => (
        <div className="flex gap-2">
          <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(record)} className="!rounded-lg !text-xs" />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-white">Thành tựu</h2>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openCreate}
          className="!rounded-xl !font-bold"
          style={{ background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)' }}
        >
          Tạo thành tựu
        </Button>
      </div>

      <Table columns={columns} dataSource={achievements} rowKey="id" loading={loading} pagination={false} className="kmate-table" />

      <Modal
        title={<span className="text-white font-bold">{editing ? 'Sửa thành tựu' : 'Tạo thành tựu'}</span>}
        open={editModal}
        onCancel={() => setEditModal(false)}
        footer={null}
        className="kmate-modal"
      >
        <div className="py-4 space-y-4">
          {[
            { label: 'Loại (duy nhất)', key: 'type', placeholder: 'VD: FIRST_VIDEO' },
            { label: 'Tên', key: 'name', placeholder: 'Tên thành tựu' },
            { label: 'Biểu tượng (emoji)', key: 'icon', placeholder: '🏆' },
            { label: 'Mô tả', key: 'description', placeholder: 'Mô tả thành tựu' },
          ].map((field) => (
            <div key={field.key}>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{field.label}</label>
              <Input
                value={(form as Record<string, unknown>)[field.key] as string}
                onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="!rounded-xl"
              />
            </div>
          ))}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Thưởng Coins', key: 'coinReward' },
              { label: 'Thưởng XP', key: 'xpReward' },
              { label: 'Yêu cầu', key: 'requirement' },
            ].map((field) => (
              <div key={field.key}>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">{field.label}</label>
                <Input
                  type="number"
                  value={(form as Record<string, unknown>)[field.key] as number}
                  onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: parseInt(e.target.value) || 0 }))}
                  className="!rounded-xl"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <Button block onClick={() => setEditModal(false)} className="!rounded-xl">Huỷ</Button>
            <Button
              type="primary"
              block
              loading={saving}
              onClick={handleSave}
              className="!rounded-xl !font-bold"
              style={{ background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)' }}
            >
              Lưu
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
