'use client';

import { useCallback } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (opts: {
            client_id: string;
            callback: (res: { credential?: string; clientId?: string }) => void;
          }) => void;
          prompt: (notification?: number) => void;
        };
      };
    };
  }
}

export function useGoogleAuth() {
  const promptGoogle = useCallback((onCredential: (idToken: string) => void) => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

    if (!clientId) {
      return;
    }

    if (!window.google?.accounts?.id) {
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (response.credential) {
          onCredential(response.credential);
        }
      },
    });

    window.google.accounts.id.prompt();
  }, []);

  return { promptGoogle };
}
