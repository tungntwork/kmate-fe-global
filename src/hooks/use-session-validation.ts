'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/lib/api-services';

/**
 * After Zustand rehydrates from localStorage, validate the stored token
 * against the backend. If the server restarted and invalidated the session,
 * the validation will fail and we'll clear localStorage + reset auth store.
 *
 * This prevents the user from seeing a "logged-in" UI while their session
 * is actually invalid.
 */
export function useSessionValidation() {
  const { _hasHydrated, isAuthenticated, logout } = useAuthStore();
  const hasValidatedRef = useRef(false);

  useEffect(() => {
    if (!_hasHydrated || hasValidatedRef.current) return;
    if (!isAuthenticated) return; // No token to validate

    hasValidatedRef.current = true;

    authService
      .me()
      .then((res) => {
        const freshUser = res.data.data;
        const { setUser } = useAuthStore.getState();
        setUser(freshUser);
      })
      .catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        logout();
      });
  }, [_hasHydrated, isAuthenticated, logout]);
}
