"use client";

import { useEffect, useRef } from "react";
import { useEditor } from "@/lib/store";
import { DEFAULT_OPEN, fileById } from "@/lib/files";
import { TitleBar } from "./TitleBar";
import { ActivityBar } from "./ActivityBar";
import { Sidebar } from "./Sidebar";
import { Editor } from "./Editor";
import { Terminal } from "./Terminal";
import { StatusBar } from "./StatusBar";
import { CommandPalette } from "./CommandPalette";
import { Tour } from "./Tour";
import { CopilotPanel } from "./CopilotPanel";
import { Splash } from "./Splash";
import { AchievementToast } from "./AchievementToast";
import { VisitTracker } from "./VisitTracker";
import { HelpCircle } from "lucide-react";

export function IDE({ initialFile }: { initialFile?: string }) {
  const sidebarOpen = useEditor((s) => s.sidebarOpen);
  const setPalette = useEditor((s) => s.setPalette);
  const toggleTerminal = useEditor((s) => s.toggleTerminal);
  const toggleSidebar = useEditor((s) => s.toggleSidebar);
  const setTour = useEditor((s) => s.setTour);
  const hydrateAchievements = useEditor((s) => s.hydrateAchievements);
  const hydrateSettings = useEditor((s) => s.hydrateSettings);
  const activeFile = useEditor((s) => s.activeFile);
  const seeded = useRef(false);

  useEffect(() => {
    hydrateAchievements();
    hydrateSettings();
  }, [hydrateAchievements, hydrateSettings]);

  // Deep link: open the file from ?file=<id> on first load.
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    if (initialFile && fileById(initialFile)) useEditor.getState().openFile(initialFile);
  }, [initialFile]);

  // Keep the URL in sync with the active file so it can be copied / shared.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url =
      activeFile && activeFile !== DEFAULT_OPEN
        ? `?file=${encodeURIComponent(activeFile)}`
        : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [activeFile]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "i") {
        e.preventDefault();
        useEditor.getState().toggleChat();
      } else if (mod && (e.key === "k" || (e.shiftKey && e.key.toLowerCase() === "p"))) {
        e.preventDefault();
        setPalette(true);
      } else if (mod && e.key === "`") {
        e.preventDefault();
        toggleTerminal();
      } else if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPalette, toggleTerminal, toggleSidebar]);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <ActivityBar />
        {sidebarOpen && <Sidebar />}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <Editor />
          <Terminal />
        </div>
        <CopilotPanel />
      </div>
      <StatusBar />
      <CommandPalette />
      <Tour />
      <Splash />
      <AchievementToast />
      <VisitTracker />
      <button
        onClick={() => setTour(true)}
        title="Запустить тур по сайту"
        className="absolute bottom-7 right-3 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-vsc-accent text-white shadow-lg transition hover:opacity-90"
      >
        <HelpCircle size={20} />
      </button>
    </div>
  );
}
