'use client';

import { useState, useEffect } from 'react';
import {
  WalletOutlined,
  GiftOutlined,
  HistoryOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { Card, Table, Tag, Button, Tabs, Empty, Spin, Modal, Select, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { coinService, paymentService, type CoinBalance, type CoinTransaction, type CoinPackage, type CreatePaymentResponse } from '@/lib/api-services';
import { useAuthStore } from '@/store/auth.store';
import PayOSPaymentModal from '@/components/payment/PayOSPaymentModal';

dayjs.extend(relativeTime);

const COIN_TYPE_COLORS: Record<string, string> = {
  PURCHASE: 'green',
  DAILY_LOGIN: 'cyan',
  ACHIEVEMENT: 'gold',
  REFERRAL_BONUS: 'purple',
  PIONEER_REWARD: 'orange',
  PROMOTION: 'magenta',
  UNLOCK_VIDEO: 'red',
  SUBTITLE_GENERATION: 'volcano',
  REFUND: 'lime',
  ADMIN_GRANT: 'blue',
};

const COIN_TYPE_LABELS: Record<string, string> = {
  PURCHASE: 'Mua coin',
  DAILY_LOGIN: 'Đăng nhập',
  ACHIEVEMENT: 'Thành tựu',
  REFERRAL_BONUS: 'Giới thiệu',
  PIONEER_REWARD: 'Pioneer',
  PROMOTION: 'Khuyến mãi',
  UNLOCK_VIDEO: 'Mở video',
  SUBTITLE_GENERATION: 'Tạo phụ đề',
  REFUND: 'Hoàn tiền',
  ADMIN_GRANT: 'Quản trị cấp',
};

export default function UserWalletPage() {
  const { user, updateCoinBalance } = useAuthStore();
  const [balance, setBalance] = useState<CoinBalance | null>(null);
  const [transactions, setTransactions] = useState<CoinTransaction[]>([]);
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [dailyClaimed, setDailyClaimed] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [txType, setTxType] = useState<string>('');
  const [buyModal, setBuyModal] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<CoinPackage | null>(null);
  const [paymentData, setPaymentData] = useState<CreatePaymentResponse | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentCreating, setPaymentCreating] = useState(false);

  const loadBalance = async () => {
    try {
      const res = await coinService.getBalance();
      setBalance(res.data.data);
    } catch {
      // silent
    }
  };

  const loadTransactions = async (pg = 1) => {
    setTxLoading(true);
    try {
      const res = await coinService.getHistory({ page: pg, limit: 10, type: txType || undefined });
      setTransactions(res.data.data);
      setPage(pg);
      setTotal(res.data.pagination.total);
    } catch {
      message.error('Không tải được lịch sử');
    } finally {
      setTxLoading(false);
    }
  };

  const loadPackages = async () => {
    try {
      const res = await coinService.getPackages();
      setPackages(res.data.data);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    Promise.all([loadBalance(), loadTransactions(), loadPackages()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTransactions(1);
  }, [txType]);

  const handleDailyLogin = async () => {
    setDailyLoading(true);
    try {
      const res = await coinService.dailyLogin();
      const data = res.data.data;
      message.success(data.message);
      setDailyClaimed(true);
      await loadBalance();
      updateCoinBalance(data.newBalance);
      loadTransactions(1);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: { code?: string; message?: string } } } };
      if (e.response?.data?.error?.code === 'ALREADY_CLAIMED') {
        message.info('Bạn đã nhận thưởng hôm nay rồi!');
        setDailyClaimed(true);
      } else {
        message.error('Không thể nhận thưởng. Thử lại sau.');
      }
    } finally {
      setDailyLoading(false);
    }
  };

  const txColumns: ColumnsType<CoinTransaction> = [
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={COIN_TYPE_COLORS[type] || 'default'}>{COIN_TYPE_LABELS[type] || type}</Tag>
      ),
    },
    {
      title: 'Số coin',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <span className={amount >= 0 ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
          {amount >= 0 ? '+' : ''}{amount}
        </span>
      ),
    },
    {
      title: 'Số dư trước',
      dataIndex: 'balanceBefore',
      key: 'balanceBefore',
      render: (v: number) => <span className="text-slate-400">{v}</span>,
    },
    {
      title: 'Số dư sau',
      dataIndex: 'balanceAfter',
      key: 'balanceAfter',
      render: (v: number) => <span className="text-white font-medium">{v}</span>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      render: (d: string | null) => <span className="text-slate-300 text-xs">{d || '—'}</span>,
    },
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (t: string) => (
        <span className="text-slate-400 text-xs">{dayjs(t).format('DD/MM/YYYY HH:mm')}</span>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 space-y-8 bg-gradient-cyber min-h-full">
      {/* Balance Card */}
      <div className="user-glass-card p-8 rounded-3xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-secondary/10 blur-[100px] rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/10 blur-[80px] rounded-full -mb-10 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-secondary/20 border border-secondary/30 flex items-center justify-center">
              <WalletOutlined className="text-4xl text-secondary" />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium mb-1">Số dư ví của bạn</p>
              <h2 className="text-5xl font-black text-white flex items-baseline gap-2">
                {balance?.balance ?? user?.coinBalance ?? 0}
                <span className="text-2xl font-bold text-secondary">Xu</span>
              </h2>
              <p className="text-slate-500 text-xs mt-1">
                Tích luỹ: +{balance?.lifetimeEarnings ?? 0} | Đã tiêu: -{balance?.lifetimeSpent ?? 0}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="primary"
              size="large"
              icon={dailyLoading ? <LoadingOutlined /> : dailyClaimed ? <CheckCircleOutlined /> : <GiftOutlined />}
              onClick={handleDailyLogin}
              loading={dailyLoading}
              disabled={dailyClaimed}
              className="!font-bold !rounded-xl !h-12 !px-6 !border-0"
              style={{
                background: dailyClaimed ? '#22c55e' : 'linear-gradient(135deg, #7C4DFF, #00e5ff)',
                boxShadow: dailyClaimed ? '' : '0 0 15px rgba(124,77,255,0.3)',
              }}
            >
              {dailyClaimed ? 'Đã nhận thưởng hôm nay' : 'Nhận thưởng đăng nhập +5 Xu'}
            </Button>

            <Button
              size="large"
              className="!font-bold !rounded-xl !h-12 !px-6 !border !border-secondary/30 !text-secondary !bg-secondary/10"
              icon={<HistoryOutlined />}
              onClick={() => setBuyModal(true)}
            >
              Mua thêm Xu
            </Button>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="user-glass-card p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <HistoryOutlined className="text-primary" />
            Lịch sử giao dịch
          </h3>
          <Select
            placeholder="Tất cả loại"
            allowClear
            className="!w-40"
            value={txType || undefined}
            onChange={(v) => setTxType(v || '')}
            options={Object.entries(COIN_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
          />
        </div>

        <Table
          columns={txColumns}
          dataSource={transactions}
          rowKey="id"
          loading={txLoading}
          pagination={{
            current: page,
            pageSize: 10,
            total,
            onChange: (p) => loadTransactions(p),
            showSizeChanger: false,
          }}
          locale={{ emptyText: <Empty description="Chưa có giao dịch nào" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          className="kmate-table"
        />
      </div>

      {/* Buy Coins Modal */}
      <Modal
        open={buyModal}
        onCancel={() => setBuyModal(false)}
        footer={null}
        width={640}
        className="kmate-modal"
        styles={{
          content: { background: 'rgba(15,15,21,0)', border: 'none', padding: 0 },
          mask: { backdropFilter: 'blur(4px)', background: 'rgba(0,0,0,0.6)' },
        }}
      >
        {/* Custom dark modal body */}
        <div className="bg-[#0B0B15] rounded-2xl overflow-hidden border border-white/10">
          {/* Gradient header */}
          <div
            className="flex items-center gap-3 px-6 py-4"
            style={{ background: 'linear-gradient(135deg, #7C4DFF 0%, #00e5ff 100%)' }}
          >
            {/* Coin SVG icon */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="13" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" fill="rgba(255,255,255,0.15)" />
              <circle cx="14" cy="14" r="9" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="rgba(255,255,255,0.1)" />
              <text x="14" y="18" textAnchor="middle" fontSize="11" fontWeight="800" fill="white" fontFamily="Inter, sans-serif">XU</text>
            </svg>
            <span className="text-white font-bold text-lg">Mua thêm Xu</span>
          </div>

          {/* Package list */}
          <div className="px-5 py-5 space-y-3 max-h-[420px] overflow-y-auto">
            {packages.length === 0 ? (
              <Empty description="Chưa có gói nào được cấu hình" />
            ) : (
              packages.map((pkg) => {
                const totalCoins = pkg.coinAmount + (pkg.bonusCoinAmount ?? 0);
                return (
                  <div
                    key={pkg.id}
                    onClick={() => setSelectedPkg(pkg)}
                    className={`relative flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 ${
                      selectedPkg?.id === pkg.id
                        ? 'border-2 bg-[rgba(0,229,255,0.06)] shadow-[0_0_20px_rgba(0,229,255,0.18)]'
                        : 'border border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                    } ${
                      selectedPkg?.id === pkg.id ? 'border-[rgba(0,229,255,0.55)]' : 'border-[rgba(255,255,255,0.1)]'
                    }`}
                  >
                    {/* Best Value badge */}
                    {pkg.bonusCoinAmount && pkg.bonusCoinAmount > 0 && (
                      <div className="absolute -top-2.5 left-4">
                        <span
                          className="text-[10px] font-bold px-2.5 py-0.5 rounded-full"
                          style={{ background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)', color: 'white', letterSpacing: '0.03em' }}
                        >
                          BEST VALUE
                        </span>
                      </div>
                    )}

                    {/* Coin icon + amount */}
                    <div className="flex flex-col items-center gap-1 min-w-[72px]">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.3)' }}>
                        <svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="14" cy="14" r="13" stroke="rgba(0,229,255,0.8)" strokeWidth="1.5" fill="rgba(0,229,255,0.15)" />
                          <circle cx="14" cy="14" r="9" stroke="rgba(0,229,255,0.6)" strokeWidth="1" fill="rgba(0,229,255,0.08)" />
                          <text x="14" y="18" textAnchor="middle" fontSize="10" fontWeight="800" fill="#00e5ff" fontFamily="Inter, sans-serif">XU</text>
                        </svg>
                      </div>
                      <p className="text-lg font-black text-[#00e5ff] leading-none">{pkg.coinAmount}</p>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-12 bg-white/10 self-center" />

                    {/* Package info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-base leading-tight">{pkg.name}</p>
                      {pkg.description && (
                        <p className="text-slate-400 text-xs mt-1 leading-relaxed line-clamp-2">{pkg.description}</p>
                      )}
                      {pkg.bonusCoinAmount && pkg.bonusCoinAmount > 0 && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <span className="text-[11px] font-medium text-[#00e5ff] bg-[rgba(0,229,255,0.1)] border border-[rgba(0,229,255,0.25)] rounded-full px-2.5 py-0.5">
                            +{pkg.bonusCoinAmount} Bonus
                          </span>
                          <span className="text-[11px] text-slate-500">→ Tổng: {totalCoins} Xu</span>
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <p className="text-xl font-bold text-white">{pkg.price.toLocaleString()}đ</p>
                      {/* Selected indicator */}
                      {selectedPkg?.id === pkg.id && (
                        <div className="flex items-center justify-end gap-1 mt-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff]" />
                          <span className="text-[11px] text-[#00e5ff] font-medium">Đã chọn</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer bar */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06] bg-white/[0.02]">
            {selectedPkg ? (
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Thanh toán:</span>
                <span className="text-white font-bold text-base">{selectedPkg.price.toLocaleString()}đ</span>
                <span className="text-slate-500 text-sm">·</span>
                <span className="text-[#00e5ff] font-bold text-base">
                  {selectedPkg.coinAmount + (selectedPkg.bonusCoinAmount ?? 0)} Xu
                </span>
              </div>
            ) : (
              <p className="text-slate-500 text-sm italic">Chọn một gói để tiếp tục</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setBuyModal(false)}
                className="px-5 py-2.5 rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white text-sm font-medium border border-white/10 transition-colors"
              >
                Huỷ
              </button>
              <button
                disabled={!selectedPkg || paymentCreating}
                onClick={async () => {
                  if (!selectedPkg) return;
                  setBuyModal(false);
                  setPaymentCreating(true);
                  try {
                    const res = await paymentService.createPayment(selectedPkg.id);
                    setPaymentData(res.data.data);
                    setPaymentModalOpen(true);
                  } catch {
                    message.error('Không thể tạo thanh toán. Vui lòng thử lại.');
                  } finally {
                    setPaymentCreating(false);
                  }
                }}
                className="px-6 py-2.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: selectedPkg
                    ? 'linear-gradient(135deg, #7C4DFF, #00e5ff)'
                    : 'rgba(124,77,255,0.3)',
                  boxShadow: selectedPkg ? '0 4px 20px rgba(124,77,255,0.4)' : 'none',
                }}
              >
                {paymentCreating ? 'Đang xử lý…' : 'Thanh toán ngay'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* PayOS Payment Modal */}
      <PayOSPaymentModal
        open={paymentModalOpen}
        paymentData={paymentData}
        onClose={() => {
          setPaymentModalOpen(false);
          loadBalance();
          loadTransactions(1);
        }}
        onSuccess={(newBalance) => {
          setPaymentModalOpen(false);
          setBalance((prev) => prev ? { ...prev, balance: newBalance } : prev);
          updateCoinBalance(newBalance);
          loadTransactions(1);
        }}
        onCancel={() => setPaymentModalOpen(false)}
      />
    </div>
  );
}
