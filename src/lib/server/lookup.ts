import { reverse } from "node:dns/promises";
import { isIP } from "node:net";
import { isPublicIp, ToolError } from "./guard";
import { cleanHolder } from "./owners";

export type IpLookup = {
  ip: string;
  version: 4 | 6;
  hostname: string | null;
  geo: {
    city: string | null;
    country_code: string | null;
    country: string | null;
    continent: string | null;
    latitude: number | null;
    longitude: number | null;
    /** The block the location estimate applies to. */
    block: string | null;
  } | null;
  as: { asn: number; name: string; country: string | null; prefix: string | null; announced_prefixes: number | null; type: "isp" | "hosting" | "business" | "education" | "government" | null } | null;
  company: { name: string | null; network: string | null; handle: string | null; type: string | null; country: string | null } | null;
  abuse: { name: string | null; email: string | null; phone: string | null; address: string | null; network: string | null } | null;
  flags: {
    is_tor: boolean | null;
    is_hosting: boolean | null;
    is_mobile: boolean | null;
    is_satellite: boolean | null;
    is_bogon: boolean;
  };
  /** Fields that need data this site does not have. Listed so nobody mistakes a missing value for a negative one. */
  unavailable: string[];
  sources: string[];
};

const UNAVAILABLE = ["vpn_detection", "proxy_detection", "residential_proxy", "relay_detection", "anycast", "carrier_mcc_mnc", "place_or_venue", "hosted_domains", "postal_code", "timezone", "accuracy_radius"];

const HOSTING = /\b(hosting|host|cloud|server|servers|datacenter|data center|data-center|vps|dedicated|colo|colocation|amazon|aws|google llc|microsoft|azure|hetzner|ovh|digitalocean|linode|akamai|vultr|contabo|leaseweb|scaleway|oracle|alibaba|tencent|cloudflare|fastly|godaddy|ionos|hostinger|namecheap|rackspace|choopa|psychz|m247|datacamp|cdn77|edgecast|upcloud|kamatera|iomart|hostwinds|limestone)\b/i;
// Generic words only. Brand names such as Orange or Vodafone run fixed lines too, so they would mislabel home connections.
const MOBILE = /\b(mobile|mobility|wireless|cellular|gsm|lte|umts|4g|5g|moviles|mobil)\b/i;
const SATELLITE = /\b(starlink|space exploration technologies|spacex|viasat|hughes|hughesnet|oneweb|eutelsat|inmarsat|iridium|kacific)\b/i;
const EDUCATION = /\b(university|universit|college|school|institute|academy|research|education)\b/i;
const GOVERNMENT = /\b(government|ministry|municipal|federal|state of|department of|agency)\b/i;

const RIPE = "https://stat.ripe.net/data";

async function ripe<T>(call: string, resource: string, timeoutMs = 6000): Promise<T | null> {
  try {
    const response = await fetch(`${RIPE}/${call}/data.json?sourceapp=ipq&resource=${encodeURIComponent(resource)}`, { signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
    if (!response.ok) return null;
    const json = (await response.json()) as { data?: T };
    return json.data ?? null;
  } catch {
    return null;
  }
}

type Entity = { roles?: string[]; handle?: string; vcardArray?: [string, [string, Record<string, string>, string, unknown][]]; entities?: Entity[] };

function vcard(entity: Entity | undefined, key: string): string | null {
  const field = entity?.vcardArray?.[1]?.find((f) => f[0] === key);
  if (!field) return null;
  if (key === "adr") {
    const label = field[1]?.label;
    if (label) return label.replace(/\s*\n\s*/g, ", ");
    const parts = Array.isArray(field[3]) ? (field[3] as string[]).filter(Boolean) : [];
    return parts.length ? parts.join(", ") : null;
  }
  const value = field[3];
  return typeof value === "string" && value.trim() && !/^\+\d{0,3}$/.test(value.trim()) ? value.trim() : null;
}

function allEntities(entities: Entity[] | undefined, out: Entity[] = []) {
  for (const e of entities ?? []) {
    out.push(e);
    allEntities(e.entities, out);
  }
  return out;
}

async function rdapIp(ip: string) {
  try {
    const response = await fetch(`https://rdap.org/ip/${ip}`, { headers: { accept: "application/rdap+json" }, signal: AbortSignal.timeout(8000), redirect: "follow", cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown> & { entities?: Entity[]; cidr0_cidrs?: { v4prefix?: string; v6prefix?: string; length: number }[] };
  } catch {
    return null;
  }
}

let torCache: { set: Set<string>; at: number } | null = null;

/** Tor exit nodes, refreshed hourly. Null when the list could not be fetched, which is "unknown", not "no". */
async function isTorExit(ip: string): Promise<boolean | null> {
  if (!torCache || Date.now() - torCache.at > 3_600_000) {
    try {
      const response = await fetch("https://check.torproject.org/torbulkexitlist", { signal: AbortSignal.timeout(6000), cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const text = await response.text();
      torCache = { set: new Set(text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"))), at: Date.now() };
    } catch {
      if (!torCache) return null;
    }
  }
  return torCache.set.has(ip);
}

const CONTINENTS: Record<string, string> = { AF: "Africa", AN: "Antarctica", AS: "Asia", EU: "Europe", NA: "North America", OC: "Oceania", SA: "South America" };

/** Country to continent for the codes RIPE returns. Only the common ones; the rest fall back to null. */
const COUNTRY_CONTINENT: Record<string, string> = Object.fromEntries(
  [
    ["EU", "AL AD AT BY BE BA BG HR CY CZ DK EE FI FR DE GR HU IS IE IT XK LV LI LT LU MT MD MC ME NL MK NO PL PT RO RU SM RS SK SI ES SE CH UA GB VA"],
    ["AS", "AF AM AZ BH BD BT BN KH CN GE IN ID IR IQ IL JP JO KZ KW KG LA LB MY MV MN MM NP KP OM PK PS PH QA SA SG KR LK SY TW TJ TH TL TR TM AE UZ VN YE HK MO"],
    ["NA", "US CA MX GT BZ SV HN NI CR PA CU DO HT JM BS BB TT PR GL BM"],
    ["SA", "AR BO BR CL CO EC GY PY PE SR UY VE"],
    ["AF", "DZ AO BJ BW BF BI CM CV CF TD KM CD CG CI DJ EG GQ ER SZ ET GA GM GH GN GW KE LS LR LY MG MW ML MR MU MA MZ NA NE NG RW ST SN SC SL SO ZA SS SD TZ TG TN UG ZM ZW"],
    ["OC", "AU NZ FJ PG SB VU WS TO KI FM MH PW NR TV NC PF GU"],
  ].flatMap(([continent, codes]) => codes.split(" ").map((code) => [code, continent])),
);

function countryName(code: string | null) {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

function asType(name: string): "isp" | "hosting" | "business" | "education" | "government" {
  if (HOSTING.test(name)) return "hosting";
  if (EDUCATION.test(name)) return "education";
  if (GOVERNMENT.test(name)) return "government";
  if (MOBILE.test(name) || /(telecom|telekom|telco|broadband|internet|communications|cable|fiber|fibre|\bisp\b|\bnet\b|\bonline\b)/i.test(name)) return "isp";
  return "business";
}

export async function lookupIp(raw: string): Promise<IpLookup> {
  const ip = raw.trim();
  const version = isIP(ip);
  if (version !== 4 && version !== 6) throw new ToolError("Enter an IPv4 or IPv6 address like 1.1.1.1.");
  const sources: string[] = [];

  if (!isPublicIp(ip)) {
    return {
      ip,
      version,
      hostname: null,
      geo: null,
      as: null,
      company: null,
      abuse: null,
      flags: { is_tor: false, is_hosting: null, is_mobile: null, is_satellite: null, is_bogon: true },
      unavailable: UNAVAILABLE,
      sources,
    };
  }

  type Geo = { located_resources?: { locations?: { country?: string; city?: string; latitude?: number; longitude?: number; resources?: string[] }[] }[] };
  type Prefix = { asns?: { asn: number; holder: string }[]; resource?: string };
  type Announced = { prefixes?: unknown[] };

  const [geo, prefix, rdap, hostname, tor] = await Promise.all([
    ripe<Geo>("maxmind-geo-lite", ip),
    ripe<Prefix>("prefix-overview", ip),
    rdapIp(ip),
    reverse(ip).then((names) => names[0] ?? null).catch(() => null),
    isTorExit(ip),
  ]);

  // Anycast and unlocated blocks come back as country "?" at 0,0. That is "unknown", not the Gulf of Guinea.
  const rawLocation = geo?.located_resources?.[0]?.locations?.[0];
  const located = rawLocation && rawLocation.country && rawLocation.country !== "?" && !(rawLocation.latitude === 0 && rawLocation.longitude === 0);
  const location = located ? rawLocation : undefined;
  if (location) sources.push("MaxMind GeoLite2 via RIPE Stat");
  const asn = prefix?.asns?.[0];
  if (asn) sources.push("RIPE Stat");
  const announced = asn ? await ripe<Announced>("announced-prefixes", `AS${asn.asn}`, 5000) : null;
  const holder = asn ? cleanHolder(asn.holder.replace(new RegExp(`^AS${asn.asn}\\s+`), "")) : "";

  const entities = allEntities(rdap?.entities);
  const abuseEntity = entities.find((e) => e.roles?.includes("abuse"));
  const isOrgName = (e: Entity) => {
    const fn = vcard(e, "fn");
    return Boolean(fn) && !/-MNT$/i.test(fn ?? "") && vcard(e, "kind") !== "individual";
  };
  const orgEntity = entities.find((e) => e.roles?.includes("registrant") && isOrgName(e)) ?? entities.find((e) => e.roles?.includes("administrative") && isOrgName(e));
  const companyName = (vcard(orgEntity, "fn") ?? (rdap?.name ? String(rdap.name) : null) ?? vcard(abuseEntity, "fn"))?.replace(/"/g, "").trim() ?? null;
  const cidr = rdap?.cidr0_cidrs?.[0];
  const network = cidr ? `${cidr.v4prefix ?? cidr.v6prefix}/${cidr.length}` : rdap?.startAddress ? `${rdap.startAddress} - ${rdap.endAddress}` : null;
  if (rdap) sources.push("RDAP");
  if (tor !== null) sources.push("Tor Project exit list");

  const rdapCountry = rdap?.country && String(rdap.country) !== "?" ? String(rdap.country) : null;
  const countryCode = location?.country ?? rdapCountry;
  const continentCode = countryCode ? (COUNTRY_CONTINENT[countryCode] ?? null) : null;
  const signal = `${holder} ${String(rdap?.name ?? "")} ${companyName ?? ""} ${hostname ?? ""}`;

  return {
    ip,
    version,
    hostname,
    geo: location
      ? {
          city: location.city || null,
          country_code: countryCode,
          country: countryName(countryCode),
          continent: continentCode ? CONTINENTS[continentCode] : null,
          latitude: location.latitude ?? null,
          longitude: location.longitude ?? null,
          block: location.resources?.[0] ?? null,
        }
      : countryCode
        ? { city: null, country_code: countryCode, country: countryName(countryCode), continent: continentCode ? CONTINENTS[continentCode] : null, latitude: null, longitude: null, block: null }
        : null,
    as: asn
      ? { asn: asn.asn, name: holder, country: countryCode, prefix: prefix?.resource ?? null, announced_prefixes: announced?.prefixes?.length ?? null, type: asType(holder) }
      : null,
    company: rdap
      ? { name: companyName, network, handle: rdap.handle ? String(rdap.handle) : null, type: rdap.type ? String(rdap.type) : null, country: rdapCountry }
      : null,
    abuse: abuseEntity
      ? { name: vcard(abuseEntity, "fn"), email: vcard(abuseEntity, "email"), phone: vcard(abuseEntity, "tel"), address: vcard(abuseEntity, "adr"), network }
      : null,
    flags: {
      is_tor: tor,
      is_hosting: asn ? HOSTING.test(signal) : null,
      is_mobile: asn ? MOBILE.test(signal) : null,
      is_satellite: asn ? SATELLITE.test(signal) : null,
      is_bogon: false,
    },
    unavailable: UNAVAILABLE,
    sources,
  };
}
