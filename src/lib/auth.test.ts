import { describe, it, expect, vi, beforeEach } from "vitest";

// auth.ts тянет next/headers ради getSession — в тестах он не нужен.
vi.mock("next/headers", () => ({ cookies: () => { throw new Error("not in request scope"); } }));

import { signSession, verifySession, isOwnerId, makeSession, type Session } from "./auth";

const session = (over: Partial<Session> = {}): Session => ({
  id: 42,
  login: "tester",
  name: "Tester",
  avatar: "",
  owner: false,
  exp: Math.floor(Date.now() / 1000) + 3600,
  ...over,
});

beforeEach(() => {
  process.env.AUTH_SECRET = "test-secret";
  delete process.env.OWNER_GITHUB_ID;
});

describe("signSession / verifySession", () => {
  it("подписанный токен проходит проверку и возвращает ту же сессию", async () => {
    const s = session();
    const token = await signSession(s);
    expect(await verifySession(token)).toEqual(s);
  });

  it("подделанный payload отбрасывается", async () => {
    const token = await signSession(session());
    const [payload, sig] = token.split(".");
    // Меняем один символ payload — подпись перестаёт сходиться.
    const forged = (payload[0] === "A" ? "B" : "A") + payload.slice(1);
    expect(await verifySession(`${forged}.${sig}`)).toBeNull();
  });

  it("токен, подписанный другим секретом, отбрасывается", async () => {
    const token = await signSession(session());
    process.env.AUTH_SECRET = "another-secret";
    expect(await verifySession(token)).toBeNull();
  });

  it("просроченная сессия отбрасывается", async () => {
    const token = await signSession(session({ exp: Math.floor(Date.now() / 1000) - 10 }));
    expect(await verifySession(token)).toBeNull();
  });

  it("мусор вместо токена — null, без исключений", async () => {
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession("")).toBeNull();
    expect(await verifySession("no-dot")).toBeNull();
    expect(await verifySession("a.b")).toBeNull();
  });
});

describe("isOwnerId / makeSession", () => {
  it("владелец — только совпадение с OWNER_GITHUB_ID", () => {
    process.env.OWNER_GITHUB_ID = "42";
    expect(isOwnerId(42)).toBe(true);
    expect(isOwnerId(43)).toBe(false);
  });

  it("без OWNER_GITHUB_ID владельцев нет вообще", () => {
    expect(isOwnerId(42)).toBe(false);
  });

  it("makeSession: любой другой валидный GitHub-вход — гость", () => {
    process.env.OWNER_GITHUB_ID = "42";
    expect(makeSession({ id: 42, login: "own" }).owner).toBe(true);
    expect(makeSession({ id: 7, login: "guest" }).owner).toBe(false);
  });
});
