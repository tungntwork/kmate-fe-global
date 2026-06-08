'use client';

import { Modal, Button } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmModal({
  title = 'Xác nhận',
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal
      open
      title={
        <span className="flex items-center gap-2 text-white">
          <ExclamationCircleOutlined className={danger ? 'text-red-400' : 'text-yellow-400'} />
          {title}
        </span>
      }
      onCancel={onCancel}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={onCancel}>{cancelText}</Button>
          <Button
            type="primary"
            danger={danger}
            onClick={onConfirm}
            className={danger ? '' : '!bg-primary-500 !border-primary-500'}
          >
            {confirmText}
          </Button>
        </div>
      }
      className="kmate-confirm-modal"
      centered
      styles={{
        mask: { backgroundColor: 'rgba(0, 0, 0, 0.6)' },
        content: { background: '#151c2a', border: '1px solid rgba(255,255,255,0.1)' },
        header: { background: '#151c2a', borderBottom: '1px solid rgba(255,255,255,0.1)' },
        body: { background: '#151c2a' },
      }}
    >
      <p className="text-gray-300">{message}</p>
    </Modal>
  );
}

// Ant Design confirm() wrapper
ConfirmModal.confirm = (props: ConfirmModalProps) => {
  Modal.confirm({
    title: (
      <span className="flex items-center gap-2">
        <ExclamationCircleOutlined className={props.danger ? 'text-red-400' : 'text-yellow-400'} />
        {props.title ?? 'Xác nhận'}
      </span>
    ),
    content: <p className="text-gray-300">{props.message}</p>,
    okText: props.confirmText ?? 'Xác nhận',
    cancelText: props.cancelText ?? 'Hủy',
    okButtonProps: { danger: props.danger, className: props.danger ? '' : '!bg-primary-500 !border-primary-500' },
    onOk: props.onConfirm,
    onCancel: props.onCancel,
    centered: true,
  });
};
