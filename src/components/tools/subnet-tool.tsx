"use client";

import { useMemo, useState } from "react";
import { Kv, Panel } from "@/components/kv";
import { Input } from "@/components/ui/input";
import { useInitialSearch } from "@/lib/use-tool";

type Subnet = {
  network: string;
  broadcast: string;
  first: string;
  last: string;
  mask: string;
  wildcard: string;
  prefix: number;
  hosts: number;
  total: number;
  kind: string;
  binaryMask: string;
};

const toInt = (ip: string) => ip.split(".").reduce((acc, part) => ((acc << 8) | Number(part)) >>> 0, 0);
const toIp = (n: number) => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");

function kindOf(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  if (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) return "Private (RFC 1918)";
  if (a === 127) return "Loopback";
  if (a === 169 && b === 254) return "Link-local";
  if (a === 100 && b >= 64 && b <= 127) return "Carrier-grade NAT";
  if (a >= 224 && a <= 239) return "Multicast";
  if (a >= 240) return "Reserved";
  return "Public";
}

export function calculate(input: string): Subnet | { error: string } {
  const match = input.trim().match(/^(\d{1,3}(?:\.\d{1,3}){3})(?:\/(\d{1,2}))?$/);
  if (!match) return { error: "Enter an address with a prefix, like 10.0.0.0/22." };
  const [, ip, prefixText] = match;
  if (ip.split(".").some((p) => Number(p) > 255)) return { error: "Each part of the address must be 0 to 255." };
  const prefix = prefixText === undefined ? 24 : Number(prefixText);
  if (prefix > 32) return { error: "The prefix must be between 0 and 32." };
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const address = toInt(ip);
  const network = (address & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = 2 ** (32 - prefix);
  const hosts = prefix >= 31 ? total : total - 2;
  return {
    network: toIp(network),
    broadcast: toIp(broadcast),
    first: toIp(prefix >= 31 ? network : network + 1),
    last: toIp(prefix >= 31 ? broadcast : broadcast - 1),
    mask: toIp(mask),
    wildcard: toIp(~mask >>> 0),
    prefix,
    hosts,
    total,
    kind: kindOf(ip),
    binaryMask: toIp(mask).split(".").map((p) => Number(p).toString(2).padStart(8, "0")).join("."),
  };
}

export function SubnetTool() {
  const search = useInitialSearch();
  const [typed, setTyped] = useState<string | null>(null);
  const input = typed ?? (new URLSearchParams(search).get("q") || "192.168.1.0/24");
  const setInput = (value: string) => {
    setTyped(value);
    window.history.replaceState(null, "", `${window.location.pathname}?q=${encodeURIComponent(value)}`);
  };
  const result = useMemo(() => calculate(input), [input]);
  return (
    <>
      <div>
        <label htmlFor="cidr" className="sr-only">Address with prefix</label>
        <Input id="cidr" value={input} onChange={(e) => setInput(e.target.value)} placeholder="10.0.0.0/22" autoComplete="off" spellCheck={false} inputMode="text" autoFocus className="h-11 bg-card px-3 font-mono text-base md:text-base" />
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Try</span>
          {["10.0.0.0/8", "172.16.5.20/20", "192.168.1.130/26", "203.0.113.9/30"].map((example) => (
            <button key={example} type="button" onClick={() => setInput(example)} className="rounded-full border bg-card px-3 py-1 font-mono text-[0.8125rem] font-medium transition-colors hover:border-foreground/40 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              {example}
            </button>
          ))}
        </div>
      </div>
      {"error" in result ? (
        <p className="text-sm text-bad">{result.error}</p>
      ) : (
        <Panel title={`${result.network}/${result.prefix}`} aside={result.kind}>
          <Kv
            className="[&_dd]:font-mono [&_dd]:text-[0.8125rem] [&_dd]:tabular-nums"
            rows={[
              ["Network", result.network],
              ["Broadcast", result.prefix >= 31 ? "none" : result.broadcast],
              ["First host", result.first],
              ["Last host", result.last],
              ["Usable hosts", result.hosts.toLocaleString()],
              ["Total addresses", result.total.toLocaleString()],
              ["Subnet mask", result.mask],
              ["Wildcard mask", result.wildcard],
              ["Mask in binary", result.binaryMask],
            ]}
          />
        </Panel>
      )}
    </>
  );
}
