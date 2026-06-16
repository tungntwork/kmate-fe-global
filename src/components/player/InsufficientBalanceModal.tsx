'use client';

import { useRouter } from 'next/navigation';
import { Modal, Typography, Button } from 'antd';
import { DollarCircleFilled } from '@ant-design/icons';

const { Text } = Typography;

interface InsufficientBalanceModalProps {
  open: boolean;
}

export function InsufficientBalanceModal({ open }: InsufficientBalanceModalProps) {
  const router = useRouter();

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
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 16,
        },
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <DollarCircleFilled
          style={{ fontSize: 64, color: '#ef4444' }}
        />
        <Typography.Title
          level={4}
          style={{ color: '#fff', margin: 0 }}
        >
          Số dư không đủ
        </Typography.Title>
        <Text style={{ color: '#9ca3af', fontSize: 15, lineHeight: 1.6 }}>
          Số dư coin của bạn không đủ để trả cho video này.
          <br />
          Vui lòng nạp thêm coin để tiếp tục học.
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 8 }}>
          <Button
            type="primary"
            size="large"
            block
            onClick={() => router.push('/user/wallet')}
            style={{
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 15,
              background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)',
              border: 'none',
              height: 48,
            }}
          >
            Mua coin
          </Button>
          <Button
            ghost
            size="large"
            block
            onClick={() => router.back()}
            style={{
              borderRadius: 10,
              fontWeight: 600,
              fontSize: 15,
              borderColor: 'rgba(255,255,255,0.2)',
              color: '#9ca3af',
              height: 48,
            }}
          >
            Thoát
          </Button>
        </div>
      </div>
    </Modal>
  );
}
