"use client";

import { useMemo, useState } from "react";
import { Panel, Tag } from "@/components/kv";
import { ToolForm, ToolResult } from "@/components/tool-form";
import type { DnsLookup } from "@/lib/server/doh";
import { useTool } from "@/lib/use-tool";

const TYPES = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "CAA", "SRV", "PTR"];
const PARAMS = ["name", "type"];
const NAMES: Record<string, string> = { cloudflare: "Cloudflare 1.1.1.1", google: "Google 8.8.8.8", quad9: "Quad9 9.9.9.9" };

export function DnsTool() {
  const { state, run, initial } = useTool<DnsLookup>("/api/dns", PARAMS);
  const [type, setType] = useState("A");
  const fields = useMemo(() => [{ name: "name", label: "Domain name", placeholder: "example.com" }], []);
  return (
    <>
      <ToolForm
        fields={fields}
        action="Look up"
        initial={initial}
        loading={state.status === "loading"}
        onSubmit={(values) => run({ name: values.name ?? "", type: values.type ?? type })}
        examples={[
          { label: "google.com A", values: { name: "google.com", type: "A" } },
          { label: "github.com MX", values: { name: "github.com", type: "MX" } },
          { label: "cloudflare.com TXT", values: { name: "cloudflare.com", type: "TXT" } },
        ]}
      >
        <label className="sr-only" htmlFor="dns-type">Record type</label>
        <select
          id="dns-type"
          value={initial?.type && TYPES.includes(initial.type.toUpperCase()) && type === "A" ? initial.type.toUpperCase() : type}
          onChange={(e) => setType(e.target.value)}
          className="h-11 rounded-lg border border-input bg-card px-3 text-base focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:w-28"
        >
          {TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </ToolForm>

      <ToolResult state={state}>
        {(data) => (
          <>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{data.type}</span> records for <span className="font-medium text-foreground">{data.name}</span>.{" "}
              {data.consistent ? "All resolvers agree, so the record has propagated." : "Resolvers differ. A recent change may still be propagating, or the answers are location based."}
            </p>
            {data.results.map((r) => (
              <Panel key={r.resolver} title={NAMES[r.resolver] ?? r.resolver} aside={`${r.ms} ms`}>
                {r.answers.length ? (
                  <table className="w-full text-sm">
                    <thead className="sr-only">
                      <tr><th>Name</th><th>TTL</th><th>Type</th><th>Data</th></tr>
                    </thead>
                    <tbody className="divide-y">
                      {r.answers.map((a, i) => (
                        <tr key={i} className="align-top">
                          <td className="hidden py-1.5 pr-4 text-muted-foreground sm:table-cell">{a.name}</td>
                          <td className="py-1.5 pr-4 text-muted-foreground tabular-nums">{a.ttl}s</td>
                          <td className="py-1.5 pr-4"><Tag tone={a.type === data.type ? "muted" : "warn"}>{a.type}</Tag></td>
                          <td className="w-full py-1.5 font-mono text-[0.8125rem] [overflow-wrap:anywhere]">{a.data}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted-foreground">{r.status === "nxdomain" ? "This name does not exist." : r.status === "empty" ? `No ${data.type} record at this name.` : (r.note ?? "No answer.")}</p>
                )}
              </Panel>
            ))}
          </>
        )}
      </ToolResult>
    </>
  );
}
