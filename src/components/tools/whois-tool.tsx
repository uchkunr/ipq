"use client";

import { useMemo } from "react";
import { Kv, Panel, Tag } from "@/components/kv";
import { ToolForm, ToolResult } from "@/components/tool-form";
import type { WhoisResult } from "@/lib/server/rdap";
import { useTool } from "@/lib/use-tool";

const PARAMS = ["q"];
const EVENT: Record<string, string> = { registration: "Registered", expiration: "Expires", "last changed": "Last changed", "last update of RDAP database": "Database updated", transfer: "Transferred" };

function when(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function WhoisTool() {
  const { state, run, initial } = useTool<WhoisResult>("/api/whois", PARAMS);
  const fields = useMemo(() => [{ name: "q", label: "Domain, IP address or AS number", placeholder: "example.com, 1.1.1.1 or AS13335" }], []);
  return (
    <>
      <ToolForm
        fields={fields}
        action="Look up"
        initial={initial}
        loading={state.status === "loading"}
        onSubmit={(values) => run({ q: values.q ?? "" })}
        examples={[
          { label: "github.com", values: { q: "github.com" } },
          { label: "1.1.1.1", values: { q: "1.1.1.1" } },
          { label: "AS15169", values: { q: "AS15169" } },
        ]}
      />
      <ToolResult state={state}>
        {(data) => {
          const daysLeft = data.daysToExpiry;
          return (
            <>
              <Panel title={data.name} aside={`via ${data.source}`}>
                <Kv
                  rows={[
                    ...(data.kind === "domain"
                      ? ([
                          ["Registrar", data.registrar],
                          ["DNSSEC", data.dnssec === null ? null : data.dnssec ? "Signed" : "Not signed"],
                        ] as [string, React.ReactNode][])
                      : ([
                          ["Handle", data.handle],
                          ["Range", data.network ? `${data.network.start}${data.network.end ? ` to ${data.network.end}` : ""}` : null],
                          ["Type", data.network?.type],
                          ["Country", data.network?.country],
                        ] as [string, React.ReactNode][])),
                    ...data.events.map((e) => [EVENT[e.action] ?? e.action, <span key={e.action}>{when(e.date)}{e.action === "expiration" && daysLeft !== null && <span className={daysLeft < 30 ? "ml-2 text-bad" : "ml-2 text-muted-foreground"}>{daysLeft < 0 ? "expired" : `in ${daysLeft} days`}</span>}</span>] as [string, React.ReactNode]),
                    ["Status", data.status.length ? <span className="flex flex-wrap gap-1">{data.status.map((s) => <Tag key={s}>{s}</Tag>)}</span> : null],
                  ]}
                />
              </Panel>
              {data.nameservers.length > 0 && (
                <Panel title="Nameservers">
                  <ul className="font-mono text-[0.8125rem] leading-relaxed">
                    {data.nameservers.map((ns) => <li key={ns}>{ns}</li>)}
                  </ul>
                </Panel>
              )}
              {data.contacts.length > 0 && (
                <Panel title="Contacts">
                  <Kv rows={data.contacts.map((c) => [c.role, c.name])} />
                </Panel>
              )}
            </>
          );
        }}
      </ToolResult>
    </>
  );
}
