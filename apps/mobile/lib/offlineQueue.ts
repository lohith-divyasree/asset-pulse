// apps/mobile/lib/offlineQueue.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CreateAssetInput } from '@asset-pulse/core';
import { API_BASE_URL } from './constants'; // 👈 Properly imported here

const QUEUE_KEY = '@asset_pulse_offline_queue';

export interface PendingSurvey {
  id: string;
  payload: CreateAssetInput;
  timestamp: number;
}

export const offlineQueue = {
  async enqueue(payload: CreateAssetInput): Promise<PendingSurvey> {
    const queue = await this.getAll();
    const item: PendingSurvey = {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      payload,
      timestamp: Date.now(),
    };
    queue.push(item);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    return item;
  },

  async getAll(): Promise<PendingSurvey[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  async dequeue(id: string): Promise<void> {
    const queue = await this.getAll();
    const filtered = queue.filter((item) => item.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  },

  // 🔄 Sync items to backend
  async processQueue(): Promise<void> {
    const queue = await this.getAll();
    if (queue.length === 0) return;

    for (const item of queue) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/assets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.payload),
        });

        if (response.ok) {
          await this.dequeue(item.id);
        }
      } catch (err) {
        console.warn(`[Offline Queue] Failed to sync item ${item.id}:`, err);
        break; // Stop loop if device is still offline
      }
    }
  },
};