import { isIP } from "node:net";
import { ToolError } from "./guard";

export const RECORD_TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "CAA", "SRV", "PTR"] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

const TYPE_NUMBERS: Record<number, string> = { 1: "A", 2: "NS", 5: "CNAME", 6: "SOA", 12: "PTR", 15: "MX", 16: "TXT", 28: "AAAA", 33: "SRV", 257: "CAA" };

export const RESOLVERS = [
  { id: "cloudflare", name: "Cloudflare", url: "https://cloudflare-dns.com/dns-query" },
  { id: "google", name: "Google", url: "https://dns.google/resolve" },
  { id: "quad9", name: "Quad9", url: "https://dns.quad9.net:5053/dns-query" },
] as const;

export type DnsAnswer = { name: string; type: string; ttl: number; data: string };
export type ResolverResult = {
  resolver: string;
  status: "ok" | "nxdomain" | "empty" | "error";
  ms: number;
  answers: DnsAnswer[];
  note?: string;
};

const STATUS_NOTE: Record<number, string> = { 2: "Server failure at the authoritative nameserver.", 3: "The name does not exist.", 5: "The resolver refused the query." };

/** Reverses an IP into its PTR name, so people can type an address instead of in-addr.arpa. */
export function ptrName(ip: string) {
  if (isIP(ip) === 4) return `${ip.split(".").reverse().join(".")}.in-addr.arpa`;
  if (isIP(ip) === 6) {
    const parts = ip.split("::");
    const head = parts[0] ? parts[0].split(":") : [];
    const tail = parts[1] ? parts[1].split(":") : [];
    const missing = 8 - head.length - tail.length;
    const full = [...head, ...Array(Math.max(0, missing)).fill("0"), ...tail].map((p) => p.padStart(4, "0")).join("");
    return `${full.split("").reverse().join(".")}.ip6.arpa`;
  }
  return ip;
}

/** Cleans TXT data, which arrives as quoted chunks ("v=spf1" " include:..."). */
function cleanData(type: string, data: string) {
  if (type !== "TXT") return data;
  return data
    .split(/"\s+"/)
    .map((part) => part.replace(/^"|"$/g, ""))
    .join("")
    .replace(/\\"/g, '"');
}

export async function queryResolver(resolver: (typeof RESOLVERS)[number], name: string, type: RecordType, timeoutMs = 5000): Promise<ResolverResult> {
  const start = performance.now();
  try {
    const url = `${resolver.url}?name=${encodeURIComponent(name)}&type=${type}`;
    const response = await fetch(url, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = (await response.json()) as { Status: number; Answer?: { name: string; type: number; TTL: number; data: string }[] };
    const ms = Math.round(performance.now() - start);
    const answers: DnsAnswer[] = (json.Answer ?? []).map((a) => ({
      name: a.name.replace(/\.$/, ""),
      type: TYPE_NUMBERS[a.type] ?? String(a.type),
      ttl: a.TTL,
      data: cleanData(TYPE_NUMBERS[a.type] ?? "", a.data),
    }));
    if (json.Status === 3) return { resolver: resolver.id, status: "nxdomain", ms, answers: [], note: STATUS_NOTE[3] };
    if (json.Status !== 0) return { resolver: resolver.id, status: "error", ms, answers: [], note: STATUS_NOTE[json.Status] ?? `DNS status ${json.Status}.` };
    return { resolver: resolver.id, status: answers.length ? "ok" : "empty", ms, answers };
  } catch (error) {
    return { resolver: resolver.id, status: "error", ms: Math.round(performance.now() - start), answers: [], note: error instanceof Error && error.name === "TimeoutError" ? "No answer within 5 seconds." : "The resolver could not be reached." };
  }
}

export type DnsLookup = { name: string; type: RecordType; results: ResolverResult[]; consistent: boolean };

export async function lookupAll(rawName: string, rawType: string | null): Promise<DnsLookup> {
  const type = (rawType ?? "A").toUpperCase() as RecordType;
  if (!RECORD_TYPES.includes(type)) throw new ToolError(`Unknown record type. Use one of ${RECORD_TYPES.join(", ")}.`);
  let name = rawName.trim().toLowerCase().replace(/\.$/, "");
  if (!name) throw new ToolError("Enter a domain name like example.com.");
  if (type === "PTR" && isIP(name)) name = ptrName(name);
  if (name.length > 253 || !/^[a-z0-9_.-]+$/.test(name)) throw new ToolError("That does not look like a domain name.");
  const results = await Promise.all(RESOLVERS.map((r) => queryResolver(r, name, type)));
  const sets = results.filter((r) => r.status !== "error").map((r) => r.answers.map((a) => `${a.type} ${a.data}`).sort().join("\n"));
  const consistent = sets.length > 1 && sets.every((s) => s === sets[0]);
  return { name, type, results, consistent };
}

/** One resolver, one record type, data only. Used by the email check. */
export async function quickRecords(name: string, type: RecordType) {
  const result = await queryResolver(RESOLVERS[0], name, type);
  return result.answers.filter((a) => a.type === type).map((a) => a.data);
}
