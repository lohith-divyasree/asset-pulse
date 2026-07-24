import { useEffect, ReactNode } from 'react';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { api } from '@/services/api';

export function AxiosInterceptor({ children }: { children: ReactNode }) {
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        // Intercept 401 Unauthorized globally
        if (error.response && error.response.status === 401) {
          await SecureStore.deleteItemAsync('token'); // Wipe local token
          router.replace('/login');                   // Redirect to Login screen
        }
        return Promise.reject(error);
      }
    );

    // Clean up interceptor on unmount
    return () => api.interceptors.response.eject(interceptor);
  }, []);

  return <>{children}</>;
}