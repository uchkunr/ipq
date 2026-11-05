import { resolvePublicHost, ToolError } from "./guard";

export type Hop = { url: string; status: number; statusText: string; ms: number; location: string | null };

export type SecurityHeader = { name: string; present: boolean; value: string | null; why: string };

export type HttpResult = {
  url: string;
  finalUrl: string;
  hops: Hop[];
  totalMs: number;
  headers: [string, string][];
  server: string | null;
  contentType: string | null;
  security: SecurityHeader[];
  securityScore: { present: number; total: number };
};

const SECURITY: { name: string; why: string }[] = [
  { name: "strict-transport-security", why: "Tells browsers to use HTTPS only." },
  { name: "content-security-policy", why: "Limits where scripts and other content may load from." },
  { name: "x-content-type-options", why: "Stops browsers from guessing file types." },
  { name: "x-frame-options", why: "Blocks the page from being embedded in other sites." },
  { name: "referrer-policy", why: "Controls how much of the URL is shared with other sites." },
  { name: "permissions-policy", why: "Turns off browser features the page does not need." },
];

const MAX_HOPS = 10;

export async function checkHttp(raw: string): Promise<HttpResult> {
  let input = raw.trim();
  if (!input) throw new ToolError("Enter a URL like https://example.com.");
  if (!/^https?:\/\//i.test(input)) input = `https://${input}`;
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new ToolError("That is not a valid URL.");
  }

  const hops: Hop[] = [];
  const started = performance.now();
  let current = url;
  for (let i = 0; i < MAX_HOPS; i++) {
    // Every hop is checked, because a redirect could otherwise point at an internal address.
    await resolvePublicHost(current.hostname);
    const start = performance.now();
    let response: Response;
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
        headers: { "user-agent": "Mozilla/5.0 (compatible; ipq HTTP check; +https://ipq.vercel.app/http)", accept: "*/*" },
        cache: "no-store",
      });
    } catch (error) {
      const timeout = error instanceof Error && error.name === "TimeoutError";
      throw new ToolError(timeout ? `${current.host} did not answer within 10 seconds.` : `Could not connect to ${current.host}: ${error instanceof Error ? (error.cause as Error | undefined)?.message ?? error.message : "request failed"}.`, 502);
    }
    const ms = Math.round(performance.now() - start);
    const location = response.headers.get("location");
    hops.push({ url: current.toString(), status: response.status, statusText: response.statusText, ms, location });
    void response.body?.cancel().catch(() => undefined);

    if (response.status >= 300 && response.status < 400 && location) {
      current = new URL(location, current);
      continue;
    }
    const headers = [...response.headers.entries()].sort(([a], [b]) => a.localeCompare(b));
    const security = SECURITY.map(({ name, why }) => {
      const value = response.headers.get(name);
      return { name, present: value !== null, value, why };
    });
    return {
      url: url.toString(),
      finalUrl: current.toString(),
      hops,
      totalMs: Math.round(performance.now() - started),
      headers,
      server: response.headers.get("server"),
      contentType: response.headers.get("content-type"),
      security,
      securityScore: { present: security.filter((s) => s.present).length, total: security.length },
    };
  }
  throw new ToolError(`Stopped after ${MAX_HOPS} redirects without reaching a final page.`, 502);
}
