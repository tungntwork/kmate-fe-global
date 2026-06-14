'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Result, Spin, Button, Card, Typography, message } from 'antd';
import {
  CloseCircleOutlined,
  WalletOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import { paymentService } from '@/lib/api-services';

const { Title, Text } = Typography;

export default function PaymentCancelPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const paymentId = searchParams.get('paymentId');

  useEffect(() => {
    if (!paymentId) {
      router.replace('/user/wallet');
      return;
    }

    const cancel = async () => {
      try {
        await paymentService.cancelPayment(paymentId);
      } catch {
        // Payment might already be cancelled or not found — that's ok
      } finally {
        setLoading(false);
      }
    };

    cancel();
  }, [paymentId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Spin size="large" />
        <Text className="text-slate-400">Đang xử lý...</Text>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] p-6">
      <Card
        className="user-glass-card !rounded-3xl !max-w-lg !w-full"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <Result
          icon={<CloseCircleOutlined style={{ color: '#f87171', fontSize: 72 }} />}
          title={<Title level={3} className="!text-white !mb-0">Thanh toán đã bị hủy</Title>}
          subTitle={
            <Text className="text-slate-300">
              Đơn hàng của bạn đã bị hủy. Coins sẽ không được cộng vào tài khoản.
            </Text>
          }
          extra={
            <div className="w-full space-y-3 mt-4">
              <Button
                type="primary"
                size="large"
                icon={<WalletOutlined />}
                block
                onClick={() => router.push('/user/wallet')}
                className="!font-bold !rounded-xl !h-12"
                style={{ background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)' }}
              >
                Quay về ví
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
