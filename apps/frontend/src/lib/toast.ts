import { create } from 'zustand';
import { getErrorMessage } from './error-utils';

export type ToastType = 'error' | 'success' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastStore {
  toasts: Toast[];
  add: (message: string, type?: ToastType) => string;
  remove: (id: string) => void;
}

const AUTO_DISMISS_MS = 4000;

const generateId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, type = 'error') => {
    const id = generateId();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), AUTO_DISMISS_MS);
    return id;
  },
  remove: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/**
 * Single source of truth for surfacing toasts across the app.
 * Use `toast.error/success/info` for plain messages, or `toast.fromError`
 * to surface an Error (or unknown thrown value) with a normalized message.
 */
export const toast = {
  error: (msg: string) => useToastStore.getState().add(msg, 'error'),
  success: (msg: string) => useToastStore.getState().add(msg, 'success'),
  info: (msg: string) => useToastStore.getState().add(msg, 'info'),
  /**
   * Surface an Error (or unknown thrown value) as an error toast.
   * The message is normalized via error-utils so callers don't need to
   * handle non-Error throws themselves.
   */
  fromError: (err: unknown, fallback?: string) => {
    const message = getErrorMessage(err, fallback);
    return useToastStore.getState().add(message, 'error');
  },
};

export default toast;