"use client";

import { motion } from "framer-motion";
import { Blocks, Bot, Cpu, Globe, Layers, Server, Wrench, Code2 } from "lucide-react";
import { SKILLS } from "@/lib/profile";
import { Reveal, SectionHead, card, useL } from "./ui";

const GROUPS: { key: keyof typeof SKILLS; ru: string; en: string; Icon: typeof Cpu }[] = [
  { key: "languages", ru: "Языки", en: "Languages", Icon: Code2 },
  { key: "frontend", ru: "Frontend", en: "Frontend", Icon: Layers },
  { key: "backend", ru: "Backend и данные", en: "Backend & data", Icon: Server },
  { key: "cms", ru: "WordPress и CMS", en: "WordPress & CMS", Icon: Globe },
  { key: "ai", ru: "AI", en: "AI", Icon: Bot },
  { key: "infra", ru: "Инфраструктура и тесты", en: "Infra & testing", Icon: Wrench },
  { key: "integrations", ru: "Интеграции", en: "Integrations", Icon: Blocks },
];

export function Stack() {
  const { l } = useL();
  const all = Object.values(SKILLS).flat();

  return (
    <section id="stack" className="scroll-mt-16 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHead
          id="stack"
          kicker={l("04 · стек", "04 · stack")}
          title={l("Технологии, с которыми я работал", "Technologies I've worked with")}
          sub={l("Всё из списка использовалось в реальных проектах выше.", "Everything here was used in the real projects above.")}
        />
      </div>

      <div className="relative mb-12 overflow-hidden py-2 [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]">
        <div className="v6-marquee flex w-max gap-3">
          {[...all, ...all].map((s, i) => (
            <span
              key={i}
              className="whitespace-nowrap rounded-full border border-[var(--line)] bg-[var(--card)] px-4 py-2 text-[13.5px] text-[var(--muted)]"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-4 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
        {GROUPS.map(({ key, ru, en, Icon }, i) => (
          <Reveal key={key} delay={(i % 3) * 0.06} className={key === "frontend" || key === "backend" ? "lg:row-span-1" : ""}>
            <div className={`${card} h-full p-5`}>
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--a)/0.15)] text-[rgb(var(--a))]">
                  <Icon size={17} />
                </span>
                <h3 className="font-semibold">{l(ru, en)}</h3>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {SKILLS[key].map((s, j) => (
                  <motion.span
                    key={s}
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: j * 0.025 }}
                    whileHover={{ y: -2 }}
                    className="cursor-default rounded-lg border border-[var(--line)] bg-[var(--bg)] px-2.5 py-1 text-[13px] transition-colors hover:border-[rgb(var(--a)/0.5)]"
                  >
                    {s}
                  </motion.span>
                ))}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
