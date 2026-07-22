import { describe, it, expect } from "vitest";
import type { BrainNode, BrainEdge, BrainState } from "@/lib/workspace";
import { computeWeights, withCategoryHubs, isHubId, catColor } from "./model";

/** Узел с разумными умолчаниями — в тестах важны только id/importance/category. */
function node(id: string, importance = 3, category = "other"): BrainNode {
  return { id, label: id, category, importance, summary: "", source: null };
}

function edge(from: string, to: string): BrainEdge {
  return { id: `${from}-${to}`, from, to };
}

describe("computeWeights", () => {
  it("пустой граф — пустая карта", () => {
    expect(computeWeights([], []).size).toBe(0);
  });

  it("вес в диапазоне 0..1 для всех узлов", () => {
    const nodes = [node("a", 1), node("b", 3), node("c", 5)];
    const w = computeWeights(nodes, [edge("a", "b")]);
    for (const n of nodes) {
      const v = w.get(n.id)!;
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("связность добавляет вес: хаб тяжелее одиночки той же важности", () => {
    // e — хаб с четырьмя связями, f — одиночка; важность одинаковая.
    const nodes = [node("e", 3), node("f", 3), node("x1"), node("x2"), node("x3"), node("x4")];
    const edges = [edge("e", "x1"), edge("e", "x2"), edge("e", "x3"), edge("e", "x4")];
    const w = computeWeights(nodes, edges);
    expect(w.get("e")!).toBeGreaterThan(w.get("f")!);
  });

  it("ранговая нормализация: и в плоском графе (все важности равны) веса различаются по связности", () => {
    // Модель «наставила всем 4» — ранги всё равно должны развести узлы.
    const nodes = ["a", "b", "c", "d", "e"].map((id) => node(id, 4));
    const edges = [edge("a", "b"), edge("a", "c"), edge("a", "d")];
    const w = computeWeights(nodes, edges);
    expect(w.get("a")!).toBeGreaterThan(w.get("e")!);
  });

  it("опоры: самый тяжёлый узел графа поднят к максимуму", () => {
    const nodes = [node("hub", 5), ...Array.from({ length: 20 }, (_, i) => node(`n${i}`, 2))];
    const edges = Array.from({ length: 8 }, (_, i) => edge("hub", `n${i}`));
    const w = computeWeights(nodes, edges);
    expect(w.get("hub")!).toBeGreaterThanOrEqual(0.9);
  });

  it("одинаковый score — одинаковый вес (узлы одной важности не дрожат)", () => {
    const nodes = [node("a", 3), node("b", 3), node("c", 5)];
    const w = computeWeights(nodes, []);
    expect(w.get("a")).toBe(w.get("b"));
  });
});

describe("withCategoryHubs", () => {
  it("меньше четырёх узлов в категории — центра нет", () => {
    const g: BrainState = { nodes: [node("a", 3, "x"), node("b", 3, "x"), node("c", 3, "x")], edges: [] };
    expect(withCategoryHubs(g)).toBe(g);
  });

  it("рассыпанная категория из сирот получает центр, сироты цепляются к нему", () => {
    const g: BrainState = {
      nodes: ["a", "b", "c", "d"].map((id) => node(id, 3, "fin")),
      edges: [],
    };
    const out = withCategoryHubs(g);
    const hub = out.nodes.find((n) => isHubId(n.id));
    expect(hub).toBeDefined();
    expect(hub!.category).toBe("fin");
    // Все четыре сироты подтянуты к центру.
    expect(out.edges.filter((e) => e.from === hub!.id)).toHaveLength(4);
    // Исходный граф не мутирован.
    expect(g.nodes).toHaveLength(4);
    expect(g.edges).toHaveLength(0);
  });

  it("естественный центр уже есть — свой хаб не достраивается", () => {
    // «a» собирает на себя больше 40% внутренних связей категории.
    const g: BrainState = {
      nodes: ["a", "b", "c", "d"].map((id) => node(id, 3, "x")),
      edges: [edge("a", "b"), edge("a", "c"), edge("a", "d")],
    };
    expect(withCategoryHubs(g)).toBe(g);
  });

  it("меньше трёх сирот — центр не нужен", () => {
    const g: BrainState = {
      nodes: ["a", "b", "c", "d"].map((id) => node(id, 3, "x")),
      // a-b и a-c связаны между собой (но a не дотягивает до естественного центра… дотягивает?
      // 2 связи из 4 внутренних концов у a — 2 >= 4*0.4 → естественный центр, хаба нет).
      edges: [edge("a", "b"), edge("c", "d")],
    };
    // Все узлы имеют внутреннюю связь — сирот ноль, центра нет.
    expect(withCategoryHubs(g)).toBe(g);
  });
});

describe("catColor", () => {
  it("базовая категория — фиксированный цвет", () => {
    expect(catColor("project")).toBe("#c586c0");
  });

  it("незнакомая категория — стабильный цвет по имени", () => {
    expect(catColor("крипта")).toBe(catColor("крипта"));
    expect(catColor("крипта")).toMatch(/^#[0-9a-f]{6}$/);
  });
});
