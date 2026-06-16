'use client';

import { useRouter } from 'next/navigation';
import { Modal, Typography, Button } from 'antd';
import { ExclamationCircleFilled } from '@ant-design/icons';

const { Text } = Typography;

interface LowBalanceModalProps {
  open: boolean;
  balance: number;
  onContinue: () => void;
  onBack: () => void;
}

export function LowBalanceModal({ open, balance, onContinue, onBack }: LowBalanceModalProps) {
  return (
    <Modal
      open={open}
      closable={false}
      maskClosable={false}
      footer={null}
      centered
      width={420}
      styles={{
        body: {
          textAlign: 'center',
          padding: '40px 32px 32px',
        },
        content: {
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 16,
        },
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <ExclamationCircleFilled
          style={{ fontSize: 64, color: '#f59e0b' }}
        />
        <Typography.Title
          level={4}
          style={{ color: '#fff', margin: 0 }}
        >
          Số dư thấp
        </Typography.Title>
        <Text style={{ color: '#9ca3af', fontSize: 15, lineHeight: 1.6 }}>
          Bạn chỉ còn <strong style={{ color: '#f59e0b' }}>{balance} coin</strong>.
          <br />
          Mỗi video tốn <strong style={{ color: '#fff' }}>1 coin</strong> để mở khóa.
          <br />
          Bạn có muốn tiếp tục không?
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 8 }}>
          <Button
            type="primary"
            size="large"
            block
            onClick={onContinue}
            style={{
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 15,
              background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)',
              border: 'none',
              height: 48,
            }}
          >
            Tiếp tục xem
          </Button>
          <Button
            ghost
            size="large"
            block
            onClick={onBack}
            style={{
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 15,
              borderColor: 'rgba(255,255,255,0.2)',
              color: '#9ca3af',
              height: 48,
            }}
          >
            Quay lại
          </Button>
        </div>
      </div>
    </Modal>
  );
}
