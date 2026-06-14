'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import {
  Modal,
  Button,
  Spin,
  message,
  Typography,
  Alert,
} from 'antd';
import {
  QrcodeOutlined,
  LinkOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  CopyOutlined,
  BankOutlined,
} from '@ant-design/icons';
import { paymentService, type CreatePaymentResponse } from '@/lib/api-services';

const { Text } = Typography;

interface PayOSPaymentModalProps {
  open: boolean;
  paymentData: CreatePaymentResponse | null;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
  onCancel: () => void;
}

export default function PayOSPaymentModal({
  open,
  paymentData,
  onClose,
  onSuccess,
  onCancel,
}: PayOSPaymentModalProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [autoConfirmLoading, setAutoConfirmLoading] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!open || !paymentData?.expiresAt) {
      setTimeLeft(null);
      return;
    }
    const expiresAt = new Date(paymentData.expiresAt).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [open, paymentData?.expiresAt]);

  // Auto-poll payment status every 5s while modal is open
  useEffect(() => {
    if (!open || !paymentData?.paymentId || paymentStatus === 'SUCCESS') return;
    const poll = async () => {
      try {
        const res = await paymentService.getPaymentStatus(paymentData.paymentId);
        const status = res.data.data.status;
        setPaymentStatus(status);
        if (status === 'SUCCESS') {
          setAutoConfirmLoading(true);
          try {
            const confirmRes = await paymentService.confirmPayment(paymentData.paymentId);
            if (confirmRes.data.data.success) {
              onSuccess(confirmRes.data.data.newBalance ?? 0);
            }
          } catch {
            // Webhook may have already topped up — that's fine
          }
          setAutoConfirmLoading(false);
        }
      } catch {
        // silent
      }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [open, paymentData?.paymentId, paymentStatus, onSuccess]);

  const handleOpenCheckout = useCallback(() => {
    if (paymentData?.checkoutUrl) {
      window.open(paymentData.checkoutUrl, '_blank');
    }
  }, [paymentData?.checkoutUrl]);

  const handleCancel = async () => {
    if (!paymentData?.paymentId) return;
    try {
      await paymentService.cancelPayment(paymentData.paymentId);
      onCancel();
    } catch {
      message.error('Không thể hủy thanh toán. Thử lại.');
    }
  };

  const handleCopyOrderCode = () => {
    if (!paymentData?.orderCode) return;
    navigator.clipboard.writeText(paymentData.orderCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  if (!paymentData) return null;

  const { orderCode, checkoutUrl, qrCode, accountNumber, accountName, amount, coinAmount } =
    paymentData;

  const isExpired = timeLeft === 0;
  const isSuccess = paymentStatus === 'SUCCESS' || autoConfirmLoading;
  const isPending = !isSuccess && !isExpired;

  return (
    <Modal
      open={open}
      onCancel={isSuccess || isExpired ? onClose : onCancel}
      footer={null}
      width={780}
      centered
      destroyOnHidden
      className="kmate-modal"
      styles={{
        body: { padding: 0 },
        content: { background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20 },
        header: { background: 'rgba(15,23,42,1)', borderBottom: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px 20px 0 0', padding: '16px 24px' },
      }}
      title={
        <div className="flex items-center gap-2">
          <BankOutlined className="text-secondary text-lg" />
          <span className="text-white font-bold text-lg">Thanh toán PayOS</span>
          {timeLeft !== null && (
            <span className="ml-auto flex items-center gap-1 text-xs font-mono">
              <ClockCircleOutlined className={timeLeft < 60 ? 'text-red-400' : 'text-slate-400'} />
              <span className={timeLeft < 60 ? 'text-red-400' : 'text-slate-400'}>
                Hết hạn {formatTime(timeLeft)}
              </span>
            </span>
          )}
        </div>
      }
    >
      <Spin spinning={autoConfirmLoading} tip="Đang xác nhận thanh toán...">
        <div className="p-6">

          {isExpired && (
            <Alert
              type="error"
              message="Đơn hàng đã hết hạn. Vui lòng tạo đơn mới."
              showIcon
              className="mb-4"
            />
          )}

          {isSuccess && (
            <Alert
              type="success"
              message={
                <span className="text-white">
                  Thanh toán thành công! Bạn đã nhận được{' '}
                  <strong className="text-secondary">{coinAmount} coins</strong>.
                </span>
              }
              icon={<CheckCircleOutlined className="text-green-400" />}
              showIcon
              className="mb-4"
            />
          )}

          {isPending && (
            <>
              {/* ======= MAIN LAYOUT: QR left | Info right ======= */}
              <div className="flex gap-6 items-start">

                {/* ---- LEFT: QR Code ---- */}
                <div className="flex flex-col items-center gap-3 bg-white rounded-2xl p-5 min-w-[260px]" style={{ minWidth: 260 }}>
                  <Text className="text-slate-600 text-sm font-semibold">
                    Quét mã QR để thanh toán
                  </Text>

                  {qrCode ? (
                    <div className="relative w-48 h-48">
                      <Image
                        src={qrCode}
                        alt="PayOS QR Code"
                        fill
                        className="rounded-xl"
                        style={{ objectFit: 'contain' }}
                        unoptimized
                        sizes="192px"
                      />
                    </div>
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center bg-slate-100 rounded-xl">
                      <Text className="text-slate-400 text-xs text-center px-4">
                        Không có mã QR
                        <br />
                        Sử dụng nút bên dưới
                      </Text>
                    </div>
                  )}

                  {accountNumber && (
                    <div className="w-full text-center">
                      <Text className="text-slate-500 text-xs">STK</Text>
                      <div className="flex items-center justify-center gap-1">
                        <Text className="text-slate-800 font-bold font-mono text-sm">{accountNumber}</Text>
                        <Button
                          type="text"
                          size="small"
                          icon={<CopyOutlined />}
                          onClick={() => { navigator.clipboard.writeText(accountNumber); message.success('Đã chép STK!'); }}
                          className="text-slate-400"
                        />
                      </div>
                      {accountName && (
                        <Text className="text-slate-500 text-xs block mt-0.5">{accountName}</Text>
                      )}
                    </div>
                  )}

                  {checkoutUrl && (
                    <Button
                      type="primary"
                      size="middle"
                      icon={<LinkOutlined />}
                      onClick={handleOpenCheckout}
                      className="!font-bold !rounded-xl !w-full"
                      style={{ background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)' }}
                    >
                      Mở cổng PayOS
                    </Button>
                  )}
                </div>

                {/* ---- RIGHT: Payment details ---- */}
                <div className="flex-1 flex flex-col gap-4">

                  {/* Order code card */}
                  <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                    <Text className="text-slate-400 text-xs">Mã đơn hàng (nội dung CK)</Text>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Text className="text-white font-mono font-bold text-base tracking-widest">{orderCode}</Text>
                      <Button
                        type="text"
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={handleCopyOrderCode}
                        className="text-slate-400 hover:!text-white"
                      >
                        {copied ? 'Đã chép!' : ''}
                      </Button>
                    </div>
                  </div>

                  {/* Amount card */}
                  <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10 flex items-center justify-between">
                    <div>
                      <Text className="text-slate-400 text-xs">Số tiền thanh toán</Text>
                      <div className="text-white font-black text-2xl leading-tight">
                        {amount.toLocaleString()} <span className="text-base font-normal text-slate-400">đ</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Text className="text-slate-400 text-xs">Nhận được</Text>
                      <div className="text-secondary font-black text-2xl leading-tight">
                        {coinAmount.toLocaleString()} <span className="text-base font-normal text-slate-400">Xu</span>
                      </div>
                    </div>
                  </div>

                  {/* Manual transfer guide */}
                  {accountNumber && (
                    <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10 space-y-2">
                      <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        Hướng dẫn chuyển khoản
                      </Text>
                      <div className="space-y-1.5">
                        <div className="flex justify-between">
                          <Text className="text-slate-400 text-xs">1. Ngân hàng</Text>
                          <Text className="text-white text-xs font-semibold">Ngân hàng được hỗ trợ</Text>
                        </div>
                        <div className="flex justify-between">
                          <Text className="text-slate-400 text-xs">2. Số tài khoản</Text>
                          <Text className="text-white text-xs font-mono font-bold">{accountNumber}</Text>
                        </div>
                        <div className="flex justify-between">
                          <Text className="text-slate-400 text-xs">3. Nội dung CK</Text>
                          <Text className="text-secondary text-xs font-mono font-bold">{orderCode}</Text>
                        </div>
                        <div className="flex justify-between">
                          <Text className="text-slate-400 text-xs">4. Đúng số tiền</Text>
                          <Text className="text-white text-xs font-semibold">{amount.toLocaleString()} đ</Text>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 mt-2">
                    <Button
                      size="large"
                      block
                      onClick={handleCancel}
                      icon={<CloseCircleOutlined />}
                      className="!font-bold !rounded-xl !h-12 !border !border-red-500/30 !text-red-400 hover:!border-red-400 hover:!text-red-300"
                    >
                      Hủy thanh toán
                    </Button>
                    {checkoutUrl && (
                      <Button
                        type="primary"
                        size="large"
                        block
                        icon={<QrcodeOutlined />}
                        onClick={handleOpenCheckout}
                        className="!font-bold !rounded-xl !h-12"
                        style={{ background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)' }}
                      >
                        Thanh toán ngay
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer note */}
              <Text className="text-slate-600 text-xs block text-center mt-4">
                Sau khi thanh toán thành công, coins sẽ được cộng vào tài khoản trong vài giây.
                Đơn hàng có hiệu lực trong 30 phút.
              </Text>
            </>
          )}

          {isSuccess && (
            <div className="flex gap-3 mt-4">
              <Button
                type="primary"
                size="large"
                block
                onClick={onClose}
                className="!font-bold !rounded-xl !h-12"
                style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
              >
                Xem ví của tôi
              </Button>
              <Button
                size="large"
                block
                onClick={() => window.location.href = '/user/explore'}
                className="!font-bold !rounded-xl !h-12 !border !border-white/20 !text-white"
              >
                Khám phá ngay
              </Button>
            </div>
          )}

          {isExpired && (
            <div className="mt-4">
              <Button
                size="large"
                block
                onClick={onClose}
                className="!font-bold !rounded-xl !h-12 !border !border-white/20 !text-white"
              >
                Đóng
              </Button>
            </div>
          )}

        </div>
      </Spin>
    </Modal>
  );
}
