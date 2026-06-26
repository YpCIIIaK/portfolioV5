"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Loader2, RotateCcw, ArrowDown, Sparkles, Filter, Search, BarChart3, Wand2 } from "lucide-react";
import { useTr } from "@/lib/i18n";

/**
 * Interactive demo of the Multi-Agent Arena executor. A prompt flows through a
 * DAG of agent nodes (classifier → researcher → analyst → synthesizer); each
 * node "runs" in turn and emits output. Deterministic mock fixtures, but the
 * shape mirrors the real pipeline: typed agent nodes executed in order.
 */

type AgentId = "classifier" | "researcher" | "analyst" | "synthesizer";

const AGENT_META: Record<AgentId, { role: string; model: string; Icon: typeof Filter }> = {
  classifier: { role: "Классифицирует запрос и выбирает маршрут", model: "nemotron-nano", Icon: Filter },
  researcher: { role: "Собирает факты и контекст", model: "llama-3.3-70b", Icon: Search },
  analyst: { role: "Взвешивает за/против", model: "qwen-2.5-72b", Icon: BarChart3 },
  synthesizer: { role: "Формирует финальный ответ", model: "nemotron-super-120b", Icon: Wand2 },
};

const ORDER: AgentId[] = ["classifier", "researcher", "analyst", "synthesizer"];

interface Scenario {
  id: string;
  label: string;
  prompt: string;
  out: Partial<Record<AgentId, string[]>>;
  final: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: "rust",
    label: "Принятие решения",
    prompt: "Стоит ли нам мигрировать сервис сбора метрик с Node.js на Go?",
    out: {
      classifier: ["Тип: технологическое решение", "Маршрут: research → analyst → synthesizer", "Домен: backend / производительность"],
      researcher: ["Текущий сервис: Node.js, ~120 МБ RSS, GC-паузы под нагрузкой", "Go: статический бинарь, горутины, низкий футпринт", "Команда: 2 человека уже писали агенты на Go"],
      analyst: ["За: latency и память, один бинарь на win/linux, конкурентность", "Против: переписывание ~6 нед, экосистема npm-утилит", "Риск: отвлечение от продуктовых задач"],
    },
    final: "Рекомендация: мигрировать поэтапно. Сначала вынести «горячий» poll-loop на Go-агент (где выигрыш по памяти и latency максимален), оставив остальной сервис на Node. Полная миграция оправдана, только если нагрузка продолжит расти — иначе ROI ниже стоимости переписывания.",
  },
  {
    id: "competitor",
    label: "Анализ",
    prompt: "Проанализируй запуск нового AI-продукта конкурента и его влияние на нас.",
    out: {
      classifier: ["Тип: конкурентный анализ", "Маршрут: research → analyst → synthesizer", "Домен: продукт / рынок"],
      researcher: ["Конкурент выпустил агентный no-code пайплайн", "Цена ниже на 30%, но без локальных моделей", "Активный маркетинг, +12k звёзд за месяц"],
      analyst: ["Угроза: ценовое давление в нижнем сегменте", "Наше преимущество: Ollama-локальные модели, приватность", "Окно: 2-3 месяца до их фичепаритета"],
    },
    final: "Вывод: не конкурировать ценой. Усилить дифференциацию на приватности и локальных моделях (то, чего у конкурента нет), ускорить релиз RAG-базы и подчеркнуть «100% офлайн» в позиционировании. Среднесрочный риск управляем при фокусе на нишу.",
  },
  {
    id: "research",
    label: "Ресёрч",
    prompt: "Сделай краткий ресёрч по архитектурам RAG для проектного поиска.",
    out: {
      classifier: ["Тип: исследовательский запрос", "Маршрут: research → synthesizer (analyst опционально)", "Домен: AI / поиск"],
      researcher: ["Naive RAG: эмбеддинги + top-k, прост, но теряет контекст", "BM25-гибрид: лексика + вектора, лучше на коде/идентификаторах", "Re-ranking и соседние чанки повышают точность"],
      analyst: ["Для кодовой базы BM25-гибрид выигрывает у чистых эмбеддингов", "Включение соседних чанков ↑ полноту ответа", "Стоимость: индексация + хранение индекса"],
    },
    final: "Итог: для проектного поиска по файлам оптимален BM25-гибрид с включением соседних чанков и лёгким re-ranking — это даёт точность на идентификаторах кода без дорогих векторных БД. Именно такой подход используется в RAG-базе этого проекта.",
  },
];

export function ArenaSandbox() {
  const tr = useTr();
  const [scenario, setScenario] = useState<Scenario>(SCENARIOS[0]);
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [active, setActive] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const run = () => {
    if (timer.current) clearTimeout(timer.current);
    setPhase("running");
    setActive(0);
    const step = (i: number) => {
      if (i >= ORDER.length) {
        setPhase("done");
        setActive(ORDER.length);
        return;
      }
      setActive(i);
      timer.current = setTimeout(() => step(i + 1), 850);
    };
    step(0);
  };

  const reset = () => {
    if (timer.current) clearTimeout(timer.current);
    setPhase("idle");
    setActive(-1);
  };

  return (
    <div className="mt-2 rounded-lg border border-vsc-line bg-[#1e1e1e]">
      <div className="flex items-center gap-2 border-b border-vsc-line px-3 py-2">
        <span className="flex gap-1.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
          <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
          <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
        </span>
        <span className="font-mono text-[12px] text-vsc-muted">multi-agent-arena — {tr("живое демо")}</span>
      </div>

      <div className="p-4">
        {/* scenario picker */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="text-[12px] text-vsc-muted">{tr("Сценарий:")}</span>
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => { setScenario(s); reset(); }}
              disabled={phase === "running"}
              className={`rounded border px-2 py-1 text-[12px] transition disabled:opacity-50 ${
                scenario.id === s.id ? "border-vsc-accent bg-vsc-accent/15 text-vsc-bright" : "border-vsc-line text-vsc-muted hover:text-vsc-text"
              }`}
            >
              {tr(s.label)}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            {phase === "done" && (
              <button onClick={reset} className="flex items-center gap-1 rounded border border-vsc-line px-2 py-1 text-[12px] text-vsc-muted hover:text-vsc-text">
                <RotateCcw size={13} /> {tr("Сброс")}
              </button>
            )}
            <button
              onClick={run}
              disabled={phase === "running"}
              className="flex items-center gap-1.5 rounded bg-vsc-accent px-3 py-1 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {phase === "running" ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              {phase === "running" ? tr("Выполняю…") : tr("Запустить пайплайн")}
            </button>
          </div>
        </div>

        {/* prompt */}
        <div className="mb-3 rounded border border-vsc-line bg-[#252526] px-3 py-2 text-[13px] text-vsc-text">
          <span className="font-mono text-[11px] text-vsc-light-blue">prompt</span> · {tr(scenario.prompt)}
        </div>

        {/* agent chain */}
        <div className="space-y-2">
          {ORDER.map((id, i) => {
            const meta = AGENT_META[id];
            const Icon = meta.Icon;
            const state = phase === "idle" ? "idle" : i < active ? "done" : i === active && phase === "running" ? "running" : i <= active ? "done" : "idle";
            const reveal = state === "done";
            return (
              <div key={id}>
                {i > 0 && <ArrowDown size={14} className={`mx-auto my-0.5 ${i <= active ? "text-vsc-accent" : "text-vsc-line"}`} />}
                <div className={`rounded border px-3 py-2 transition ${
                  state === "running" ? "border-vsc-accent bg-vsc-accent/10"
                  : state === "done" ? "border-vsc-line bg-[#252526]" : "border-vsc-line bg-[#1e1e1e] opacity-60"
                }`}>
                  <div className="flex items-center gap-2">
                    <Icon size={14} className={state === "idle" ? "text-vsc-muted" : "text-vsc-accent"} />
                    <span className="text-[13px] font-medium text-vsc-bright">{id}</span>
                    <span className="font-mono text-[10px] text-vsc-muted">{meta.model}</span>
                    {state === "running" && <Loader2 size={12} className="ml-auto animate-spin text-vsc-accent" />}
                    {state === "done" && <span className="ml-auto text-[11px] text-vsc-green">✓</span>}
                  </div>
                  <div className="mt-0.5 pl-6 text-[11px] text-vsc-muted">{tr(meta.role)}</div>
                  {reveal && (
                    <ul className="mt-1.5 space-y-0.5 pl-6">
                      {(scenario.out[id] ?? []).map((line, j) => (
                        <li key={j} className="text-[12px] text-vsc-text">— {tr(line)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* final answer */}
        {phase === "done" && (
          <div className="mt-3 rounded-lg border border-vsc-accent/40 bg-vsc-accent/10 px-4 py-3">
            <div className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-vsc-bright">
              <Sparkles size={14} className="text-vsc-accent" /> {tr("Финальный ответ")}
            </div>
            <p className="text-[13px] leading-relaxed text-vsc-text">{tr(scenario.final)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
