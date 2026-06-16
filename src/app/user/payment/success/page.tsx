'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Result, Spin, Button, Card, Typography, Descriptions } from "antd";
import { App } from 'antd';
import {
  CheckCircleOutlined,
  HomeOutlined,
  WalletOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { paymentService, coinService } from '@/lib/api-services';
import { useAuthStore } from '@/store/auth.store';

const { Title, Text } = Typography;

function PaymentSuccessContent() {
  const { message } = App.useApp();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { updateCoinBalance } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [coinAmount, setCoinAmount] = useState<number | null>(null);
  const [newBalance, setNewBalance] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('PENDING');
  const [pollCount, setPollCount] = useState(0);

  const paymentId = searchParams.get('paymentId');

  useEffect(() => {
    if (!paymentId) {
      message.error('Không tìm thấy thông tin thanh toán');
      router.replace('/user/wallet');
      return;
    }

    const confirm = async () => {
      setLoading(true);
      try {
        const res = await paymentService.confirmPayment(paymentId);
        const data = res.data.data;
        setPaymentStatus(data.paymentStatus);
        setCoinAmount(data.coinAmount);
        if (data.newBalance !== undefined) setNewBalance(data.newBalance);
        setConfirmed(data.success);

        if (data.success) {
          updateCoinBalance(data.newBalance ?? data.coinAmount);
          message.success(`Bạn đã nhận được ${data.coinAmount} coins!`);
        }
      } catch (err: any) {
        message.error('Không thể xác nhận thanh toán: ' + (err?.message || 'Lỗi không xác định'));
      } finally {
        setLoading(false);
      }
    };

    confirm();
  }, [paymentId]);

  // Poll if payment still pending
  useEffect(() => {
    if (!paymentId || confirmed || loading) return;
    if (pollCount >= 12) return; // max 1 minute

    const interval = setInterval(async () => {
      try {
        const res = await paymentService.getPaymentStatus(paymentId);
        const status = res.data.data.status;
        setPaymentStatus(status);
        if (status === 'SUCCESS') {
          setConfirmed(true);
          const coinRes = await coinService.getBalance();
          const bal = coinRes.data.data.balance;
          setNewBalance(bal);
          updateCoinBalance(bal);
          setCoinAmount(res.data.data.coinAmount);
          message.success('Thanh toán đã được xác nhận!');
          clearInterval(interval);
        }
      } catch {
        // silent
      }
      setPollCount((c) => c + 1);
    }, 5000);

    return () => clearInterval(interval);
  }, [paymentId, confirmed, loading, pollCount]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spin size="large" />
        <Text className="text-slate-400">Đang xác nhận thanh toán...</Text>
      </div>
    );
  }

  if (confirmed || paymentStatus === 'SUCCESS') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
        <Card
          className="user-glass-card !rounded-3xl !max-w-lg !w-full"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <Result
            icon={<CheckCircleOutlined style={{ color: '#22c55e', fontSize: 72 }} />}
            title={<Title level={3} className="!text-white !mb-0">Thanh toán thành công!</Title>}
            subTitle={
              <Text className="text-slate-300">
                Bạn đã nhận được <span className="text-secondary font-black text-xl">{coinAmount} coins</span>
              </Text>
            }
            extra={
              <div className="w-full space-y-3 mt-4">
                <Descriptions
                  column={1}
                  size="small"
                  className="text-white"
                  labelStyle={{ color: '#94a3b8' }}
                  contentStyle={{ color: '#fff', fontWeight: 600, textAlign: 'right' }}
                >
                  <Descriptions.Item label="Số dư mới">
                    <Text className="text-secondary font-black text-base">{newBalance?.toLocaleString()} Xu</Text>
                  </Descriptions.Item>
                </Descriptions>
                <Button
                  type="primary"
                  size="large"
                  icon={<WalletOutlined />}
                  block
                  onClick={() => router.push('/user/wallet')}
                  className="!font-bold !rounded-xl !h-12"
                  style={{ background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)' }}
                >
                  Xem ví của tôi
                </Button>
                <Button
                  size="large"
                  icon={<HomeOutlined />}
                  block
                  onClick={() => router.push('/user/explore')}
                  className="!font-bold !rounded-xl !h-12 !border !border-white/20 !text-white"
                >
                  Khám phá ngay
                </Button>
              </div>
            }
          />
        </Card>
      </div>
    );
  }

  // Still pending
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
      <Card
        className="user-glass-card !rounded-3xl !max-w-lg !w-full"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <Result
          icon={<Spin size="large" />}
          title={<Title level={3} className="!text-white !mb-0">Đang xử lý thanh toán...</Title>}
          subTitle={
            <Text className="text-slate-300">
              Chúng tôi đang chờ xác nhận từ PayOS. Vui lòng đợi trong giây lát.
              <br />
              <span className="text-slate-500 text-xs">
                (Trang sẽ tự động cập nhật trong vài giây)
              </span>
            </Text>
          }
          extra={
            <div className="w-full space-y-3 mt-4">
              <Button
                size="large"
                icon={<ReloadOutlined />}
                block
                onClick={() => window.location.reload()}
                className="!font-bold !rounded-xl !h-12 !border !border-white/20 !text-white"
              >
                Làm mới trang
              </Button>
              <Button
                size="large"
                icon={<WalletOutlined />}
                block
                onClick={() => router.push('/user/wallet')}
                className="!font-bold !rounded-xl !h-12 !border !border-white/20 !text-white"
              >
                Quay về ví
              </Button>
            </div>
          }
        />
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  const { message } = App.useApp();
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spin size="large" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
