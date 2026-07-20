/**
 * Чёрный список мозга — темы, которые не должны попадать в граф вообще.
 *
 * Чистки постфактум мало: модель заново заводит те же узлы на следующем
 * «Дополнить». Поэтому список работает в трёх местах:
 *   1) в промпте — прямой запрет модели;
 *   2) при мерже дельты — страховка, если модель запрет проигнорировала;
 *   3) при чистке — вычищает уже накопившееся.
 *
 * Совпадение — подстрока без учёта регистра, по названию И по сути узла.
 * Намеренно не регулярки: список редактируется руками в спешке, и «C++» или
 * «(1)» не должны превращаться в синтаксическую ошибку или в маску, которая
 * молча вынесет пол-графа.
 */

import { sbSelect, sbInsert, sbDelete, supabaseConfigured } from "@/lib/supabase";

export interface BlockRule {
  id: string;
  pattern: string;
}

export async function listBlocklist(): Promise<BlockRule[]> {
  if (!supabaseConfigured()) return [];
  try {
    return await sbSelect<BlockRule>("ws_brain_blocklist", "select=id,pattern&order=pattern.asc");
  } catch {
    // Недоступный список не повод ронять сборку мозга — просто ничего не режем.
    return [];
  }
}

export async function addBlock(pattern: string): Promise<BlockRule> {
  return sbInsert<BlockRule>("ws_brain_blocklist", { pattern: pattern.trim() });
}

export async function removeBlock(id: string): Promise<void> {
  await sbDelete("ws_brain_blocklist", `id=eq.${encodeURIComponent(id)}`);
}

/** Подходит ли узел под запрет. Пустые правила игнорируем — иначе совпадёт всё. */
export function isBlocked(
  node: { label: string; summary?: string },
  patterns: string[],
): string | null {
  const hay = `${node.label} ${node.summary ?? ""}`.toLowerCase();
  for (const p of patterns) {
    const needle = p.trim().toLowerCase();
    if (needle && hay.includes(needle)) return p;
  }
  return null;
}
