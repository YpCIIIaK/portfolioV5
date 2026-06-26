import { create } from "zustand";
import { DEFAULT_OPEN, allFiles } from "./files";
import { NON_META } from "./achievements";

export type ActivityView = "explorer" | "search" | "git" | "extensions" | "run";

const LIVE_IDS = allFiles.filter((f) => f.id.startsWith("live/")).map((f) => f.id);
const ACH_KEY = "portfolio-achievements";

function loadAch(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(ACH_KEY) ?? "{}");
  } catch {
    return {};
  }
}

interface EditorState {
  openTabs: string[];
  activeFile: string | null;
  activityView: ActivityView;
  sidebarOpen: boolean;
  terminalOpen: boolean;
  paletteOpen: boolean;
  tourOpen: boolean;
  chatOpen: boolean;
  minimapOpen: boolean;

  // live, user-editable settings (driven by .vscode/settings.json)
  theme: string;
  fontSize: number;
  lang: "ru" | "en";

  visitedFiles: string[];
  achievements: Record<string, boolean>;
  toasts: string[]; // queue of achievement ids to surface

  unlock: (id: string) => void;
  hydrateAchievements: () => void;
  hydrateSettings: () => void;
  dismissToast: () => void;

  setTheme: (id: string) => void;
  setFontSize: (n: number) => void;
  setMinimap: (open: boolean) => void;
  setSidebar: (open: boolean) => void;
  setLang: (l: "ru" | "en") => void;
  toggleLang: () => void;

  openFile: (id: string) => void;
  closeTab: (id: string) => void;
  setActive: (id: string) => void;
  setActivityView: (v: ActivityView) => void;
  openExplorer: () => void;
  toggleSidebar: () => void;
  toggleTerminal: () => void;
  setTerminal: (open: boolean) => void;
  setPalette: (open: boolean) => void;
  setTour: (open: boolean) => void;
  toggleChat: () => void;
  setChat: (open: boolean) => void;
  toggleMinimap: () => void;
}

export const useEditor = create<EditorState>((set, get) => ({
  openTabs: [DEFAULT_OPEN],
  activeFile: DEFAULT_OPEN,
  activityView: "explorer",
  sidebarOpen: true,
  terminalOpen: false,
  paletteOpen: false,
  tourOpen: false,
  chatOpen: false,
  minimapOpen: true,

  theme: "dark-plus",
  fontSize: 14,
  lang: "ru",

  visitedFiles: [],
  achievements: {},
  toasts: [],

  unlock: (id) => {
    const s = get();
    if (s.achievements[id]) return;
    const achievements = { ...s.achievements, [id]: true };
    // platinum when every non-meta achievement is unlocked
    const allDone = NON_META.every((a) => achievements[a.id]);
    if (allDone && !achievements.platinum) achievements.platinum = true;
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(ACH_KEY, JSON.stringify(achievements));
      } catch {
        /* ignore */
      }
    }
    const toasts = [...s.toasts, id];
    if (allDone && id !== "platinum") toasts.push("platinum");
    set({ achievements, toasts });
  },

  hydrateAchievements: () => set({ achievements: loadAch() }),

  hydrateSettings: () => {
    if (typeof window === "undefined") return;
    let theme = "dark-plus";
    let fontSize = 14;
    let lang: "ru" | "en" = "ru";
    try {
      theme = localStorage.getItem("portfolio-theme") ?? theme;
      const fs = parseInt(localStorage.getItem("portfolio-fontsize") ?? "", 10);
      if (!isNaN(fs)) fontSize = Math.min(20, Math.max(12, fs));
      if (localStorage.getItem("portfolio-lang") === "en") lang = "en";
    } catch {
      /* ignore */
    }
    document.documentElement.dataset.theme = theme;
    set({ theme, fontSize, lang });
  },

  dismissToast: () => set((s) => ({ toasts: s.toasts.slice(1) })),

  setTheme: (id) => {
    set({ theme: id });
    if (typeof window !== "undefined") {
      document.documentElement.dataset.theme = id;
      try {
        localStorage.setItem("portfolio-theme", id);
      } catch {
        /* ignore */
      }
    }
    get().unlock("theme");
  },
  setFontSize: (n) => {
    const fontSize = Math.min(20, Math.max(12, Math.round(n)));
    set({ fontSize });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("portfolio-fontsize", String(fontSize));
      } catch {
        /* ignore */
      }
    }
  },
  setMinimap: (open) => set({ minimapOpen: open }),
  setSidebar: (open) => set({ sidebarOpen: open }),
  setLang: (l) => {
    set({ lang: l });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("portfolio-lang", l);
      } catch {
        /* ignore */
      }
    }
  },
  toggleLang: () => get().setLang(get().lang === "ru" ? "en" : "ru"),

  openFile: (id) => {
    set((s) => ({
      openTabs: s.openTabs.includes(id) ? s.openTabs : [...s.openTabs, id],
      activeFile: id,
      visitedFiles: s.visitedFiles.includes(id) ? s.visitedFiles : [...s.visitedFiles, id],
    }));
    const v = get().visitedFiles;
    if (v.length >= 5) get().unlock("explorer");
    if (LIVE_IDS.length && LIVE_IDS.every((lid) => v.includes(lid))) get().unlock("live");
    if (id === "contact/contact.tsx") get().unlock("contact");
  },

  closeTab: (id) =>
    set((s) => {
      const idx = s.openTabs.indexOf(id);
      const next = s.openTabs.filter((t) => t !== id);
      let active = s.activeFile;
      if (s.activeFile === id) {
        active = next[idx] ?? next[idx - 1] ?? next[next.length - 1] ?? null;
      }
      return { openTabs: next, activeFile: active };
    }),

  setActive: (id) => set({ activeFile: id }),
  setActivityView: (v) => {
    const s = get();
    // clicking the active icon toggles the sidebar (like real VSCode)
    if (s.activityView === v) set({ sidebarOpen: !s.sidebarOpen });
    else set({ activityView: v, sidebarOpen: true });
  },
  openExplorer: () => set({ activityView: "explorer", sidebarOpen: true }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleTerminal: () => {
    set((s) => ({ terminalOpen: !s.terminalOpen }));
    if (get().terminalOpen) get().unlock("terminal");
  },
  setTerminal: (open) => {
    set({ terminalOpen: open });
    if (open) get().unlock("terminal");
  },
  setPalette: (open) => {
    set({ paletteOpen: open });
    if (open) get().unlock("palette");
  },
  setTour: (open) => set({ tourOpen: open }),
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  setChat: (open) => set({ chatOpen: open }),
  toggleMinimap: () => set((s) => ({ minimapOpen: !s.minimapOpen })),
}));
