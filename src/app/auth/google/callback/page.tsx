'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { message } from 'antd';

function GoogleCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens, setUser } = useAuthStore.getState();

  useEffect(() => {
    const accessToken = searchParams.get('accessToken');
    const refreshToken = searchParams.get('refreshToken');
    const error = searchParams.get('error');

    if (error) {
      const errorMessages: Record<string, string> = {
        access_denied: 'Bạn đã từ chối quyền truy cập Google. Vui lòng thử lại.',
        popup_closed: 'Bạn đã đóng cửa sổ đăng nhập Google.',
        google_auth_failed: 'Xác thực Google thất bại. Vui lòng thử lại.',
        disallowed_useragent: 'Trình duyệt không được hỗ trợ. Vui lòng sử dụng trình duyệt thông thường.',
      };
      message.error(errorMessages[error] || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
      router.replace('/login');
      return;
    }

    if (!accessToken || !refreshToken) {
      message.error('Dữ liệu đăng nhập không hợp lệ.');
      router.replace('/login');
      return;
    }

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setTokens(accessToken, refreshToken);

    // Fetch user info and store in auth state
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((res) => {
        let userData: Record<string, unknown> | null = null;

        if (res?.success && res?.data) {
          userData = res.data;
          setUser({
            id: userData!.id as string,
            email: userData!.email as string,
            name: userData!.name as string | null,
            avatar: userData!.avatar as string | null,
            role: userData!.role as string,
            coinBalance: userData!.coinBalance as number,
            streak: userData!.streak as number ?? 0,
            isNewUser: userData!.isNewUser as boolean,
          });
        }

        const dashboardPath =
          userData?.role === 'ADMIN' || userData?.role === 'MODERATOR'
            ? '/admin/dashboard'
            : '/user/dashboard';
        router.replace(dashboardPath);
      })
      .catch(() => {
        message.error('Không thể lấy thông tin tài khoản.');
        router.replace('/login');
      });
  }, [router, searchParams, setTokens, setUser]);

  return null;
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background-dark">
          <div className="text-white text-lg">Đang xử lý đăng nhập...</div>
        </div>
      }
    >
      <GoogleCallbackInner />
    </Suspense>
  );
}
