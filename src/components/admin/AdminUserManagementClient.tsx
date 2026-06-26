'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Upload,
  Table,
  Button,
  InputNumber,
  Select,
  Checkbox,
  message,
  Alert,
  Tag,
} from 'antd';
import {
  InboxOutlined,
  DownloadOutlined,
  RobotOutlined,
  UserAddOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  FileExcelOutlined,
  RobotOutlined as RobotOutlinedAlt,
  DownOutlined,
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import type { ColumnsType } from 'antd/es/table';
import { adminService } from '@/lib/api-services';

const { Dragger } = Upload;

const C = {
  purple: '#7C4DFF',
  cyan: '#00e5ff',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
};

interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
}

interface FakePreviewUser {
  name: string;
  email: string;
  role: string;
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

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#151c2a] rounded-2xl border border-white/10 p-5 ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-white font-bold text-sm">{title}</h3>
      {subtitle && <p className="text-slate-500 text-xs mt-0.5">{subtitle}</p>}
    </div>
  );
}

export default function AdminUserManagementClient() {
  const [tab, setTab] = useState('import');
  const [msgApi, contextHolder] = message.useMessage();

  // ── Import state ─────────────────────────────────────────────
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [previewRows, setPreviewRows] = useState<Record<string, string>[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // ── Fake users state ────────────────────────────────────────
  const [fakeCount, setFakeCount] = useState(10);
  const [fakeMethod, setFakeMethod] = useState<'random' | 'ai'>('random');
  const [fakeRole, setFakeRole] = useState<string>('USER');
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ created: number; method: string; role: string } | null>(null);
  const [fakePreview, setFakePreview] = useState<FakePreviewUser[]>([]);

  // ── Export state ────────────────────────────────────────────
  const [exportOAuth, setExportOAuth] = useState(false);
  const [exportBanned, setExportBanned] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportPreview, setExportPreview] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // ── Shared stats ────────────────────────────────────────────
  const [totalUsers, setTotalUsers] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  // ── Load stats on mount ────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await adminService.getUsers({ page: 1, limit: 1 });
        setTotalUsers(res.data.pagination?.total ?? 0);
      } catch { /* silent */ }
      setLoadingStats(false);
    })();
  }, []);

  // ── Load export preview when export tab opened ──────────────
  const loadExportPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const res = await adminService.getExportPreview({ includeOAuth: exportOAuth, includeBanned: exportBanned });
      setExportPreview(res.data.data);
    } catch {
      msgApi.error('Lỗi tải preview export');
    } finally {
      setLoadingPreview(false);
    }
  }, [exportOAuth, exportBanned, msgApi]);

  useEffect(() => {
    if (tab === 'export') loadExportPreview();
  }, [tab, loadExportPreview]);

  // ── File change: parse preview ──────────────────────────────
  const handleFileChange: UploadProps['onChange'] = ({ fileList: fl }) => {
    setFileList(fl);
    setImportResult(null);
    if (fl.length > 0 && fl[0].originFileObj) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          importXlsxPreview(data).then(({ headers, rows }) => {
            setPreviewHeaders(headers);
            setPreviewRows(rows);
          });
        } catch {
          msgApi.warning('Không thể đọc file Excel');
        }
      };
      reader.readAsArrayBuffer(fl[0].originFileObj as Blob);
    } else {
      setPreviewHeaders([]);
      setPreviewRows([]);
    }
  };

  // ── Simple XLSX preview reader (client-side) ──────────────
  async function importXlsxPreview(data: Uint8Array): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
    const XLSX = (await import('xlsx')).default;
    const wb = XLSX.read(data, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, string>>(ws) as Record<string, string>[];
    const rows = raw.slice(0, 10);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    return { headers, rows };
  }

  // ── Import handler ─────────────────────────────────────────
  const handleImport = async () => {
    if (fileList.length === 0 || !fileList[0].originFileObj) {
      msgApi.warning('Vui lòng chọn file Excel trước');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await adminService.importUsers(fileList[0].originFileObj as File, skipDuplicates);
      setImportResult(res.data.data);
      if (res.data.data.errors.length > 0) {
        msgApi.warning(`Đã nhập ${res.data.data.created} người dùng, ${res.data.data.skipped} bị bỏ qua, ${res.data.data.errors.length} lỗi`);
      } else {
        msgApi.success(`Đã nhập thành công ${res.data.data.created} người dùng!`);
      }
      setFileList([]);
      setPreviewHeaders([]);
      setPreviewRows([]);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi khi nhập dữ liệu');
    } finally {
      setImporting(false);
    }
  };

  // ── Fake user preview (mock based on method) ───────────────
  useEffect(() => {
    const previews: FakePreviewUser[] = [];
    const KoreanFirst = ['Min-jun', 'Seo-yeon', 'Ji-woong', 'Yu-jin', 'Hyun-woo', 'Jae-hyun', 'Bo-young'];
    const KoreanLast = ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Yoon'];
    const EngFirst = ['James', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Oliver'];
    const EngLast = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Martinez', 'Lopez'];
    for (let i = 0; i < 3; i++) {
      const useKorean = fakeMethod === 'ai' || Math.random() > 0.4;
      const first = useKorean ? KoreanFirst[Math.floor(Math.random() * KoreanFirst.length)] : EngFirst[Math.floor(Math.random() * EngFirst.length)];
      const last = useKorean ? KoreanLast[Math.floor(Math.random() * KoreanLast.length)] : EngLast[Math.floor(Math.random() * EngLast.length)];
      previews.push({
        name: `${last} ${first}`,
        email: `fake-preview-${i + 1}@kmate.local`,
        role: fakeRole,
      });
    }
    setFakePreview(previews);
  }, [fakeMethod, fakeRole]);

  // ── Generate fake users handler ─────────────────────────────
  const handleGenerate = async () => {
    if (fakeCount < 1 || fakeCount > 500) {
      msgApi.warning('Số lượng phải từ 1 đến 500');
      return;
    }
    setGenerating(true);
    setGenerateResult(null);
    try {
      const res = await adminService.generateFakeUsers({ count: fakeCount, method: fakeMethod, role: fakeRole });
      setGenerateResult(res.data.data);
      msgApi.success(`Đã tạo ${res.data.data.created} người dùng ${res.data.data.method === 'ai' ? 'bằng AI' : 'ngẫu nhiên'}!`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      msgApi.error(e?.response?.data?.error?.message ?? 'Lỗi khi tạo người dùng giả');
    } finally {
      setGenerating(false);
    }
  };

  // ── Export handler ─────────────────────────────────────────
  const handleExport = async () => {
    setExporting(true);
    try {
      await adminService.exportUsers({ includeOAuth: exportOAuth, includeBanned: exportBanned });
      msgApi.success('Đã tải xuống file Excel thành công!');
    } catch {
      msgApi.error('Lỗi khi xuất dữ liệu');
    } finally {
      setExporting(false);
    }
  };

  // ── Preview table columns ───────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const previewColumns: ColumnsType<any> = [
    {
      title: '#',
      key: 'index',
      width: 48,
      render: (_: unknown, __: unknown, index: number) => (
        <span className="text-slate-500 text-xs">{index + 1}</span>
      ),
    },
  ];

  // ── Export preview columns ───────────────────────────────────
  const exportColHeaders = exportPreview?.headers ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exportColumns: ColumnsType<any> = [
    {
      title: '#',
      key: 'index',
      width: 48,
      render: (_: unknown, __: unknown, i: number) => (
        <span className="text-slate-500 text-xs">{i + 1}</span>
      ),
    },
    ...exportColHeaders.map((h) => ({
      title: h,
      dataIndex: h,
      key: h,
      ellipsis: true,
      width: 180,
      render: (v: string) => (
        <span className="text-slate-300 text-xs">{v || '—'}</span>
      ),
    })),
  ];

  // ── Tab items ───────────────────────────────────────────────
  const tabs = [
    {
      key: 'import',
      label: (
        <div className="flex items-center gap-2 px-1">
          <UploadOutlined className="text-sm" />
          <span className="text-xs font-semibold">Nhập Users</span>
        </div>
      ),
    },
    {
      key: 'fake',
      label: (
        <div className="flex items-center gap-2 px-1">
          <RobotOutlined className="text-sm" />
          <span className="text-xs font-semibold">Tạo Users Giả</span>
        </div>
      ),
    },
    {
      key: 'export',
      label: (
        <div className="flex items-center gap-2 px-1">
          <DownloadOutlined className="text-sm" />
          <span className="text-xs font-semibold">Xuất Users</span>
        </div>
      ),
    },
  ] as const;

  return (
    <div className="space-y-6">
      {contextHolder}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Quản lý Users</h2>
          <p className="text-slate-500 text-xs mt-0.5">Import, tạo thử và xuất dữ liệu người dùng</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Tổng người dùng"
          value={loadingStats ? '—' : totalUsers.toLocaleString('vi-VN')}
          icon={<UploadOutlined />}
          color={C.purple}
          bg="rgba(124,77,255,0.08)"
        />
        <StatCard
          label="Đã tạo gần đây"
          value={generateResult ? generateResult.created : '—'}
          icon={<RobotOutlined className="text-sm" />}
          color={C.cyan}
          bg="rgba(0,229,255,0.08)"
        />
        <StatCard
          label="Đã nhập gần đây"
          value={importResult ? importResult.created : '—'}
          icon={<FileExcelOutlined />}
          color={C.green}
          bg="rgba(34,197,94,0.08)"
        />
      </div>

      {/* Tab container */}
      <div className="bg-[#151c2a] rounded-2xl border border-white/10 overflow-hidden">
        {/* Custom tab bar */}
        <div className="flex border-b border-white/5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 sm:flex-none px-6 py-4 flex items-center justify-center gap-2 text-sm font-medium transition-all relative ${
                tab === t.key
                  ? 'text-primary'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {t.label}
              {tab === t.key && (
                <span
                  className="absolute bottom-0 left-0 right-0 h-0.5"
                  style={{ backgroundColor: C.purple }}
                />
              )}
            </button>
          ))}
        </div>

        {/* ── Import Tab ───────────────────────────────────────────── */}
        {tab === 'import' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Upload */}
              <GlassCard>
                <CardHeader title="Upload File Excel" subtitle="Kéo thả hoặc chọn file .xlsx, .xls, .csv" />
                <Dragger
                  fileList={fileList}
                  onChange={handleFileChange}
                  beforeUpload={() => false}
                  accept=".xlsx,.xls,.csv"
                  maxCount={1}
                  onRemove={() => {
                    setFileList([]);
                    setPreviewHeaders([]);
                    setPreviewRows([]);
                    setImportResult(null);
                  }}
                  className="kmate-dragger"
                >
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(124,77,255,0.15)' }}
                    >
                      <InboxOutlined style={{ fontSize: 28, color: C.purple }} />
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">Kéo thả file Excel vào đây</p>
                      <p className="text-slate-500 text-xs mt-1">hoặc click để chọn file — Tối đa 10MB</p>
                    </div>
                    <div className="flex gap-2 mt-1">
                      {['.xlsx', '.xls', '.csv'].map((ext) => (
                        <span key={ext} className="px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: 'rgba(124,77,255,0.1)', color: C.purple }}>
                          {ext}
                        </span>
                      ))}
                    </div>
                  </div>
                </Dragger>

                <div className="mt-4 flex items-center gap-3">
                  <Checkbox
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="[&_.ant-checkbox-checked_.ant-checkbox-inner]:!bg-primary [&_.ant-checkbox-checked_.ant-checkbox-inner]:!border-primary"
                  >
                    <span className="text-slate-400 text-xs">Bỏ qua email trùng lặp</span>
                  </Checkbox>
                </div>

                <Button
                  type="primary"
                  icon={<UploadOutlined />}
                  loading={importing}
                  disabled={fileList.length === 0}
                  onClick={handleImport}
                  className="!mt-4 !w-full !rounded-xl !bg-primary !border-primary hover:!bg-primary/90"
                  size="large"
                >
                  Nhập dữ liệu
                </Button>

                {/* Column guide */}
                <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-slate-400 text-xs font-medium mb-2">Cột bắt buộc:</p>
                  <div className="flex flex-wrap gap-2">
                    {['Name', 'Email'].map((c) => (
                      <Tag key={c} className="!rounded-full !bg-primary/10 !text-primary !border-primary/20">{c}</Tag>
                    ))}
                    <p className="text-slate-500 text-xs w-full mt-1">Tùy chọn: <span className="text-slate-400">Password, Provider, Google ID, Role</span></p>
                  </div>
                </div>
              </GlassCard>

              {/* Preview */}
              <GlassCard>
                <CardHeader
                  title="Xem trước dữ liệu"
                  subtitle={previewRows.length > 0 ? `${previewRows.length} dòng đầu tiên được hiển thị` : 'Chưa có file nào được chọn'}
                />
                {previewRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                      <FileExcelOutlined className="text-slate-600 text-2xl" />
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-sm font-medium">Chưa có file nào được chọn</p>
                      <p className="text-slate-600 text-xs mt-1">Upload file Excel để xem trước dữ liệu</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className="kmate-table">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-3 py-2.5 w-8">#</th>
                            {previewHeaders.map((h) => (
                              <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-3 py-2.5 whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, idx) => (
                            <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="px-3 py-2.5 text-slate-500 text-xs">{idx + 1}</td>
                              {previewHeaders.map((h) => (
                                <td key={h} className="px-3 py-2.5 text-slate-300 text-xs whitespace-nowrap max-w-[200px] truncate">
                                  {row[h] || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>

            {/* Result */}
            {importResult && (
              <GlassCard>
                <CardHeader title="Kết quả nhập dữ liệu" />
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <p className="text-green-400 text-xl font-black">{importResult.created}</p>
                    <p className="text-slate-500 text-xs mt-1">Đã tạo</p>
                  </div>
                  <div className="rounded-xl p-3 text-center" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <p className="text-amber-400 text-xl font-black">{importResult.skipped}</p>
                    <p className="text-slate-500 text-xs mt-1">Đã bỏ qua</p>
                  </div>
                  <div
                    className="rounded-xl p-3 text-center"
                    style={{
                      backgroundColor: importResult.errors.length > 0 ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)',
                      border: importResult.errors.length > 0 ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(34,197,94,0.2)',
                    }}
                  >
                    <p
                      className="text-xl font-black"
                      style={{ color: importResult.errors.length > 0 ? C.red : C.green }}
                    >
                      {importResult.errors.length}
                    </p>
                    <p className="text-slate-500 text-xs mt-1">Lỗi</p>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <WarningOutlined style={{ color: C.red }} />
                      <p className="text-red-400 text-xs font-semibold">Chi tiết lỗi ({importResult.errors.length})</p>
                    </div>
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                      {importResult.errors.slice(0, 20).map((e, i) => (
                        <li key={i} className="text-slate-400 text-xs flex gap-2">
                          <span className="text-slate-600 flex-shrink-0">•</span>
                          <span>{e}</span>
                        </li>
                      ))}
                      {importResult.errors.length > 20 && (
                        <li className="text-slate-600 text-xs italic">...và {importResult.errors.length - 20} lỗi khác</li>
                      )}
                    </ul>
                  </div>
                )}
              </GlassCard>
            )}

            {/* Info alert */}
            <Alert
              type="info"
              showIcon
              icon={<FileExcelOutlined style={{ color: C.cyan }} />}
              message={
                <div>
                  <p className="text-white text-xs font-semibold mb-1">Hướng dẫn cột Excel</p>
                  <p className="text-slate-400 text-xs">
                    Cột <span className="text-primary font-medium">Name</span> và <span className="text-primary font-medium">Email</span> là bắt buộc.
                    Role hợp lệ: <span className="text-white font-medium">USER, MODERATOR, ADMIN</span> — mặc định là USER.
                  </p>
                </div>
              }
              className="!rounded-xl !bg-primary/5 !border-primary/20"
              style={{ background: 'rgba(124,77,255,0.05)', borderColor: 'rgba(124,77,255,0.2)' }}
            />
          </div>
        )}

        {/* ── Fake Users Tab ───────────────────────────────────────── */}
        {tab === 'fake' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Config */}
              <GlassCard className="lg:col-span-2">
                <CardHeader title="Cấu hình tạo users giả" subtitle="Tạo dữ liệu người dùng mẫu để test" />

                <div className="space-y-5">
                  {/* Count */}
                  <div>
                    <label className="text-slate-400 text-xs font-medium block mb-2">Số lượng (1–500)</label>
                    <InputNumber
                      min={1}
                      max={500}
                      value={fakeCount}
                      onChange={(v) => setFakeCount(v ?? 1)}
                      className="!w-full !rounded-xl !bg-white/5 !border-white/10 !text-sm !text-white [&_.ant-input-number-input]:!text-white"
                      placeholder="1 - 500"
                      controls={{
                        upIcon: <span className="text-slate-400">+</span>,
                        downIcon: <span className="text-slate-400">−</span>,
                      }}
                    />
                  </div>

                  {/* Method */}
                  <div>
                    <label className="text-slate-400 text-xs font-medium block mb-2">Phương thức</label>
                    <div className="flex flex-col gap-2">
                      {[
                        { value: 'random', label: 'Ngẫu nhiên', icon: <UserAddOutlined />, desc: 'Tạo nhanh, không cần API key' },
                        { value: 'ai', label: 'AI Generate', icon: <RobotOutlinedAlt />, desc: 'Dùng OpenAI API (cần OPENAI_API_KEY)' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setFakeMethod(opt.value as 'random' | 'ai')}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                            fakeMethod === opt.value
                              ? 'border-primary/50 bg-primary/10'
                              : 'border-white/10 bg-white/5 hover:border-white/20'
                          }`}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: fakeMethod === opt.value ? `${C.purple}20` : 'rgba(255,255,255,0.05)', color: fakeMethod === opt.value ? C.purple : '#94a3b8' }}
                          >
                            {opt.icon}
                          </div>
                          <div>
                            <p className={`text-xs font-semibold ${fakeMethod === opt.value ? 'text-primary' : 'text-slate-300'}`}>{opt.label}</p>
                            <p className="text-slate-500 text-xs mt-0.5">{opt.desc}</p>
                          </div>
                          {fakeMethod === opt.value && (
                            <CheckCircleOutlined className="ml-auto text-primary text-sm flex-shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="text-slate-400 text-xs font-medium block mb-2">Vai trò (Role)</label>
                    <Select
                      value={fakeRole}
                      onChange={setFakeRole}
                      className="!w-full"
                      popupClassName="kmate-dark-select"
                      options={[
                        { label: <span className="text-slate-300 text-xs">USER</span>, value: 'USER' },
                        { label: <span className="text-slate-300 text-xs">MODERATOR</span>, value: 'MODERATOR' },
                        { label: <span className="text-slate-300 text-xs">ADMIN</span>, value: 'ADMIN' },
                      ]}
                      suffixIcon={<DownOutlined style={{ color: '#64748b', fontSize: 10 }} />}
                    />
                  </div>

                  {/* Generate button */}
                  <Button
                    type="primary"
                    icon={fakeMethod === 'ai' ? <RobotOutlined /> : <UserAddOutlined />}
                    loading={generating}
                    onClick={handleGenerate}
                    size="large"
                    block
                    className="!rounded-xl !bg-primary !border-primary hover:!bg-primary/90"
                  >
                    {fakeMethod === 'ai' ? 'Generate bằng AI' : 'Tạo Users Ngẫu nhiên'}
                  </Button>

                  {/* Result */}
                  {generateResult && (
                    <Alert
                      type="success"
                      showIcon
                      icon={<CheckCircleOutlined style={{ color: C.green }} />}
                      message={
                        <span className="text-xs">
                          Đã tạo thành công <span className="text-green-400 font-bold">{generateResult.created} users</span>!
                        </span>
                      }
                      className="!rounded-xl !bg-green-500/5 !border-green-500/20"
                      style={{ background: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.2)' }}
                    />
                  )}
                </div>
              </GlassCard>

              {/* Preview */}
              <GlassCard className="lg:col-span-3">
                <CardHeader title="Preview (3 dòng đầu)" subtitle="Đây chỉ là mẫu — Password sẽ được tạo tự động" />
                <div className="overflow-x-auto">
                  <div className="kmate-table">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/5">
                          {['#', 'Name', 'Email', 'Role'].map((h) => (
                            <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-3 py-2.5 first:pl-4">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {fakePreview.map((u, i) => (
                          <tr key={i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td className="px-3 py-2.5 first:pl-4 text-slate-500 text-xs">{i + 1}</td>
                            <td className="px-3 py-2.5 text-white text-xs font-medium">{u.name}</td>
                            <td className="px-3 py-2.5 text-slate-400 text-xs">{u.email}</td>
                            <td className="px-3 py-2.5">
                              <Tag
                                color={u.role === 'ADMIN' ? 'red' : u.role === 'MODERATOR' ? 'orange' : 'default'}
                                className="!rounded-full !font-semibold"
                              >
                                {u.role}
                              </Tag>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="text-slate-600 text-xs mt-3 px-1">
                  Password sẽ được tự động tạo ngẫu nhiên và không hiển thị ở đây vì lý do bảo mật.
                </p>

                {/* Info */}
                <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
                  {[
                    { label: 'Email', value: 'fake-xxxxxxxx@kmate.local' },
                    { label: 'Provider', value: 'EMAIL (thường)' },
                    { label: 'Đăng nhập', value: 'Có — với email và password' },
                    { label: 'Giới hạn', value: 'Tối đa 500 users mỗi lần' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <span className="text-slate-500 text-xs w-24 flex-shrink-0">{item.label}</span>
                      <span className="text-slate-300 text-xs">{item.value}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          </div>
        )}

        {/* ── Export Tab ───────────────────────────────────────────── */}
        {tab === 'export' && (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Options */}
              <GlassCard className="lg:col-span-1">
                <CardHeader title="Tùy chọn xuất" subtitle="Chọn các trường cần xuất" />

                <div className="space-y-4">
                  <Checkbox
                    checked={exportOAuth}
                    onChange={(e) => setExportOAuth(e.target.checked)}
                    className="[&_.ant-checkbox-checked_.ant-checkbox-inner]:!bg-primary [&_.ant-checkbox-checked_.ant-checkbox-inner]:!border-primary"
                  >
                    <div>
                      <p className="text-slate-300 text-xs font-medium">Thông tin OAuth</p>
                      <p className="text-slate-500 text-xs mt-0.5">Xuất Provider và Google ID</p>
                    </div>
                  </Checkbox>

                  <Checkbox
                    checked={exportBanned}
                    onChange={(e) => setExportBanned(e.target.checked)}
                    className="[&_.ant-checkbox-checked_.ant-checkbox-inner]:!bg-primary [&_.ant-checkbox-checked_.ant-checkbox-inner]:!border-primary"
                  >
                    <div>
                      <p className="text-slate-300 text-xs font-medium">Bao gồm users bị ban</p>
                      <p className="text-slate-500 text-xs mt-0.5">Mặc định chỉ xuất users hoạt động</p>
                    </div>
                  </Checkbox>

                  {exportOAuth && (
                    <Alert
                      type="warning"
                      showIcon
                      message={<span className="text-xs">File export có thể chứa Google ID. Hãy bảo mật file này.</span>}
                      className="!rounded-xl !bg-amber-500/5 !border-amber-500/20"
                      style={{ background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)' }}
                    />
                  )}

                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    loading={exporting}
                    onClick={handleExport}
                    size="large"
                    block
                    className="!rounded-xl !bg-primary !border-primary hover:!bg-primary/90"
                  >
                    Xuất Excel
                  </Button>
                </div>

                {/* Column info */}
                <div className="mt-5 pt-4 border-t border-white/5">
                  <p className="text-slate-500 text-xs font-medium mb-2">Các cột trong file export:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['Name', 'Email', 'ID', 'Role', 'Provider', 'Google ID', 'Coin Balance', 'Streak', 'Banned', 'New User', 'Created Time', 'Last Active'].map((c) => (
                      <Tag key={c} className="!rounded-full !bg-white/5 !text-slate-400 !border-white/10 !text-xs">
                        {c}
                      </Tag>
                    ))}
                  </div>
                </div>
              </GlassCard>

              {/* Preview */}
              <GlassCard className="lg:col-span-3">
                <CardHeader
                  title="Xem trước"
                  subtitle={
                    loadingPreview
                      ? 'Đang tải...'
                      : exportPreview && exportPreview.rows.length > 0
                      ? `${exportPreview.headers.length} cột — ${exportPreview.rows.length} dòng preview`
                      : 'Không có dữ liệu để xuất'
                  }
                />
                {loadingPreview ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : exportPreview && exportPreview.rows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <div className="kmate-table">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/5">
                            <th className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-3 py-2.5 w-8">#</th>
                            {exportPreview.headers.map((h) => (
                              <th key={h} className="text-left text-slate-500 text-xs font-semibold uppercase tracking-wide px-3 py-2.5 whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {exportPreview.rows.map((row, idx) => (
                            <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                              <td className="px-3 py-2.5 text-slate-500 text-xs">{idx + 1}</td>
                              {exportPreview.headers.map((h) => (
                                <td key={h} className="px-3 py-2.5 text-slate-300 text-xs whitespace-nowrap max-w-[180px] truncate">
                                  {(row as Record<string, string>)[h] || '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
                      <FileExcelOutlined className="text-slate-600 text-2xl" />
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-sm font-medium">Không có dữ liệu để xuất</p>
                      <p className="text-slate-600 text-xs mt-1">Thử thay đổi tùy chọn xuất</p>
                    </div>
                  </div>
                )}
              </GlassCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
