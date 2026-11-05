"use client";

import { useMemo } from "react";
import { Kv, Panel, Tag } from "@/components/kv";
import { ToolForm, ToolResult } from "@/components/tool-form";
import type { IpLookup } from "@/lib/server/lookup";
import { useTool } from "@/lib/use-tool";

const PARAMS = ["ip"];

const UNAVAILABLE_LABEL: Record<string, string> = {
  vpn_detection: "VPN",
  proxy_detection: "proxy",
  residential_proxy: "residential proxy",
  relay_detection: "relay",
  anycast: "anycast",
  carrier_mcc_mnc: "mobile carrier codes",
  place_or_venue: "venue",
  hosted_domains: "hosted domains",
  postal_code: "postal code",
  timezone: "time zone",
  accuracy_radius: "accuracy radius",
};

function Flag({ label, value, yes, no }: { label: string; value: boolean | null; yes: string; no: string }) {
  return (
    <li className="grid grid-cols-[6.5rem_auto_1fr] items-baseline gap-x-3 text-sm">
      <span>{label}</span>
      <Tag tone={value === null ? "muted" : value ? "warn" : "good"}>{value === null ? "unknown" : value ? "yes" : "no"}</Tag>
      <span className="text-muted-foreground">{value === null ? "No reliable free source for this address." : value ? yes : no}</span>
    </li>
  );
}

export function IpLookupTool({ address, heading = true }: { address?: string; heading?: boolean }) {
  const seed = useMemo(() => (address ? { ip: address } : undefined), [address]);
  const { state, run, initial } = useTool<IpLookup>("/api/lookup", PARAMS, seed);
  const fields = useMemo(() => [{ name: "ip", label: "IP address", placeholder: "Any IPv4 or IPv6 address, like 1.1.1.1", inputMode: "text" as const }], []);
  return (
    <section className="flex flex-col gap-5">
      {heading && (
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Look up any IP address</h2>
          <p className="mt-1 text-sm text-muted-foreground">Location, network, owner and abuse contact of any public address. Results come from RIPE Stat, MaxMind GeoLite2 and RDAP.</p>
        </div>
      )}
      <ToolForm
        fields={fields}
        action="Look up"
        initial={initial}
        loading={state.status === "loading"}
        onSubmit={(values) => run({ ip: values.ip ?? "" })}
        examples={
          address
            ? undefined
            : [
                { label: "1.1.1.1", values: { ip: "1.1.1.1" } },
                { label: "8.8.8.8", values: { ip: "8.8.8.8" } },
                { label: "2606:4700:4700::1111", values: { ip: "2606:4700:4700::1111" } },
              ]
        }
      />
      <ToolResult state={state} skeleton={4}>
        {(data) => {
          const place = [data.geo?.city, data.geo?.country].filter(Boolean).join(", ");
          return (
            <>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-2xl font-semibold tabular-nums [overflow-wrap:anywhere]">{data.ip}</span>
                {data.flags.is_bogon ? (
                  <span className="text-muted-foreground">Private or reserved address. It is not routed on the internet.</span>
                ) : (
                  <span className="text-muted-foreground">
                    {place || "Location unknown"}
                    {data.as ? `, ${data.as.name}` : ""}
                  </span>
                )}
              </div>
              {!data.flags.is_bogon && (
                <>
                  <Panel title="Location" aside={data.geo?.block ? `estimate for ${data.geo.block}` : undefined}>
                    {data.geo ? (
                      <Kv
                        rows={[
                          ["City", data.geo.city],
                          ["Country", data.geo.country ? `${data.geo.country} (${data.geo.country_code})` : null],
                          ["Continent", data.geo.continent],
                          [
                            "Coordinates",
                            data.geo.latitude !== null && data.geo.longitude !== null ? (
                              <a key="map" href={`https://www.openstreetmap.org/?mlat=${data.geo.latitude}&mlon=${data.geo.longitude}#map=10/${data.geo.latitude}/${data.geo.longitude}`} className="tabular-nums underline-offset-4 hover:underline" target="_blank" rel="noreferrer">
                                {data.geo.latitude.toFixed(4)}, {data.geo.longitude.toFixed(4)}
                              </a>
                            ) : null,
                          ],
                        ]}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">No location data for this address.</p>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">City-level at best. Mobile and VPN addresses can be hundreds of kilometres off.</p>
                  </Panel>
                  <Panel title="Network">
                    {data.as ? (
                      <Kv
                        rows={[
                          ["AS number", `AS${data.as.asn}`],
                          ["Name", data.as.name],
                          ["Type", data.as.type ? <Tag key="t">{data.as.type}</Tag> : null],
                          ["Announced as", data.as.prefix],
                          ["Prefixes announced", data.as.announced_prefixes?.toLocaleString() ?? null],
                          ["Reverse DNS", data.hostname],
                        ]}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">This address is not announced by any network right now.</p>
                    )}
                  </Panel>
                  <Panel title="Owner and abuse contact">
                    <Kv
                      rows={[
                        ["Organisation", data.company?.name],
                        ["Network block", data.company?.network],
                        ["Registry handle", data.company?.handle],
                        ["Allocation", data.company?.type],
                        ["Abuse contact", data.abuse?.name],
                        ["Abuse email", data.abuse?.email ? <a key="m" href={`mailto:${data.abuse.email}`} className="underline-offset-4 hover:underline">{data.abuse.email}</a> : null],
                        ["Abuse phone", data.abuse?.phone],
                        ["Address", data.abuse?.address],
                      ]}
                    />
                  </Panel>
                  <Panel title="Flags">
                    <ul className="flex flex-col gap-2">
                      <Flag label="Tor exit" value={data.flags.is_tor} yes="Listed as a Tor exit node right now." no="Not on the Tor exit list." />
                      <Flag label="Hosting" value={data.flags.is_hosting} yes="The network looks like a data centre or cloud provider." no="The network does not look like a hosting provider." />
                      <Flag label="Mobile" value={data.flags.is_mobile} yes="The network looks like a mobile carrier." no="The network does not look like a mobile carrier." />
                      <Flag label="Satellite" value={data.flags.is_satellite} yes="The network is a satellite provider." no="Not a known satellite provider." />
                    </ul>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Hosting, mobile and satellite are judged from the network name. Not available from free data: {data.unavailable.map((u) => UNAVAILABLE_LABEL[u] ?? u).join(", ")}.
                    </p>
                  </Panel>
                  <p className="text-xs text-muted-foreground">Sources: {data.sources.join(", ") || "none reachable"}.</p>
                </>
              )}
            </>
          );
        }}
      </ToolResult>
    </section>
  );
}
