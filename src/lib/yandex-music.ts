/** Parse Yandex Music links into iframe embed paths. */

export type YmEmbed =
  | { type: "track"; trackId: string; albumId: string }
  | { type: "album"; albumId: string }
  | { type: "playlist"; owner: string; kind: string }
  | { type: "artist"; artistId: string };

export interface YmItem {
  id: string;
  label: string;
  url: string;
  embed: YmEmbed;
  title?: string;
  artists?: string[];
  album?: string;
  cover?: string | null;
  durationMs?: number | null;
}

const IFRAME = "https://music.yandex.ru/iframe/#";

function parseHash(hash: string): YmEmbed | null {
  const track = hash.match(/^track\/(\d+)\/(\d+)$/);
  if (track) return { type: "track", trackId: track[1], albumId: track[2] };

  const album = hash.match(/^album\/(\d+)$/);
  if (album) return { type: "album", albumId: album[1] };

  const playlist = hash.match(/^playlist\/([^/]+)\/(\d+)$/);
  if (playlist) return { type: "playlist", owner: playlist[1], kind: playlist[2] };

  const artist = hash.match(/^artist\/(\d+)$/);
  if (artist) return { type: "artist", artistId: artist[1] };

  return null;
}

/** Turn a pasted link, hash fragment or iframe src into an embed descriptor. */
export function parseYmInput(raw: string): YmEmbed | null {
  const s = raw.trim();
  if (!s) return null;

  const hashInText = s.match(/#?(track\/\d+\/\d+|album\/\d+|playlist\/[^/\s"']+\/\d+|artist\/\d+)/);
  if (hashInText) return parseHash(hashInText[1].replace(/^#/, ""));

  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    if (!u.hostname.includes("yandex")) return null;

    const albumTrack = u.pathname.match(/\/album\/(\d+)\/track\/(\d+)/);
    if (albumTrack) return { type: "track", albumId: albumTrack[1], trackId: albumTrack[2] };

    const album = u.pathname.match(/\/album\/(\d+)/);
    if (album) return { type: "album", albumId: album[1] };

    const playlist = u.pathname.match(/\/users\/([^/]+)\/playlists\/(\d+)/);
    if (playlist) return { type: "playlist", owner: playlist[1], kind: playlist[2] };

    const artist = u.pathname.match(/\/artist\/(\d+)/);
    if (artist) return { type: "artist", artistId: artist[1] };
  } catch {
    return null;
  }
  return null;
}

export function ymEmbedSrc(embed: YmEmbed): string {
  switch (embed.type) {
    case "track":
      return `${IFRAME}track/${embed.trackId}/${embed.albumId}`;
    case "album":
      return `${IFRAME}album/${embed.albumId}`;
    case "playlist":
      return `${IFRAME}playlist/${embed.owner}/${embed.kind}`;
    case "artist":
      return `${IFRAME}artist/${embed.artistId}`;
  }
}

export function ymEmbedHeight(embed: YmEmbed): number {
  return embed.type === "track" ? 120 : 420;
}

export function ymDefaultLabel(embed: YmEmbed): string {
  switch (embed.type) {
    case "track":
      return `Трек ${embed.trackId}`;
    case "album":
      return `Альбом ${embed.albumId}`;
    case "playlist":
      return `Плейлист ${embed.kind}`;
    case "artist":
      return `Артист ${embed.artistId}`;
  }
}

export const YM_SAVED_KEY = "ym:saved";
export const YM_CURRENT_KEY = "ym:current";

export function loadSavedYm(): YmItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(YM_SAVED_KEY);
    return raw ? (JSON.parse(raw) as YmItem[]) : [];
  } catch {
    return [];
  }
}

export function persistSavedYm(items: YmItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(YM_SAVED_KEY, JSON.stringify(items.slice(0, 40)));
  } catch { /* quota */ }
}

export function loadCurrentYm(): YmItem | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(YM_CURRENT_KEY);
    return raw ? (JSON.parse(raw) as YmItem) : null;
  } catch {
    return null;
  }
}

export function persistCurrentYm(item: YmItem | null): void {
  if (typeof window === "undefined") return;
  try {
    if (item) localStorage.setItem(YM_CURRENT_KEY, JSON.stringify(item));
    else localStorage.removeItem(YM_CURRENT_KEY);
  } catch { /* quota */ }
}
