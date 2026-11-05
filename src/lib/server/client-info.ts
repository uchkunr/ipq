import { reverse } from "node:dns/promises";
import { isIP } from "node:net";
import { lookupOwner } from "./owners";
import { isPublicIp } from "./guard";

export type ClientInfo = {
  ip: string;
  version: 4 | 6 | null;
  local: boolean;
  hostname: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  network: { asn: number | null; name: string; country: string | null } | null;
  userAgent: string | null;
};

type HeaderSource = { get(name: string): string | null };

function decode(value: string | null) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function clientInfo(headers: HeaderSource): Promise<ClientInfo> {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  let ip = forwarded || headers.get("x-real-ip") || "127.0.0.1";
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  const version = isIP(ip) === 4 ? 4 : isIP(ip) === 6 ? 6 : null;
  const local = !version || !isPublicIp(ip);

  const [hostname, owner] = local
    ? [null, null]
    : await Promise.all([
        reverse(ip).then((names) => names[0] ?? null).catch(() => null),
        lookupOwner(ip).catch(() => null),
      ]);

  return {
    ip,
    version,
    local,
    hostname,
    country: headers.get("x-vercel-ip-country"),
    region: decode(headers.get("x-vercel-ip-country-region")),
    city: decode(headers.get("x-vercel-ip-city")),
    timezone: headers.get("x-vercel-ip-timezone"),
    network: owner && owner.kind === "public" ? { asn: owner.asn, name: owner.name, country: owner.country } : null,
    userAgent: headers.get("user-agent"),
  };
}

/** Headers a visitor would recognise as theirs, without the ones the platform adds for routing. */
export function visibleHeaders(headers: Headers) {
  return [...headers.entries()]
    .filter(([name]) => !/^(x-vercel-|x-forwarded-proto|x-forwarded-port|x-matched-path|x-invoke|x-middleware|forwarded$|x-real-ip|x-nextjs)/.test(name))
    .sort(([a], [b]) => a.localeCompare(b));
}
