"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, Plus, Trash2, Pencil, X, CalendarClock } from "lucide-react";
import { useSession } from "@/lib/session";
import {
  wsList, wsCreate, wsUpdate, wsDelete,
  DEMO_SUBSCRIPTIONS, CURRENCIES, monthlyCost,
  type Subscription, type SubPeriod,
} from "@/lib/workspace";
import { GuestBanner } from "./GuestBanner";

const EMPTY = { name: "", price: "", currency: "₽", period: "monthly" as SubPeriod, tier: "", description: "", next_date: "" };

function fmt(n: number): string {
  // Trim trailing .00 but keep cents when present.
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function dueLabel(date: string | null): { text: string; soon: boolean } | null {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { text: "просрочено", soon: true };
  if (diff === 0) return { text: "сегодня", soon: true };
  if (diff === 1) return { text: "завтра", soon: true };
  if (diff <= 7) return { text: `через ${diff} дн.`, soon: true };
  return { text: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }), soon: false };
}

export function SubscriptionsPanel() {
  const owner = useSession((s) => !!s.user?.owner);
  const [items, setItems] = useState<Subscription[]>(DEMO_SUBSCRIPTIONS);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const rows = await wsList<Subscription>("subscriptions");
        if (alive) { setItems(rows); setDemo(false); }
      } catch {
        if (alive) { setItems(DEMO_SUBSCRIPTIONS); setDemo(true); }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Monthly spend, summed per-currency (mixing currencies makes no sense).
  const totals = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of items) map.set(s.currency, (map.get(s.currency) ?? 0) + monthlyCost(s));
    return [...map.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const startAdd = () => { setForm(EMPTY); setEditingId(null); setShowForm(true); };
  const startEdit = (s: Subscription) => {
    setForm({ name: s.name, price: String(s.price), currency: s.currency, period: s.period, tier: s.tier, description: s.description, next_date: s.next_date ?? "" });
    setEditingId(s.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      price: Number(form.price) || 0,
      currency: form.currency,
      period: form.period,
      tier: form.tier.trim(),
      description: form.description.trim(),
      next_date: form.next_date || null,
    };
    if (editingId) {
      const updated = await wsUpdate<Subscription>("subscriptions", editingId, payload);
      setItems((xs) => xs.map((x) => (x.id === editingId ? updated : x)));
    } else {
      const created = await wsCreate<Subscription>("subscriptions", payload);
      setItems((xs) => [created, ...xs]);
    }
    setShowForm(false);
    setForm(EMPTY);
    setEditingId(null);
  };

  const remove = async (id: string) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
    await wsDelete("subscriptions", id);
  };

  if (loading) return <p className="px-8 py-6 text-[13px] text-vsc-muted">Загрузка подписок…</p>;

  const input = "w-full rounded border border-vsc-line bg-vsc-bg px-3 py-2 text-[13px] text-vsc-text outline-none focus:border-vsc-accent";

  return (
    <div className="mx-auto max-w-4xl px-8 py-6">
      {!owner && <GuestBanner what="подписки" />}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-[18px] font-semibold text-vsc-bright">
          <CreditCard size={18} /> Подписки
          {demo && <span className="rounded bg-vsc-line px-1.5 py-0.5 text-[11px] font-normal text-vsc-muted">демо</span>}
        </h1>
        {owner && !showForm && (
          <button onClick={startAdd} className="flex items-center gap-1.5 rounded bg-vsc-accent px-3 py-1.5 text-[12px] text-white hover:opacity-90">
            <Plus size={14} /> Добавить
          </button>
        )}
      </div>

      {/* per-currency monthly total */}
      {totals.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-3">
          {totals.map(([cur, sum]) => (
            <div key={cur} className="rounded-lg border border-vsc-line bg-vsc-sidebar px-4 py-2">
              <div className="text-[11px] uppercase tracking-wide text-vsc-muted">В месяц</div>
              <div className="text-[18px] font-semibold text-vsc-bright">{fmt(sum)} {cur}</div>
            </div>
          ))}
        </div>
      )}

      {owner && showForm && (
        <div className="mb-5 space-y-2 rounded-lg border border-vsc-line bg-vsc-sidebar p-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-vsc-bright">{editingId ? "Редактировать подписку" : "Новая подписка"}</span>
            <button onClick={() => setShowForm(false)} className="rounded p-1 text-vsc-muted hover:bg-vsc-hover hover:text-vsc-text"><X size={15} /></button>
          </div>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Что за сервис (Netflix, Claude Pro…)" className={input} />
          <div className="flex gap-2">
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^\d.]/g, "") })} inputMode="decimal" placeholder="Цена" className={input} />
            <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={`${input} w-20 shrink-0`}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value as SubPeriod })} className={`${input} w-32 shrink-0`}>
              <option value="monthly">в месяц</option>
              <option value="yearly">в год</option>
            </select>
          </div>
          <input value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} placeholder="Тариф (Pro, Premium, Family…) — опционально" className={input} />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Описание — опционально" rows={2} className={`${input} resize-none`} />
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-vsc-muted">Следующее списание</label>
            <input type="date" value={form.next_date} onChange={(e) => setForm({ ...form, next_date: e.target.value })} className={`${input} w-44`} />
          </div>
          <div className="flex justify-end pt-1">
            <button onClick={save} className="rounded bg-vsc-accent px-4 py-1.5 text-[13px] text-white hover:opacity-90">Сохранить</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-[13px] text-vsc-muted">{owner ? "Пока нет подписок. Добавь первую." : "Список подписок пуст."}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((s) => {
            const due = dueLabel(s.next_date);
            return (
              <div key={s.id} className="flex flex-col rounded-lg border border-vsc-line bg-vsc-sidebar p-4">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-[14px] font-semibold text-vsc-bright">{s.name}</h3>
                    {s.tier && <span className="text-[11px] text-vsc-muted">{s.tier}</span>}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[15px] font-semibold text-vsc-bright">{fmt(s.price)} {s.currency}</div>
                    <div className="text-[10px] text-vsc-muted">{s.period === "yearly" ? "в год" : "в месяц"}</div>
                  </div>
                </div>
                {s.description && <p className="mb-2 text-[12.5px] leading-relaxed text-vsc-text">{s.description}</p>}
                <div className="mt-auto flex items-center gap-2 pt-1">
                  {due && (
                    <span className={`flex items-center gap-1 text-[11px] ${due.soon ? "text-vsc-yellow" : "text-vsc-muted"}`}>
                      <CalendarClock size={12} /> {due.text}
                    </span>
                  )}
                  {owner && (
                    <div className="ml-auto flex items-center gap-2">
                      <button onClick={() => startEdit(s)} title="Редактировать" className="text-vsc-muted hover:text-vsc-text"><Pencil size={14} /></button>
                      <button onClick={() => remove(s.id)} title="Удалить" className="text-vsc-muted hover:text-red-400"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
