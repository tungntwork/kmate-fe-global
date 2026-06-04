'use client';

import { Suspense, useEffect } from 'react';
import { Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { UserSidebar } from '@/components/user/UserSidebar';
import { UserHeader } from '@/components/user/UserHeader';
import { useSidebarStore } from '@/store/sidebar.store';
import { useAuthStore } from '@/store/auth.store';

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { collapsed } = useSidebarStore();
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const sidebarWidth = collapsed ? 80 : 260;

  // Auth guard
  useEffect(() => {
    if (!_hasHydrated) return;
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [_hasHydrated, isAuthenticated, router]);

  if (!_hasHydrated) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-dark">
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-background-dark">
      <UserSidebar />

      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
        <UserHeader />

        <main className="flex-1 overflow-y-auto">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading...</div>}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
}
