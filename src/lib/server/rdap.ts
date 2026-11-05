import { isIP } from "node:net";
import { normalizeHost } from "@/lib/host";
import { ToolError } from "./guard";

export type WhoisResult = {
  query: string;
  kind: "domain" | "ip" | "asn";
  name: string;
  handle: string | null;
  status: string[];
  events: { action: string; date: string }[];
  nameservers: string[];
  registrar: string | null;
  contacts: { role: string; name: string }[];
  dnssec: boolean | null;
  network: { start: string; end: string; type: string | null; country: string | null } | null;
  daysToExpiry: number | null;
  source: string;
};

type Entity = { roles?: string[]; vcardArray?: [string, [string, unknown, string, unknown][]]; entities?: Entity[]; handle?: string };

function vcardName(entity: Entity) {
  const fields = entity.vcardArray?.[1] ?? [];
  const fn = fields.find((f) => f[0] === "fn");
  const org = fields.find((f) => f[0] === "org");
  return String((fn?.[3] ?? org?.[3] ?? entity.handle ?? "")).trim();
}

function flattenEntities(entities: Entity[] | undefined, out: Entity[] = []) {
  for (const entity of entities ?? []) {
    out.push(entity);
    flattenEntities(entity.entities, out);
  }
  return out;
}

export async function whois(raw: string): Promise<WhoisResult> {
  const input = raw.trim().toLowerCase();
  if (!input) throw new ToolError("Enter a domain, IP address or AS number.");
  let kind: WhoisResult["kind"];
  let path: string;
  const asn = input.match(/^as?(\d{1,10})$/i) ?? input.match(/^(\d{1,10})$/);
  if (isIP(input)) {
    kind = "ip";
    path = `ip/${input}`;
  } else if (asn) {
    kind = "asn";
    path = `autnum/${asn[1]}`;
  } else {
    const host = normalizeHost(input);
    if (!host || !host.includes(".")) throw new ToolError("Enter a domain like example.com, an IP address or an AS number.");
    kind = "domain";
    // RDAP works on the registered domain, not on www or deeper labels.
    path = `domain/${host.split(".").slice(-2).join(".")}`;
  }

  const response = await fetch(`https://rdap.org/${path}`, {
    headers: { accept: "application/rdap+json, application/json" },
    signal: AbortSignal.timeout(10_000),
    redirect: "follow",
    cache: "no-store",
  });
  if (response.status === 404) throw new ToolError(kind === "domain" ? "No registration found. The domain may be free, or its registry does not publish RDAP data." : "No record found for that address.", 404);
  if (!response.ok) throw new ToolError(`The registry answered with HTTP ${response.status}.`, 502);
  const data = (await response.json()) as Record<string, unknown>;

  const entities = flattenEntities(data.entities as Entity[]);
  const registrar = entities.find((e) => e.roles?.includes("registrar"));
  const contacts = entities
    .filter((e) => e.roles?.length && !e.roles.includes("registrar"))
    .map((e) => ({ role: e.roles!.join(", "), name: vcardName(e) }))
    .filter((c) => c.name && !/redacted|data protected|not disclosed/i.test(c.name))
    .slice(0, 6);

  const events = Array.isArray(data.events)
    ? (data.events as { eventAction: string; eventDate: string }[]).map((e) => ({ action: e.eventAction, date: e.eventDate })).filter((e) => e.date)
    : [];
  const expiry = events.find((e) => e.action === "expiration");
  return {
    query: input,
    kind,
    name: String(data.ldhName ?? data.name ?? data.handle ?? input).toLowerCase(),
    handle: data.handle ? String(data.handle) : null,
    status: Array.isArray(data.status) ? (data.status as string[]) : [],
    events,
    daysToExpiry: expiry ? Math.floor((new Date(expiry.date).getTime() - Date.now()) / 86_400_000) : null,
    nameservers: Array.isArray(data.nameservers) ? (data.nameservers as { ldhName?: string }[]).map((n) => String(n.ldhName ?? "").toLowerCase()).filter(Boolean) : [],
    registrar: registrar ? vcardName(registrar) || null : null,
    contacts,
    dnssec: data.secureDNS && typeof data.secureDNS === "object" ? Boolean((data.secureDNS as { delegationSigned?: boolean }).delegationSigned) : null,
    network:
      kind !== "domain" && data.startAddress
        ? { start: String(data.startAddress), end: String(data.endAddress ?? ""), type: data.type ? String(data.type) : null, country: data.country ? String(data.country) : null }
        : null,
    source: response.url.replace(/^https?:\/\//, "").split("/")[0],
  };
}
