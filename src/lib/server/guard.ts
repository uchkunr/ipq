import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { normalizeHost } from "@/lib/host";

export class ToolError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Addresses that must never be contacted on behalf of a visitor. */
export function isPublicIp(ip: string) {
  const kind = isIP(ip);
  if (kind === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 192 && b === 0) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
    return true;
  }
  if (kind === 6) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return false;
    if (v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb")) return false;
    if (v.startsWith("fc") || v.startsWith("fd")) return false;
    if (v.startsWith("::ffff:")) return isPublicIp(v.slice(7));
    return true;
  }
  return false;
}

/** Validates a host from user input and makes sure it points at the public internet. */
export async function resolvePublicHost(input: string | null | undefined) {
  const host = normalizeHost(input ?? "");
  if (!host) throw new ToolError("Enter a host name like example.com or a public IP address.");
  if (isIP(host)) {
    if (!isPublicIp(host)) throw new ToolError("Private and local addresses cannot be checked from here.");
    return { host, address: host };
  }
  let address: string;
  try {
    address = (await lookup(host)).address;
  } catch {
    throw new ToolError(`${host} does not resolve to an address.`, 404);
  }
  if (!isPublicIp(address)) throw new ToolError(`${host} points to a private address, which cannot be checked from here.`);
  return { host, address };
}

const buckets = new Map<string, number[]>();

/** A small per-instance limiter. Enough to stop a loop in a script, not a defence against a determined abuser. */
export function rateLimit(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) throw new ToolError("Too many requests from your address. Wait a minute and try again.", 429);
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 10_000) buckets.delete(buckets.keys().next().value as string);
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

/** Turns thrown errors into a JSON response with the right status. */
export function toolResponse(error: unknown) {
  if (error instanceof ToolError) return Response.json({ error: error.message }, { status: error.status });
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return Response.json({ error: message }, { status: 500 });
}

export const CHECKED_FROM = process.env.VERCEL_REGION ? `Vercel ${process.env.VERCEL_REGION}` : "this server";
