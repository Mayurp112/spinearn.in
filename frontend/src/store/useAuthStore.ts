"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface AuthState {
  accessToken: string | null;
  developerId: string | null;
  email: string | null;
  isInitialized: boolean;
  setAuth: (token: string, developerId: string, email: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
  initAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      developerId: null,
      email: null,
      isInitialized: false,
      setAuth: (token, developerId, email) =>
        set({ accessToken: token, developerId, email }),
      clearAuth: () =>
        set({ accessToken: null, developerId: null, email: null, isInitialized: true }),
      isAuthenticated: () => get().accessToken !== null,
      initAuth: async () => {
        if (get().accessToken) {
          set({ isInitialized: true });
          return;
        }
        try {
          const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
            method: "POST",
            credentials: "include",
          });
          if (res.ok) {
            const data = await res.json();
            set({
              accessToken: data.access_token,
              developerId: data.developer_id,
              email: data.email,
              isInitialized: true,
            });
          } else {
            set({ developerId: null, email: null, isInitialized: true });
          }
        } catch {
          set({ isInitialized: true });
        }
      },
    }),
    {
      name: "spinads-auth",
      // accessToken intentionally excluded — never persisted to localStorage
      partialize: (state) => ({
        developerId: state.developerId,
        email: state.email,
      }),
    },
  ),
);
