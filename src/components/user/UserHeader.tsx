'use client';

import { Badge, Dropdown, Avatar, Button } from 'antd';
import {
  BellOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { notificationService, coinService } from '@/lib/api-services';
import { useAuthStore } from '@/store/auth.store';
import { useSidebarStore } from '@/store/sidebar.store';
import { useSocket } from '@/lib/socket-provider';

export function UserHeader() {
  const router = useRouter();
  const { user, logout, isAuthenticated, updateCoinBalance } = useAuthStore();
  const { collapsed, toggle } = useSidebarStore();
  const { socket, isConnected } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [coinBalance, setCoinBalance] = useState<number | null>(
    () => user?.coinBalance ?? null
  );

  // Sync coin balance whenever the store user object changes
  useEffect(() => {
    if (user?.coinBalance != null) {
      setCoinBalance(user.coinBalance);
    }
  }, [user?.coinBalance]);

  // Load initial data
  useEffect(() => {
    if (!isAuthenticated) return;

    notificationService.list({ limit: 100 })
      .then((r) => {
        const unread = r.data.data.filter((n: { readAt?: string | null }) => !n.readAt).length;
        setUnreadCount(unread);
      })
      .catch(() => {});

    coinService.getBalance()
      .then((r) => {
        const balance = r.data.data.balance ?? 0;
        setCoinBalance(balance);
        updateCoinBalance(balance);
      })
      .catch(() => {});
  }, [isAuthenticated, updateCoinBalance]);

  // Realtime: listen for new notifications from Socket.IO
  const handleNotificationNew = useCallback((notification: { id: string; type: string; title: string; message: string; data?: unknown }) => {
    console.log('[Socket] notification:new received', notification);
    setUnreadCount((prev) => prev + 1);
  }, []);

  const handleCoinEarned = useCallback((data: { amount: number; newBalance: number }) => {
    console.log('[Socket] coin:earned received', data);
    setCoinBalance(data.newBalance);
    updateCoinBalance(data.newBalance);
  }, [updateCoinBalance]);

  useEffect(() => {
    if (!socket) return;

    socket.on('notification:new', handleNotificationNew);
    socket.on('coin:earned', handleCoinEarned);

    return () => {
      socket.off('notification:new', handleNotificationNew);
      socket.off('coin:earned', handleCoinEarned);
    };
  }, [socket, handleNotificationNew, handleCoinEarned]);

  // Listen for read-count changes dispatched by UserNotificationsPage
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ count: number }>).detail;
      setUnreadCount(detail.count);
    };
    window.addEventListener('notifications:read-changed', handler);
    return () => window.removeEventListener('notifications:read-changed', handler);
  }, []);

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Hồ sơ',
      onClick: () => router.push('/user/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt',
      onClick: () => router.push('/user/settings'),
    },
    {
      key: 'notifications',
      icon: <BellOutlined />,
      label: 'Thông báo',
      onClick: () => router.push('/user/notifications'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
    },
  ];

  const handleUserMenuClick = ({ key }: { key: string }) => {
    if (key === 'logout') {
      logout();
      router.push('/');
    }
  };

  return (
    <header
      className="user-glass-header fixed top-0 right-0 h-16 flex items-center justify-between px-6 z-50"
      style={{ left: collapsed ? '0px' : '0px', transition: 'left 0.3s ease' }}
    >
      <div className="flex items-center gap-6">
        <Button type="text" onClick={toggle} className="!text-white" />
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 bg-secondary/20 px-3 py-1.5 rounded-full border border-secondary/30">
          <DollarOutlined className="text-secondary text-sm" />
          <span className="text-sm font-bold text-slate-100">
            {coinBalance !== null ? coinBalance.toLocaleString() : '—'} Xu
          </span>
        </div>

        <Badge count={unreadCount} size="small" offset={[-2, 2]}>
          <Button
            type="text"
            icon={<BellOutlined />}
            className="!text-white"
            onClick={() => router.push('/user/notifications')}
          />
        </Badge>

        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
          <div className="text-right hidden lg:block">
            <p className="text-xs font-bold text-white leading-none">{user?.name ?? 'User'}</p>
            <p className="text-[10px] text-slate-400">Người học</p>
          </div>

          <Dropdown
            menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
            placement="bottomRight"
            trigger={['click']}
          >
            <div className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1.5 rounded-xl transition-all">
              <div className="size-10 rounded-full border-2 border-primary/50 overflow-hidden p-0.5">
                {user?.avatar ? (
                  <Avatar src={user.avatar} className="w-full h-full" />
                ) : (
                  <Avatar icon={<UserOutlined />} className="!bg-primary-600 w-full h-full" />
                )}
              </div>
            </div>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
