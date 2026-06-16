'use client';

import { useState, useEffect } from 'react';
import {
  MailOutlined,
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import {
  Table,
  Button,
  Tag,
  Avatar,
  Spin,
  Statistic,
  Row,
  Col,
  Card,
  message,
  Modal,
  Alert,
  Typography,
  Tooltip,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { adminService, type AdminUser, type WeeklyReportData } from '@/lib/api-services';

const { Text, Title } = Typography;

export default function AdminReportsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);
  const [sendingUserId, setSendingUserId] = useState<string | null>(null);
  const [stats, setStats] = useState<{ total: number; sent: number; failed: number } | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [sendingSelected, setSendingSelected] = useState(false);

  // Preview modal
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState<{
    subject: string;
    html: string;
    report: WeeklyReportData;
    email: string;
    name: string;
  } | null>(null);

  const [messageApi, contextHolder] = message.useMessage();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsers({ page: 1, limit: 500 });
      setUsers(res.data.data);
    } catch {
      messageApi.error('Lỗi tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  // --- Double-click to preview ---
  const handleRowDoubleClick = async (record: AdminUser) => {
    setPreviewVisible(true);
    setPreviewData(null);
    setPreviewLoading(true);
    try {
      const res = await adminService.previewReport(record.id);
      setPreviewData({
        subject: res.data.data.subject,
        html: res.data.data.html,
        report: res.data.data.report,
        email: record.email,
        name: record.name || '—',
      });
    } catch {
      messageApi.error('Lỗi tải xem trước báo cáo');
      setPreviewVisible(false);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSendFromPreview = async () => {
    if (!previewData) return;
    setSendingUserId(previewData.report.userEmail);
    setPreviewVisible(false);
    try {
      await adminService.sendWeeklyReportToUser(users.find(u => u.email === previewData!.email)!.id);
      messageApi.success('Đã gửi báo cáo!');
    } catch {
      messageApi.error('Lỗi gửi báo cáo');
    } finally {
      setSendingUserId(null);
    }
  };

  // --- Broadcast all ---
  const handleBroadcast = async () => {
    setBroadcasting(true);
    setStats(null);
    try {
      const res = await adminService.broadcastWeeklyReport();
      setStats(res.data.data);
      messageApi.success(res.data.message);
    } catch {
      messageApi.error('Lỗi khi gửi báo cáo hàng loạt');
    } finally {
      setBroadcasting(false);
    }
  };

  // --- Send to single user ---
  const handleSendToUser = async (userId: string) => {
    setSendingUserId(userId);
    try {
      const res = await adminService.sendWeeklyReportToUser(userId);
      messageApi.success(res.data.message);
    } catch {
      messageApi.error('Lỗi gửi báo cáo cho người dùng này');
    } finally {
      setSendingUserId(null);
    }
  };

  // --- Send to selected users ---
  const handleSendSelected = async () => {
    if (selectedRowKeys.length === 0) {
      messageApi.warning('Vui lòng chọn ít nhất 1 người dùng');
      return;
    }
    setSendingSelected(true);
    try {
      const res = await adminService.sendWeeklyReportToSelected(selectedRowKeys);
      setStats({ total: res.data.data.total, sent: res.data.data.sent, failed: res.data.data.failed });
      setSelectedRowKeys([]);
      messageApi.success(res.data.message);
    } catch {
      messageApi.error('Lỗi khi gửi báo cáo cho người được chọn');
    } finally {
      setSendingSelected(false);
    }
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys as string[]),
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_NONE,
      {
        key: 'active',
        text: 'Chọn người hoạt động',
        onSelect: (allKeys: React.Key[]) => {
          const activeKeys = users.filter(u => !u.isBanned).map(u => u.id);
          setSelectedRowKeys(activeKeys.filter(k => allKeys.includes(k)));
        },
      },
    ],
  };

  const columns: ColumnsType<AdminUser> = [
    {
      title: 'Người dùng',
      key: 'user',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Avatar src={record.avatar} icon={<MailOutlined />} style={{ backgroundColor: '#4f46e5' }} />
          <div>
            <p style={{ color: '#fff', fontWeight: 500, fontSize: 14 }}>{record.name || '—'}</p>
            <p style={{ color: '#9ca3af', fontSize: 12 }}>{record.email}</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Coins',
      dataIndex: 'coinBalance',
      key: 'coinBalance',
      render: (c: number) => <span style={{ color: '#7c3aed', fontWeight: 700 }}>{c}</span>,
    },
    {
      title: 'Chuỗi',
      dataIndex: 'streak',
      key: 'streak',
      render: (s: number) => <span style={{ color: '#d1d5db' }}>{s} ngày</span>,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) =>
        record.isBanned
          ? <Tag color="red" style={{ borderRadius: 999 }}>Bị cấm</Tag>
          : <Tag color="green" style={{ borderRadius: 999 }}>Hoạt động</Tag>,
    },
    {
      title: 'Hành động',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <div style={{ display: 'flex', gap: 8 }}>
          <Tooltip title="Xem trước báo cáo">
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleRowDoubleClick(record)}
              style={{ borderRadius: 8 }}
            >
              Xem
            </Button>
          </Tooltip>
          <Button
            size="small"
            icon={<SendOutlined />}
            loading={sendingUserId === record.id}
            onClick={() => handleSendToUser(record.id)}
            disabled={record.isBanned}
            style={{ borderRadius: 8 }}
          >
            Gửi
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {contextHolder}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: 0 }}>
          Gửi báo cáo tuần
        </h2>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleBroadcast}
          loading={broadcasting}
          style={{
            borderRadius: 12,
            fontWeight: 700,
            background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)',
            border: 'none',
          }}
        >
          Gửi báo cáo cho TẤT CẢ users
        </Button>
      </div>

      {/* Sending selected banner */}
      {selectedRowKeys.length > 0 && (
        <Alert
          message={
            <span>
              Đã chọn <strong>{selectedRowKeys.length}</strong> người dùng
            </span>
          }
          description={
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={sendingSelected}
              onClick={handleSendSelected}
              size="small"
              style={{ marginTop: 8, borderRadius: 8 }}
            >
              Gửi báo cáo cho người được chọn
            </Button>
          }
          type="info"
          showIcon
          style={{ background: '#1d2b44', borderColor: '#3b82f6' }}
        />
      )}

      {/* Stats cards */}
      {broadcasting && (
        <Card style={{ background: '#151c2a', borderColor: 'rgba(255,255,255,0.1)' }}>
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Spin size="large" tip="Đang gửi báo cáo hàng loạt..." />
          </div>
        </Card>
      )}

      {stats && !broadcasting && (
        <Row gutter={16}>
          <Col span={8}>
            <Card style={{ background: '#151c2a', borderColor: 'rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <Statistic title="Tổng users" value={stats.total} />
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ background: '#151c2a', borderColor: 'rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <Statistic
                title="Gửi thành công"
                value={stats.sent}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card style={{ background: '#151c2a', borderColor: 'rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <Statistic
                title="Thất bại"
                value={stats.failed}
                valueStyle={{ color: stats.failed > 0 ? '#ff4d4f' : '#9ca3af' }}
                prefix={<CloseCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* User table */}
      <Card style={{ background: '#151c2a', borderColor: 'rgba(255,255,255,0.1)' }}>
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          rowSelection={rowSelection}
          onRow={(record) => ({
            onDoubleClick: () => handleRowDoubleClick(record),
            style: { cursor: 'pointer' },
          })}
          pagination={{ pageSize: 20, showSizeChanger: false }}
          style={{ background: '#151c2a' }}
        />
      </Card>

      {/* Preview Modal */}
      <Modal
        title={
          <div>
            <Title level={5} style={{ color: '#fff', margin: 0 }}>
              Xem trước báo cáo tuần
            </Title>
            {previewData && (
              <Text style={{ fontSize: 12, color: '#9ca3af' }}>
                cho {previewData.name} ({previewData.email})
              </Text>
            )}
          </div>
        }
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={820}
        footer={
          previewData ? (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button onClick={() => setPreviewVisible(false)} style={{ borderRadius: 8 }}>
                Đóng
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={!!sendingUserId}
                onClick={handleSendFromPreview}
                style={{ borderRadius: 8, background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)', border: 'none' }}
              >
                Gửi báo cáo này
              </Button>
            </div>
          ) : null
        }
        styles={{ body: { padding: 0, maxHeight: '70vh', overflow: 'auto' } }}
        className="kmate-modal"
      >
        {previewLoading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="Đang tải báo cáo..." />
          </div>
        )}

        {previewData && !previewLoading && (
          <div>
            {/* Report summary header */}
            <div style={{ padding: '16px 24px', background: '#1d2b44', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title={<span style={{ color: '#9ca3af', fontSize: 12 }}>Videos</span>}
                    value={previewData.report.totalVideosWatched}
                    valueStyle={{ color: '#60a5fa', fontSize: 22 }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={<span style={{ color: '#9ca3af', fontSize: 12 }}>Phút học</span>}
                    value={previewData.report.totalMinutesLearned}
                    valueStyle={{ color: '#34d399', fontSize: 22 }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={<span style={{ color: '#9ca3af', fontSize: 12 }}>Từ vựng</span>}
                    value={previewData.report.totalWordsLookedUp}
                    valueStyle={{ color: '#fbbf24', fontSize: 22 }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title={<span style={{ color: '#9ca3af', fontSize: 12 }}>Streak</span>}
                    value={`${previewData.report.streakDays} ngày`}
                    valueStyle={{ color: '#f97316', fontSize: 22 }}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 12 }}>
                <Text style={{ color: '#9ca3af', fontSize: 12 }}>
                  Tuần: {new Date(previewData.report.weekStart).toLocaleDateString('vi-VN')} –{' '}
                  {new Date(previewData.report.weekEnd).toLocaleDateString('vi-VN')}
                </Text>
              </div>
            </div>

            {/* HTML preview in iframe */}
            <iframe
              srcDoc={previewData.html}
              title="Report Preview"
              style={{
                width: '100%',
                height: 520,
                border: 'none',
                display: 'block',
              }}
              sandbox="allow-same-origin"
            />
          </div>
        )}
      </Modal>
    </div>
  );
}
