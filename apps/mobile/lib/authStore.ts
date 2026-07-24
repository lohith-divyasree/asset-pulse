// apps/mobile/lib/authStore.ts
import * as SecureStore from 'expo-secure-store';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  allowedPropertyIds: string[];
}

const AUTH_KEY = 'asset_pulse_user_session';

export async function saveUserSession(user: AuthUser) {
  await SecureStore.setItemAsync(AUTH_KEY, JSON.stringify(user));
}

export async function getUserSession(): Promise<AuthUser | null> {
  const data = await SecureStore.getItemAsync(AUTH_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function clearUserSession() {
  await SecureStore.deleteItemAsync(AUTH_KEY);
}