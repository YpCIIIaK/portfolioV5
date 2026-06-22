"use client";

import { create } from "zustand";

export interface SessionUser {
  login: string;
  name: string;
  avatar: string;
  owner: boolean;
}

interface SessionState {
  user: SessionUser | null;
  configured: boolean; // is GitHub OAuth set up on the server?
  loaded: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useSession = create<SessionState>((set) => ({
  user: null,
  configured: false,
  loaded: false,
  refresh: async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await res.json()) as { user: SessionUser | null; configured: boolean };
      set({ user: data.user, configured: data.configured, loaded: true });
    } catch {
      set({ user: null, loaded: true });
    }
  },
  logout: async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    set({ user: null });
  },
}));
