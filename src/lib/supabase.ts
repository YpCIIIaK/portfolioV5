/**
 * Minimal Supabase REST (PostgREST) client — server-side only.
 *
 * Uses the service-role key, so it MUST never be imported into client code.
 * We avoid the @supabase/supabase-js dependency: plain fetch against the REST
 * endpoint is enough for the handful of tables this workspace needs.
 */

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function supabaseConfigured(): boolean {
  return !!URL && !!KEY;
}

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: KEY!,
    Authorization: `Bearer ${KEY!}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function endpoint(table: string, query = ""): string {
  return `${URL}/rest/v1/${table}${query ? `?${query}` : ""}`;
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`supabase ${res.status}: ${detail.slice(0, 300)}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function sbSelect<T>(table: string, query: string): Promise<T[]> {
  const res = await fetch(endpoint(table, query), {
    headers: headers(),
    cache: "no-store",
  });
  return handle<T[]>(res);
}

export async function sbInsert<T>(table: string, row: Record<string, unknown>): Promise<T> {
  const res = await fetch(endpoint(table), {
    method: "POST",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(row),
  });
  const rows = await handle<T[]>(res);
  return rows[0];
}

export async function sbUpdate<T>(
  table: string,
  query: string,
  patch: Record<string, unknown>,
): Promise<T | undefined> {
  const res = await fetch(endpoint(table, query), {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(patch),
  });
  const rows = await handle<T[]>(res);
  return rows[0];
}

export async function sbDelete(table: string, query: string): Promise<void> {
  const res = await fetch(endpoint(table, query), {
    method: "DELETE",
    headers: headers(),
  });
  await handle<void>(res);
}
