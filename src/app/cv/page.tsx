import type { Metadata } from "next";
import Link from "next/link";
import { PrintButton } from "./PrintButton";
import { ROLE, SUMMARY, AVAILABILITY, LANGUAGES, CONTACTS, SKILLS, EXPERIENCE, PROJECTS } from "@/lib/profile";

export const metadata: Metadata = {
  title: "Владимир — резюме (Frontend / Full-Stack Developer)",
  description: SUMMARY,
  robots: { index: true },
};

export default function CvPage() {
  return (
    <main className="cv mx-auto max-w-[210mm] bg-white px-5 py-8 text-[13px] leading-relaxed text-neutral-900 sm:px-10 print:px-0 print:py-0">
      <style>{`
        @media print {
          @page { margin: 14mm; }
          .no-print { display: none !important; }
          .cv-entry { break-inside: avoid; }
          .cv h2 { break-after: avoid; }
        }
        html, body {
          background: #fff !important;
          height: auto !important;
          min-height: 100%;
          overflow: visible !important;
        }
        body { display: block !important; }
        .cv a { color: #1d4ed8; text-decoration: none; overflow-wrap: anywhere; }
        .cv h2 { border-bottom: 1px solid #d4d4d4; }
      `}</style>
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
        <span className="text-neutral-600">Версия для печати · обновлено 06.10.2026</span>
        <div className="flex items-center gap-3"><Link href="/">← на сайт</Link><PrintButton /></div>
      </div>
      <header className="mb-5">
        <h1 className="text-[26px] font-bold">Владимир</h1>
        <p className="text-[15px] text-neutral-700">{ROLE} · React / TypeScript / Next.js / Node.js</p>
        <p className="mt-1 text-neutral-600">{AVAILABILITY}</p>
        <p className="mt-1 flex flex-wrap gap-x-4">
          {CONTACTS.map((link) => <a key={link.href} href={link.href}>{link.label === "Email" ? "bigboyvova01@gmail.com" : link.label === "GitHub" ? "github.com/YpCIIIaK" : link.label}</a>)}
        </p>
        <p className="mt-1 text-neutral-600">{LANGUAGES}</p>
      </header>
      <Section title="Кратко"><p>{SUMMARY}</p></Section>
      <Section title="Опыт">
        {EXPERIENCE.map((job) => (
          <div key={job.id} className="cv-entry mb-4">
            <h3 className="font-semibold">{job.title}</h3>
            <p className="text-[12px] text-neutral-500">{job.period}</p>
            <ul className="mt-1 list-disc pl-5">{job.points.map((point) => <li key={point}>{point}</li>)}</ul>
          </div>
        ))}
      </Section>
      <Section title="Избранные проекты">
        {PROJECTS.map((project) => (
          <div key={project.id} className="cv-entry mb-3">
            <h3 className="font-semibold"><a href={`https://github.com/YpCIIIaK/${project.repo}`}>{project.title}</a></h3>
            <p>{project.summary}</p>
          </div>
        ))}
        <p>Также: Telegram Mini Apps, Go-агенты WiFi Analyzer / PC Health Monitor, Chrome MV3, Angular dashboard и UI kit.</p>
      </Section>
      <Section title="Стек">
        <ul className="list-disc pl-5">
          {Object.entries(SKILLS).map(([group, items]) => <li key={group}><b>{group}:</b> {items.join(", ")}</li>)}
        </ul>
      </Section>
      <Section title="Образование и достижения">
        <p>Программная инженерия, ТУСУР — неоконченное высшее. Стипендиальные IT-программы в ТГУ и AITU (Казахстан).</p>
        <p>Второй этап Google Accelerator в составе команды Vortan.</p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mb-5"><h2 className="mb-2 pb-1 text-[15px] font-semibold uppercase tracking-wide text-neutral-800">{title}</h2>{children}</section>;
}
