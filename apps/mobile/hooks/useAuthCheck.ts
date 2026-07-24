// apps/mobile/hooks/useAuthCheck.ts
import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { getUserSession, clearUserSession } from '../lib/authStore';
import { API_BASE_URL } from '../lib/constants';

export function useAuthCheck() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    async function verifyUserSession() {
      try {
        const user = await getUserSession();

        // 1. Check if user session exists locally
        if (!user || !user.id) {
          console.log('🔒 No local user session found -> /login');
          router.replace('/login');
          return;
        }

        // 2. Validate session against a known endpoint (/api/categories)
        const res = await fetch(`${API_BASE_URL}/api/categories`, {
          headers: {
            'x-user-id': user.id,
          },
        });

        if (res.status === 401) {
          throw new Error('User session rejected by server (401 Unauthorized)');
        }

        // If categories return 200 (or even 404 if empty), the server accepted the request
      } catch (error) {
        console.warn('❌ Session verification failed:', error);
        await clearUserSession();
        router.replace('/login');
      } finally {
        setIsChecking(false);
      }
    }

    verifyUserSession();
  }, []);

  return { isChecking };
}