/**
 * Neutral-looking codes for application links: ypciiiak.online/?s=<code>.
 * The code is the company name XOR-ed with a short key and base64url-encoded,
 * so the link doesn't spell out the company but no lookup table is needed.
 * Same algorithm as `python -m jobsearch link` and tools/ref-link.html in the job repo.
 */
const KEY = "ypc7r";

export function encodeRef(name: string): string {
  const bytes = new TextEncoder().encode(name.trim());
  const out = bytes.map((b, i) => b ^ KEY.charCodeAt(i % KEY.length));
  let bin = "";
  out.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeRef(code: string): string | null {
  try {
    const b64 = code.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    const bytes = Uint8Array.from(bin, (c, i) => c.charCodeAt(0) ^ KEY.charCodeAt(i % KEY.length));
    const name = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return /^[\p{L}\p{N} .,&()'+-]{1,60}$/u.test(name) ? name : null;
  } catch {
    return null;
  }
}
