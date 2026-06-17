'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button, Dropdown, Avatar } from 'antd';
import { useAuthStore } from '@/store/auth.store';
import imgKMATELOGO from '../../../assets/img/branding/KMATELOGO.png';
import { useRouter } from 'next/navigation';

export function PublicHeader() {
  const { isAuthenticated, user, _hasHydrated, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    logout();
    router.push('/login');
  };

  const userMenuItems = [
    {
      key: 'dashboard',
      label: (
        <Link href="/user/dashboard" className="!text-white !no-underline hover:!text-[#00e5ff] transition-colors">
          Dashboard
        </Link>
      ),
    },
    {
      key: 'explore',
      label: (
        <Link href="/user/explore" className="!text-white !no-underline hover:!text-[#00e5ff] transition-colors">
          Khám phá
        </Link>
      ),
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      label: (
        <span className="!text-red-400 hover:!text-red-300 transition-colors cursor-pointer">
          Đăng Xuất
        </span>
      ),
      onClick: handleLogout,
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div
          className="rounded-2xl px-4 md:px-6 py-3 flex items-center justify-between"
          style={{
            background: 'rgba(11, 11, 15, 0.7)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(124, 77, 255, 0.2)',
          }}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src={imgKMATELOGO}
              alt="K-MATE Logo"
              width={120}
              height={30}
              className="h-[30px] w-auto object-contain"
              style={{ width: 'auto' }}
            />
          </Link>

          {/* Auth actions */}
          <div className="flex items-center gap-3">
            {!_hasHydrated ? null : isAuthenticated && user ? (
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                trigger={['click']}
                overlayClassName="auth-dropdown"
              >
                <button className="flex items-center gap-2.5 hover:opacity-80 transition-opacity cursor-pointer bg-transparent border-none outline-none p-0">
                  <Avatar
                    src={user.avatar}
                    size={36}
                    className="!bg-gradient-to-br !from-[#7C4DFF] !to-[#00e5ff]"
                  >
                    {!user.avatar && user.name ? user.name[0] : null}
                  </Avatar>
                  <span className="hidden md:block text-white font-medium text-sm">{user.name}</span>
                </button>
              </Dropdown>
            ) : (
              <>
                <Link href="/login">
                  <Button
                    type="text"
                    className="!text-white/70 !font-semibold !text-sm !px-3 !h-9 !rounded-xl hover:!text-white hover:!bg-white/5 transition-all"
                  >
                    Đăng Nhập
                  </Button>
                </Link>
                <Link href="/register">
                  <Button
                    className="!font-bold !text-sm !h-9 !px-5 !rounded-xl !border-0 !text-background-dark !transition-all !duration-200 hover:!scale-[1.02] active:!scale-[0.98]"
                    style={{
                      background: 'linear-gradient(135deg, #7C4DFF, #00e5ff)',
                      boxShadow: '0 0 12px rgba(124,77,255,0.3)',
                    }}
                  >
                    Đăng Ký
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
