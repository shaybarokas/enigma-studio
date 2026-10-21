// Reads the text of a page the user pasted (sales page, site, Instagram bio) so the agent can fill
// the brief from it. Public http(s) only; private and local addresses are refused.
const PRIVATE = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|169\.254\.|\[?::1\]?$|.*\.local$|.*\.internal$)/i;

export function findLinks(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s<>"']+/g)].map((m) => m[0]).slice(0, 2);
}

export async function linkText(url: string): Promise<string | null> {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol) || PRIVATE.test(u.hostname)) return null;
    const res = await fetch(u, {
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (EnigmaStudio)", "Accept-Language": "he,en" },
    });
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) return null;
    const html = (await res.text()).slice(0, 600_000);
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "";
    const desc = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] ?? "";
    const body = html
      .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
    return `${title}\n${desc}\n${body}`.slice(0, 8000);
  } catch {
    return null;
  }
}
