"use client";

import {
  Files,
  Search,
  GitBranch,
  Blocks,
  Play,
  Settings,
  User,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useEditor, type ActivityView } from "@/lib/store";

const ITEMS: { id: ActivityView; label: string; Icon: LucideIcon }[] = [
  { id: "explorer", label: "Explorer", Icon: Files },
  { id: "search", label: "Search", Icon: Search },
  { id: "git", label: "Source Control", Icon: GitBranch },
  { id: "run", label: "Run and Debug", Icon: Play },
  { id: "extensions", label: "Extensions", Icon: Blocks },
];

export function ActivityBar() {
  const activityView = useEditor((s) => s.activityView);
  const sidebarOpen = useEditor((s) => s.sidebarOpen);
  const setActivityView = useEditor((s) => s.setActivityView);
  const chatOpen = useEditor((s) => s.chatOpen);
  const toggleChat = useEditor((s) => s.toggleChat);
  const openFile = useEditor((s) => s.openFile);
  const setSidebar = useEditor((s) => s.setSidebar);

  return (
    <div
      data-tour="activity"
      className="flex w-12 shrink-0 flex-col items-center justify-between bg-vsc-activitybar py-1 no-select"
    >
      <div className="flex flex-col items-center">
        {ITEMS.map(({ id, label, Icon }) => {
          const active = activityView === id && sidebarOpen;
          return (
            <button
              key={id}
              title={label}
              onClick={() => setActivityView(id)}
              className={`relative flex h-12 w-12 items-center justify-center transition-colors ${
                active ? "text-vsc-bright" : "text-vsc-muted hover:text-vsc-text"
              }`}
            >
              {active && (
                <span className="absolute left-0 top-0 h-full w-0.5 bg-white" />
              )}
              <Icon size={24} strokeWidth={1.4} />
            </button>
          );
        })}
      </div>
      <div className="flex flex-col items-center">
        <button
          title="Ask Copilot about Vladimir"
          onClick={toggleChat}
          data-tour="copilot"
          className={`relative flex h-12 w-12 items-center justify-center transition-colors ${
            chatOpen ? "text-vsc-bright" : "text-vsc-muted hover:text-vsc-text"
          }`}
        >
          {chatOpen && <span className="absolute left-0 top-0 h-full w-0.5 bg-white" />}
          <Sparkles size={24} strokeWidth={1.4} />
        </button>
        <button
          title="Account"
          onClick={() => {
            setSidebar(true);
            setActivityView("extensions");
          }}
          className="flex h-12 w-12 items-center justify-center text-vsc-muted hover:text-vsc-text"
        >
          <User size={24} strokeWidth={1.4} />
        </button>
        <button
          title="Settings"
          onClick={() => openFile(".vscode/settings.json")}
          className="flex h-12 w-12 items-center justify-center text-vsc-muted hover:text-vsc-text"
        >
          <Settings size={24} strokeWidth={1.4} />
        </button>
      </div>
    </div>
  );
}
