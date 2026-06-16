'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import {
  DashboardOutlined,
  TeamOutlined,
  DollarOutlined,
  RobotOutlined,
  TrophyOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  MailOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { Layout, Spin, Tooltip, Dropdown, Avatar } from 'antd';
import { useAuthStore } from '@/store/auth.store';
import { useSidebarStore } from '@/store/sidebar.store';
import imgKMATELOGO from '../../../assets/img/branding/KMATELOGO.png';

const { Sider } = Layout;

const adminNavItems = [
  { key: '/admin/dashboard', icon: <DashboardOutlined />, label: 'Tổng quan', href: '/admin/dashboard' },
  { key: '/admin/users', icon: <TeamOutlined />, label: 'Người dùng', href: '/admin/users' },
  { key: '/admin/payments', icon: <DollarOutlined />, label: 'Thanh toán', href: '/admin/payments' },
  { key: '/admin/ai-queue', icon: <RobotOutlined />, label: 'AI Queue', href: '/admin/ai-queue' },
  { key: '/admin/achievements', icon: <TrophyOutlined />, label: 'Thành tựu', href: '/admin/achievements' },
  { key: '/admin/packages', icon: <ShoppingOutlined />, label: 'Gói Coin', href: '/admin/packages' },
  { key: '/admin/logs', icon: <FileTextOutlined />, label: 'Nhật ký', href: '/admin/logs' },
  { key: '/admin/reports', icon: <MailOutlined />, label: 'Báo cáo', href: '/admin/reports' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();
  const { collapsed, toggle } = useSidebarStore();

  const userMenuItems = [
    {
      key: 'name',
      label: <span className="text-slate-300 text-xs">{user?.email}</span>,
      disabled: true,
    },
    { type: 'divider' as const },
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
    { type: 'divider' as const },
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
      router.push('/login');
    }
  };

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role !== 'ADMIN' && user?.role !== 'MODERATOR') {
      router.push('/user/dashboard');
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  const activeKey = adminNavItems.find((item) => pathname.startsWith(item.key))?.key ?? '/admin/dashboard';

  if (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'MODERATOR')) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] flex items-center justify-center">
        <div className="text-white">Đang chuyển hướng...</div>
      </div>
    );
  }

  const siderWidth = collapsed ? 72 : 240;

  return (
    <div className="flex min-h-screen bg-[#0B0B0F]">
      {/* Admin Sidebar */}
      <Sider
        width={siderWidth}
        collapsedWidth={72}
        collapsed={collapsed}
        className="!bg-[#111827] border-r border-white/5 !flex-shrink-0 transition-all duration-300"
        style={{ position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50 }}
      >
        {/* Logo */}
        <div className="h-16 flex items-center border-b border-white/5 px-4">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            {collapsed ? (
              <img
                src="/favicon.ico"
                alt="K-MATE"
                className="w-7 h-7 object-contain mx-auto rounded"
              />
            ) : (
              <>
                <Image src={imgKMATELOGO} alt="K-MATE" width={110} height={28} className="object-contain" style={{ width: 'auto' }} />
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  ADMIN
                </span>
              </>
            )}
          </Link>
        </div>

        {/* Nav */}
        <nav className="p-2 flex flex-col gap-1" style={{ height: 'calc(100vh - 64px - 72px)' }}>
          {adminNavItems.map((item) => {
            const isActive = activeKey === item.key;
            const navButton = (
              <div
                key={item.key}
                onClick={() => router.push(item.href)}
                className={`flex items-center gap-3 rounded-xl cursor-pointer transition-all text-sm font-medium ${
                  collapsed ? 'justify-center px-0 py-3 min-h-[44px]' : 'px-4 py-3'
                } ${
                  isActive
                    ? 'bg-primary/20 text-primary border border-primary/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>
            );

            if (collapsed) {
              return (
                <Tooltip key={item.key} title={item.label} placement="right">
                  {navButton}
                </Tooltip>
              );
            }
            return navButton;
          })}
        </nav>

        {/* Footer — Toggle */}
        <div className="p-2 border-t border-white/5 flex-shrink-0">
          <Tooltip title={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'} placement="right">
            <div
              onClick={toggle}
              className={`flex items-center gap-3 rounded-xl cursor-pointer transition-all text-sm font-medium ${
                collapsed ? 'justify-center px-0 py-3 min-h-[44px]' : 'px-4 py-3'
              } text-slate-400 hover:bg-white/5 hover:text-white`}
            >
              <span style={{ fontSize: 16, flexShrink: 0 }}>
                {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              </span>
              {!collapsed && <span>Thu gọn sidebar</span>}
            </div>
          </Tooltip>

          {/* User info when expanded */}
          {!collapsed && (
            <div className="flex items-center gap-3 px-4 py-3 mt-1">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-slate-300 text-xs font-medium truncate">{user?.name || 'Admin'}</p>
                <p className="text-slate-500 text-xs truncate">{user?.email}</p>
              </div>
            </div>
          )}
        </div>
      </Sider>

      {/* Main content */}
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: siderWidth }}
      >
        {/* Admin Header */}
        <header className="h-16 border-b border-white/5 bg-[#111827] px-8 flex items-center justify-between sticky top-0 z-40 flex-shrink-0">
          <h1 className="text-white font-bold text-lg capitalize">
            {adminNavItems.find((item) => activeKey === item.key)?.label || 'Admin'}
          </h1>

          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-white leading-none">{user?.name || 'Admin'}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role?.toLowerCase() === 'admin' ? 'Quản trị viên' : 'Người kiểm duyệt'}</p>
            </div>

            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenuClick }}
              placement="bottomRight"
              trigger={['click']}
            >
              <div className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1.5 rounded-xl transition-all">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold overflow-hidden border border-primary/20">
                  {user?.avatar ? (
                    <Avatar src={user.avatar} className="w-full h-full" />
                  ) : (
                    <span>{user?.name?.[0]?.toUpperCase() || 'A'}</span>
                  )}
                </div>
              </div>
            </Dropdown>
          </div>
        </header>

        {/* Page content */}
        <main className="p-8 flex-1">{children}</main>
      </div>
    </div>
  );
}
