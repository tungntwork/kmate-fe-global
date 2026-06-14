'use client';

import { Modal, Button, Spin, Table } from 'antd';
import { FilePdfOutlined, FileExcelOutlined, FireOutlined, ThunderboltOutlined, TranslationOutlined, PlayCircleOutlined, StarOutlined } from '@ant-design/icons';
import type { UserStatistics, UserAchievement } from '@/lib/api-services';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  stats: UserStatistics | null;
  achievements: UserAchievement[];
}

async function exportPDF(stats: UserStatistics, achievements: UserAchievement[]) {
  const { default: html2canvas } = await import('html2canvas');

  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  // Build report HTML — browser renders Vietnamese natively (no font issues)
  const bodyRows = [
    ['Chuỗi ngày (hiện tại)', `${stats.currentStreak} ngày`, `Kỷ lục: ${stats.longestStreak} ngày`],
    ['Phút học', `${stats.totalMinutesLearned} phút`, `${stats.totalVideosWatched} video đã xem`],
    ['Flashcard', `${stats.totalFlashcardReviews} lượt ôn`, `${stats.totalFlashcards} thẻ đã tạo`],
    ['Quiz', `${stats.totalQuizzesTaken} bài đã làm`, `${stats.totalWordsLookedUp} từ đã tra`],
    ['Từ vựng đã tra', `${stats.totalWordsLookedUp} từ`, ''],
    ['Số dư Coin', `${stats.currentCoinBalance ?? 0} coins`, ''],
  ];

  const weeklyRows = [
    ['Videos đã xem', stats.totalVideosWatched],
    ['Lượt ôn Flashcard', stats.totalFlashcardReviews],
    ['Phút học', stats.totalMinutesLearned],
    ['Từ đã tra', stats.totalWordsLookedUp],
    ['Quiz đã làm', stats.totalQuizzesTaken],
    ['Chuỗi hiện tại', `${stats.currentStreak} ngày`],
    ['Chuỗi dài nhất', `${stats.longestStreak} ngày`],
  ];

  const achievementRows = achievements.map(a => [
    a.name,
    a.description,
    `${a.coinReward} coins, ${a.xpReward} XP`,
    a.isActive ? 'Đã mở' : 'Chưa mở',
    a.unlockedAt ? new Date(a.unlockedAt).toLocaleDateString('vi-VN') : '-',
  ]);

  const makeTable = (rows: string[][], header: string[]) => {
    const headersHtml = `<thead><tr>${header.map(h => `<th>${h}</th>`).join('')}</tr></thead>`;
    const bodyHtml = rows.length
      ? `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>`
      : '';
    return `<table><thead><tr>${header.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  };

  const html = `
<div id="pdf-report" style="
  font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  font-size: 12px;
  color: #333;
  padding: 0;
  width: ${pageW * 3.78}px;
  background: #fff;
">
  <!-- Header -->
  <div style="background:#7C4DFF;color:#fff;padding:20px 24px;display:flex;align-items:center;gap:16px;margin-bottom:16px;">
    <div>
      <div style="font-size:22px;font-weight:700;">KMATE</div>
      <div style="font-size:14px;opacity:0.9;">BÁO CÁO TIẾN ĐỘ HỌC TẬP</div>
    </div>
  </div>

  <!-- Meta -->
  <div style="padding:0 24px 12px;font-size:11px;color:#666;border-bottom:1px solid #eee;display:flex;gap:24px;">
    <span>📅 Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}</span>
    <span>📆 Ngày tham gia: ${stats.joinedAt ? new Date(stats.joinedAt).toLocaleDateString('vi-VN') : 'N/A'}</span>
    <span>🪙 Số dư Coin: ${stats.currentCoinBalance ?? 0} coins</span>
  </div>

  <!-- Chỉ số chính -->
  <div style="padding:12px 24px 4px;">
    <div style="font-size:13px;font-weight:700;color:#444;margin-bottom:8px;">📊 CHỈ SỐ CHÍNH</div>
    <div style="border:1px solid #ddd;border-radius:6px;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead><tr style="background:#7C4DFF;color:#fff;">
          <th style="padding:7px 10px;text-align:left;font-weight:700;">Chỉ số</th>
          <th style="padding:7px 10px;text-align:left;font-weight:700;">Giá trị</th>
          <th style="padding:7px 10px;text-align:left;font-weight:700;">Chi tiết</th>
        </tr></thead>
        <tbody>
          ${bodyRows.map((r, i) => `<tr style="background:${i % 2 === 0 ? '#fff' : '#F8F5FF'};">
            <td style="padding:6px 10px;font-weight:600;">${r[0]}</td>
            <td style="padding:6px 10px;">${r[1]}</td>
            <td style="padding:6px 10px;">${r[2]}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Hoạt động trong tuần -->
  <div style="padding:12px 24px 4px;page-break-inside:avoid;">
    <div style="font-size:13px;font-weight:700;color:#444;margin-bottom:8px;">📈 HOẠT ĐỘNG TRONG TUẦN</div>
    <div style="border:1px solid #ddd;border-radius:6px;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;font-size:11px;">
        <thead><tr style="background:#00E5FF;color:#000;">
          <th style="padding:7px 10px;text-align:left;font-weight:700;">Chỉ số</th>
          <th style="padding:7px 10px;text-align:left;font-weight:700;">Giá trị</th>
        </tr></thead>
        <tbody>
          ${weeklyRows.map((r, i) => `<tr style="background:${i % 2 === 0 ? '#fff' : '#f0f9ff'};">
            <td style="padding:6px 10px;">${r[0]}</td>
            <td style="padding:6px 10px;font-weight:600;">${r[1]}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>
  ${achievementRows.length > 0 ? `
  <!-- Thành tựu -->
  <div style="padding:12px 24px 4px;page-break-inside:avoid;">
    <div style="font-size:13px;font-weight:700;color:#444;margin-bottom:8px;">🏆 THÀNH TỰU</div>
    <div style="border:1px solid #ddd;border-radius:6px;overflow:hidden;">
      <table style="width:100%;border-collapse:collapse;font-size:10px;">
        <thead><tr style="background:#00E5FF;color:#000;">
          <th style="padding:7px 8px;text-align:left;font-weight:700;">Thành tựu</th>
          <th style="padding:7px 8px;text-align:left;font-weight:700;">Mô tả</th>
          <th style="padding:7px 8px;text-align:left;font-weight:700;">Phần thưởng</th>
          <th style="padding:7px 8px;text-align:left;font-weight:700;">Trạng thái</th>
          <th style="padding:7px 8px;text-align:left;font-weight:700;">Ngày mở</th>
        </tr></thead>
        <tbody>
          ${achievementRows.map((r, i) => `<tr style="background:${i % 2 === 0 ? '#fff' : '#f0f9ff'};">
            <td style="padding:6px 8px;font-weight:600;">${r[0]}</td>
            <td style="padding:6px 8px;">${r[1]}</td>
            <td style="padding:6px 8px;">${r[2]}</td>
            <td style="padding:6px 8px;">${r[3]}</td>
            <td style="padding:6px 8px;">${r[4]}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>` : ''}

  <!-- Footer -->
  <div style="padding:12px 24px 0;text-align:center;font-size:9px;color:#aaa;border-top:1px solid #eee;margin-top:12px;">
    KMATE — Báo cáo tiến độ học tập
  </div>
</div>`;

  // Create hidden container
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:800px;z-index:-1;opacity:1;';
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    // A4 in mm: 210 x 297. img ratio 800:container_height_px
    const imgW = pageW;
    const canvasRatio = canvas.width / canvas.height;
    const imgH = pageW / canvasRatio;

    // If content fits in one page
    if (imgH <= pageH) {
      doc.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
    } else {
      // Multi-page: slice image into pages
      const pxPerPage = (pageH / imgH) * canvas.height;
      let srcY = 0;
      let destY = 0;
      while (srcY < canvas.height) {
        const sliceH = Math.min(pxPerPage, canvas.height - srcY);
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext('2d')!;
        ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);
        if (destY > 0) doc.addPage();
        doc.addImage(sliceData, 'JPEG', 0, 0, pageW, pageH);
        srcY += sliceH;
        destY = 0;
      }
    }

    doc.save(`KMATE_BaoCao_${new Date().toISOString().slice(0, 10)}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

function exportExcel(stats: UserStatistics, achievements: UserAchievement[]) {
  // Sheet 1: TongQuan
  const overviewData = [
    ['KMATE — BÁO CÁO TIẾN ĐỘ HỌC TẬP', '', ''],
    ['Ngày xuất báo cáo', new Date().toLocaleDateString('vi-VN'), ''],
    ['Ngày tham gia', stats.joinedAt ? new Date(stats.joinedAt).toLocaleDateString('vi-VN') : 'N/A', ''],
    ['Số dư Coin', stats.currentCoinBalance ?? 0, ''],
    [],
    ['CHỈ SỐ', 'GIÁ TRỊ', 'CHI TIẾT'],
    ['Chuỗi ngày hiện tại', stats.currentStreak, `Kỷ lục: ${stats.longestStreak} ngày`],
    ['Phút học', stats.totalMinutesLearned, `${stats.totalVideosWatched} video đã xem`],
    ['Lượt ôn Flashcard', stats.totalFlashcardReviews, `${stats.totalFlashcards} thẻ đã tạo`],
    ['Bài Quiz đã làm', stats.totalQuizzesTaken, `${stats.totalWordsLookedUp} từ đã tra`],
    ['Từ vựng đã tra', stats.totalWordsLookedUp, ''],
    [],
    ['HOẠT ĐỘNG TRONG TUẦN', '', ''],
    ['Chỉ số', 'Giá trị', ''],
    ['Videos đã xem', stats.totalVideosWatched, ''],
    ['Lượt ôn Flashcard', stats.totalFlashcardReviews, ''],
    ['Phút học', stats.totalMinutesLearned, ''],
    ['Từ đã tra', stats.totalWordsLookedUp, ''],
    ['Quiz đã làm', stats.totalQuizzesTaken, ''],
    ['Chuỗi hiện tại', `${stats.currentStreak} ngày`, ''],
    ['Chuỗi dài nhất', `${stats.longestStreak} ngày`, ''],
  ];

  // Sheet 2: ThanhTuu
  const achievementsData = [
    ['TÊN THÀNH TỰU', 'MÔ TẢ', 'PHẦN THƯỞNG COIN', 'PHẦN THƯỞNG XP', 'TRẠNG THÁI', 'NGÀY MỞ KHÓA'],
    ...achievements.map(a => [
      a.name,
      a.description,
      a.coinReward,
      a.xpReward,
      a.isActive ? 'Đã mở' : 'Chưa mở',
      a.unlockedAt ? new Date(a.unlockedAt).toLocaleDateString('vi-VN') : '-',
    ]),
  ];

  const wb = XLSX.utils.book_new();

  // Overview sheet with column widths
  const ws1 = XLSX.utils.aoa_to_sheet(overviewData);
  ws1['!cols'] = [
    { wch: 30 },
    { wch: 20 },
    { wch: 40 },
  ];

  // Achievements sheet with column widths
  const ws2 = XLSX.utils.aoa_to_sheet(achievementsData);
  ws2['!cols'] = [
    { wch: 25 },
    { wch: 45 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 18 },
  ];

  XLSX.utils.book_append_sheet(wb, ws1, 'Tổng quan');
  XLSX.utils.book_append_sheet(wb, ws2, 'Thành tựu');

  XLSX.writeFile(wb, `KMATE_BaoCao_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

const achievementColumns = [
  {
    title: 'Thành tựu',
    dataIndex: 'name',
    key: 'name',
    render: (text: string, record: UserAchievement, idx: number) => (
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
          style={{
            backgroundColor: ['#00e5ff', '#7c4dff', '#f59e0b', '#22c55e'][idx % 4] + '20',
            color: ['#00e5ff', '#7c4dff', '#f59e0b', '#22c55e'][idx % 4],
          }}
        >
          <StarOutlined />
        </div>
        <span className="font-bold text-white text-sm">{text}</span>
      </div>
    ),
  },
  {
    title: 'Mô tả',
    dataIndex: 'description',
    key: 'description',
    render: (text: string) => <span className="text-slate-400 text-xs">{text}</span>,
  },
  {
    title: 'Phần thưởng',
    key: 'reward',
    render: (_: unknown, record: UserAchievement) => (
      <span className="text-xs text-yellow-400 font-bold">
        {record.coinReward} coins · {record.xpReward} XP
      </span>
    ),
  },
  {
    title: 'Trạng thái',
    dataIndex: 'isActive',
    key: 'isActive',
    render: (active: boolean) => (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${active ? 'bg-green-500/20 text-green-400' : 'bg-slate-700/50 text-slate-400'}`}>
        {active ? 'Đã mở' : 'Chưa mở'}
      </span>
    ),
  },
  {
    title: 'Ngày mở khóa',
    dataIndex: 'unlockedAt',
    key: 'unlockedAt',
    render: (date: string | null) => (
      <span className="text-slate-500 text-xs">
        {date ? new Date(date).toLocaleDateString('vi-VN') : '—'}
      </span>
    ),
  },
];

export default function ReportModal({ open, onClose, stats, achievements }: ReportModalProps) {
  if (!stats) {
    return (
      <Modal
        open={open}
        onCancel={onClose}
        footer={null}
        width={700}
        title={null}
        centered
      >
        <div className="flex justify-center py-10">
          <Spin size="large" />
        </div>
      </Modal>
    );
  }

  const unlockedCount = achievements.filter(a => a.isActive).length;
  const lockedCount = achievements.filter(a => !a.isActive).length;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={760}
      title={null}
      centered
      className="report-modal"
      bodyStyle={{ padding: 0, background: 'transparent' }}
    >
      <div className="bg-[#0B0B15] rounded-2xl overflow-hidden border border-white/10">
        {/* Header */}
        <div
          className="px-8 py-6 flex items-start justify-between"
          style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #00e5ff 100%)' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">K</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">KMATE</h2>
            </div>
            <h3 className="text-white/90 font-bold text-lg">BÁO CÁO TIẾN ĐỘ HỌC TẬP</h3>
            <p className="text-white/70 text-xs mt-1">
              Ngày xuất: {new Date().toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-xs">Ngày tham gia</p>
            <p className="text-white font-bold text-sm">
              {stats.joinedAt ? new Date(stats.joinedAt).toLocaleDateString('vi-VN') : '—'}
            </p>
            <p className="text-white/70 text-xs mt-2">Số dư Coin</p>
            <p className="text-white font-black text-lg">{stats.currentCoinBalance ?? 0} coins</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="px-8 py-6 border-b border-white/5">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Tổng quan</h4>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Streak */}
            <div className="rounded-xl p-4 bg-white/5 border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-2">
                <FireOutlined className="text-cyan-400" />
                <span className="text-slate-400 text-xs font-medium">Chuỗi ngày</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.currentStreak}</p>
              <p className="text-slate-500 text-xs mt-0.5">Kỷ lục: {stats.longestStreak} ngày</p>
            </div>

            {/* Minutes */}
            <div className="rounded-xl p-4 bg-white/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <ThunderboltOutlined className="text-purple-400" />
                <span className="text-slate-400 text-xs font-medium">Phút học</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.totalMinutesLearned}p</p>
              <p className="text-slate-500 text-xs mt-0.5">{stats.totalVideosWatched} video</p>
            </div>

            {/* Flashcards */}
            <div className="rounded-xl p-4 bg-white/5 border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TranslationOutlined className="text-cyan-400" />
                <span className="text-slate-400 text-xs font-medium">Flashcard</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.totalFlashcardReviews}</p>
              <p className="text-slate-500 text-xs mt-0.5">{stats.totalFlashcards} thẻ</p>
            </div>

            {/* Quiz */}
            <div className="rounded-xl p-4 bg-white/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <PlayCircleOutlined className="text-purple-400" />
                <span className="text-slate-400 text-xs font-medium">Quiz</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.totalQuizzesTaken}</p>
              <p className="text-slate-500 text-xs mt-0.5">{stats.totalWordsLookedUp} từ</p>
            </div>
          </div>

          {/* Word lookup bar */}
          <div className="mt-4 flex items-center gap-3">
            <span className="text-slate-400 text-xs font-medium whitespace-nowrap">Từ đã tra</span>
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min((stats.totalWordsLookedUp / 5) * 100, 100)}%`,
                  background: 'linear-gradient(90deg, #00e5ff, #7c4dff)',
                }}
              />
            </div>
            <span className="text-white font-bold text-sm whitespace-nowrap">{stats.totalWordsLookedUp} từ</span>
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="px-8 py-6 border-b border-white/5">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Hoạt động tuần</h4>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Videos', value: stats.totalVideosWatched },
              { label: 'FC Ôn', value: stats.totalFlashcardReviews },
              { label: 'Phút học', value: stats.totalMinutesLearned },
              { label: 'Từ tra', value: stats.totalWordsLookedUp },
              { label: 'Quiz', value: stats.totalQuizzesTaken },
              { label: 'Streak', value: stats.currentStreak },
              { label: 'Kỷ lục', value: stats.longestStreak },
            ].map(item => (
              <div key={item.label} className="text-center p-3 rounded-xl bg-white/5">
                <p className="text-lg font-black text-white">{item.value}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Achievements */}
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Thành tựu</h4>
              <p className="text-slate-400 text-xs mt-0.5">
                {unlockedCount > 0 ? `${unlockedCount} đã mở · ${lockedCount} chưa mở` : 'Chưa có thành tựu nào'}
              </p>
            </div>
            <div className="flex gap-1">
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-500/20 text-green-400">{unlockedCount}</span>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-700/50 text-slate-400">{lockedCount}</span>
            </div>
          </div>

          {achievements.length > 0 ? (
            <Table
              dataSource={achievements}
              columns={achievementColumns}
              rowKey="id"
              size="small"
              pagination={false}
              className="report-achievements-table"
            />
          ) : (
            <div className="text-center py-6 text-slate-500 text-sm">
              Chưa có thành tựu nào. Tiếp tục học để mở khóa!
            </div>
          )}
        </div>

        {/* Footer Export Buttons */}
        <div className="px-8 py-5 flex items-center justify-between bg-white/[0.02] border-t border-white/5">
          <p className="text-slate-600 text-xs">
            Báo cáo được tạo tự động bởi KMATE · {new Date().toLocaleDateString('vi-VN')}
          </p>
          <div className="flex gap-3">
            <Button
              icon={<FileExcelOutlined />}
              onClick={() => exportExcel(stats, achievements)}
              className="!bg-green-600/80 !text-white !border !border-green-600/50 !font-bold !rounded-xl hover:!bg-green-600 !flex !items-center !gap-1.5"
            >
              Xuất Excel
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              type="primary"
              onClick={() => { exportPDF(stats, achievements); }}
              className="!font-bold !rounded-xl !flex !items-center !gap-1.5"
            >
              Xuất PDF
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
