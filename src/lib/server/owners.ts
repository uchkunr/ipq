import type { Owner } from "@/lib/types";

const cache = new Map<string, Promise<Owner>>();

function localOwner(ip: string): Owner | null {
  const [a, b] = ip.split(".").map(Number);
  if (a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31)) {
    return { asn: null, name: "Your local network", country: null, kind: "private" };
  }
  if (a === 169 && b === 254) {
    return { asn: null, name: "Link-local address", country: null, kind: "private" };
  }
  if (a === 100 && b >= 64 && b <= 127) {
    return { asn: null, name: "Provider shared address space (CGNAT)", country: null, kind: "carrier" };
  }
  return null;
}

export function cleanHolder(holder: string) {
  // RIPE holders look like "GOOGLE - Google LLC" or "RETN-AS RETN Limited".
  const named = holder.includes(" - ") ? holder.split(" - ").slice(1).join(" - ") : holder;
  const withoutHandle = named.replace(/^[A-Z0-9_-]{3,}\s+(?=\S)/, "");
  return withoutHandle.replace(/"/g, "").trim() || holder;
}

async function fetchOwner(ip: string): Promise<Owner> {
  const unknown: Owner = { asn: null, name: "Unknown network", country: null, kind: "public" };
  try {
    const signal = AbortSignal.timeout(8000);
    const [overview, geo] = await Promise.all([
      fetch(`https://stat.ripe.net/data/prefix-overview/data.json?sourceapp=ipq&resource=${ip}`, { signal }).then((r) => r.json()),
      fetch(`https://stat.ripe.net/data/rir-stats-country/data.json?sourceapp=ipq&resource=${ip}`, { signal })
        .then((r) => r.json())
        .catch(() => null),
    ]);
    const first = overview?.data?.asns?.[0];
    if (!first) return unknown;
    return {
      asn: first.asn ?? null,
      name: cleanHolder(String(first.holder ?? "Unknown network")),
      country: geo?.data?.located_resources?.[0]?.location ?? null,
      kind: "public",
    };
  } catch {
    return unknown;
  }
}

/** Who runs an address, from public RIPE data. Results are cached for the life of the server. */
export function lookupOwner(ip: string): Promise<Owner> {
  const local = localOwner(ip);
  if (local) return Promise.resolve(local);
  let pending = cache.get(ip);
  if (!pending) {
    pending = fetchOwner(ip);
    cache.set(ip, pending);
    if (cache.size > 5000) cache.delete(cache.keys().next().value as string);
  }
  return pending;
}
