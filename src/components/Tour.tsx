"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { X } from "lucide-react";
import { useEditor } from "@/lib/store";

const STORAGE_KEY = "portfolio-tour-v1";

interface Step {
  selector?: string;
  title: string;
  text: string;
}

const STEPS: Step[] = [
  {
    title: "👋 Это интерактивное портфолио",
    text: "Сделано как редактор VSCode. Здесь всё кликабельно — давай за 20 секунд покажу, как смотреть. Можешь пропустить в любой момент.",
  },
  {
    selector: '[data-tour="activity"]',
    title: "Панель разделов",
    text: "Слева — иконки: файлы (Explorer), поиск, история коммитов (Git). Это как навигация по сайту.",
  },
  {
    selector: '[data-tour="sidebar"]',
    title: "Файлы — это разделы",
    text: "Папки about / projects / experience — обо мне, проекты и опыт. Кликни любой файл, он откроется вкладкой.",
  },
  {
    selector: '[data-tour="live"]',
    title: "🟢 Папка live — настоящие данные",
    text: "Здесь живые данные: мои репозитории прямо из GitHub API и цены крипты по WebSocket. Не картинки — реальные запросы.",
  },
  {
    selector: '[data-tour="copilot"]',
    title: "🤖 AI-ассистент (Copilot)",
    text: "Жми на ✨ — откроется ИИ-чат. Спроси «знает ли он Go?» или «почему стоит нанять» — ответит по реальным данным. Есть режим с доступом в интернет.",
  },
  {
    selector: '[data-tour="statusbar"]',
    title: "Терминал, темы и команды",
    text: "Внизу — живой терминал (Ctrl + `), переключатель тем (🎨) и live-цена BTC. А Ctrl + K — палитра команд, как в настоящем VSCode.",
  },
  {
    title: "Готово — приятного просмотра! 🚀",
    text: "Совет: загляни в projects/ и live/. А в contact/ — рабочая форма связи. Этот тур можно перезапустить кнопкой «?» в правом нижнем углу.",
  },
];

export function Tour() {
  const tourOpen = useEditor((s) => s.tourOpen);
  const setTour = useEditor((s) => s.setTour);
  const openExplorer = useEditor((s) => s.openExplorer);
  const unlock = useEditor((s) => s.unlock);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // auto-start on first visit
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setTour(true), 700);
      return () => clearTimeout(t);
    }
  }, [setTour]);

  // keep the explorer (sidebar) visible throughout the tour — we describe it
  useEffect(() => {
    if (tourOpen) openExplorer();
  }, [tourOpen, openExplorer]);

  const current = STEPS[step];

  useLayoutEffect(() => {
    if (!tourOpen) return;
    const update = () => {
      if (!current.selector) {
        setRect(null);
        return;
      }
      const el = document.querySelector(current.selector);
      el?.scrollIntoView({ block: "nearest" });
      setRect(el ? el.getBoundingClientRect() : null);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [tourOpen, step, current]);

  if (!tourOpen) return null;

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setTour(false);
    setStep(0);
    unlock("tour");
  };

  const pad = 6;
  const spotlight = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  // tooltip position: near the spotlight, else centered
  const tip = spotlight
    ? tooltipPos(spotlight)
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" as const };

  return (
    <div className="fixed inset-0 z-[100]">
      {/* dim + spotlight hole */}
      {spotlight ? (
        <div
          className="pointer-events-none absolute rounded-md transition-all duration-300"
          style={{
            ...spotlight,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.66)",
            outline: "2px solid var(--vsc-accent)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/66" />
      )}

      {/* tooltip card */}
      <div
        className="absolute w-[320px] max-w-[88vw] rounded-lg border border-vsc-line bg-[#252526] p-4 shadow-2xl"
        style={tip}
      >
        <button
          onClick={finish}
          className="absolute right-2 top-2 rounded p-1 text-vsc-muted hover:bg-white/10 hover:text-vsc-text"
        >
          <X size={15} />
        </button>
        <h3 className="pr-5 text-[14px] font-semibold text-vsc-bright">{current.title}</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-vsc-text">{current.text}</p>

        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i === step ? "bg-vsc-accent" : "bg-vsc-line"}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={finish} className="px-2 py-1 text-[12px] text-vsc-muted hover:text-vsc-text">
              Пропустить
            </button>
            {step > 0 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="rounded border border-vsc-line px-2.5 py-1 text-[12px] text-vsc-text hover:bg-vsc-hover"
              >
                Назад
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="rounded bg-vsc-accent px-3 py-1 text-[12px] font-medium text-white hover:opacity-90"
              >
                Далее
              </button>
            ) : (
              <button
                onClick={finish}
                className="rounded bg-vsc-accent px-3 py-1 text-[12px] font-medium text-white hover:opacity-90"
              >
                Понятно
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Place the tooltip below the target if room, else above; clamp horizontally. */
function tooltipPos(s: { top: number; left: number; width: number; height: number }) {
  const W = 320;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const below = s.top + s.height + 12;
  const showBelow = below + 180 < vh;
  let left = s.left + s.width / 2 - W / 2;
  left = Math.max(12, Math.min(left, vw - W - 12));
  const top = showBelow ? below : Math.max(12, s.top - 12 - 170);
  return { top, left };
}
