import { NextResponse } from "next/server";

export const runtime = "nodejs";

const API = "https://api.music.yandex.net";
const TOKEN = process.env.YANDEX_MUSIC_TOKEN;

interface YmArtist { name?: string }
interface YmAlbum { id?: number | string; title?: string; coverUri?: string }
interface YmTrack {
  id?: number | string;
  title?: string;
  artists?: YmArtist[];
  albums?: YmAlbum[];
  durationMs?: number;
}

function headers(): Record<string, string> {
  return {
    Accept: "application/json",
    "User-Agent": "portfolio-vscode",
    ...(TOKEN ? { Authorization: `OAuth ${TOKEN}` } : {}),
  };
}

function coverUrl(uri?: string): string | null {
  if (!uri) return null;
  const normalized = uri.startsWith("http") ? uri : `https://${uri}`;
  return normalized.replace("%%", "100x100");
}

function normalizeTrack(t: YmTrack) {
  const album = t.albums?.[0];
  if (!t.id || !album?.id || !t.title) return null;
  const artists = (t.artists ?? []).map((a) => a.name).filter(Boolean) as string[];
  const trackId = String(t.id);
  const albumId = String(album.id);
  return {
    id: `ym:${trackId}:${albumId}`,
    label: [artists.join(", "), t.title].filter(Boolean).join(" — "),
    url: `https://music.yandex.ru/album/${albumId}/track/${trackId}`,
    embed: { type: "track" as const, trackId, albumId },
    title: t.title,
    artists,
    album: album.title ?? "",
    cover: coverUrl(album.coverUri),
    durationMs: t.durationMs ?? null,
  };
}

async function ym<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers(), cache: "no-store" });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Yandex Music ${res.status}: ${detail.slice(0, 180)}`);
  }
  return res.json() as Promise<T>;
}

async function searchTracks(text: string) {
  const q = new URLSearchParams({ text, type: "track", page: "0", nocorrect: "false" });
  const data = await ym<{ result?: { tracks?: { results?: YmTrack[] } } }>(`/search?${q}`);
  return (data.result?.tracks?.results ?? []).map(normalizeTrack).filter(Boolean).slice(0, 12);
}

async function likedTracks() {
  const status = await ym<{ result?: { account?: { uid?: number | string } } }>("/account/status");
  const uid = status.result?.account?.uid;
  if (!uid) return [];

  const likes = await ym<{ result?: { library?: { tracks?: { id?: number | string; albumId?: number | string }[] } } }>(
    `/users/${uid}/likes/tracks`,
  );
  const refs = (likes.result?.library?.tracks ?? []).slice(0, 20);
  const ids = refs.map((x) => [x.id, x.albumId].filter(Boolean).join(":")).filter(Boolean);
  if (!ids.length) return [];

  const tracks = await ym<{ result?: YmTrack[] }>(`/tracks/${ids.join(",")}`);
  return (tracks.result ?? []).map(normalizeTrack).filter(Boolean).slice(0, 12);
}

export async function GET(req: Request) {
  if (!TOKEN) {
    return NextResponse.json(
      { configured: false, items: [], error: "YANDEX_MUSIC_TOKEN не настроен" },
      { status: 200 },
    );
  }

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") ?? "search";
  const q = (url.searchParams.get("q") ?? "").trim();

  try {
    const items = mode === "liked" ? await likedTracks() : q ? await searchTracks(q) : [];
    return NextResponse.json({ configured: true, items });
  } catch (e) {
    return NextResponse.json({ configured: true, items: [], error: (e as Error).message }, { status: 502 });
  }
}
