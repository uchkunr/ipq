"use client";

import { useMemo } from "react";
import { Panel, Tag } from "@/components/kv";
import { ToolForm, ToolResult } from "@/components/tool-form";
import type { PortResult } from "@/lib/server/ports";
import { useTool } from "@/lib/use-tool";

const PARAMS = ["host", "ports"];
type Result = { host: string; address: string; results: PortResult[]; from: string };

const STATE = {
  open: { tone: "good" as const, label: "open", help: "Accepted the connection." },
  closed: { tone: "muted" as const, label: "closed", help: "The host answered that nothing listens here." },
  filtered: { tone: "warn" as const, label: "filtered", help: "No answer at all. A firewall is probably dropping the packets." },
};

export function PortsTool() {
  const { state, run, initial } = useTool<Result>("/api/ports", PARAMS);
  const fields = useMemo(
    () => [
      { name: "host", label: "Host name or IP", placeholder: "example.com" },
      { name: "ports", label: "Ports", placeholder: "22, 80, 443", inputMode: "text" as const, optional: true, width: "sm:w-48" },
    ],
    [],
  );
  return (
    <>
      <ToolForm
        fields={fields}
        action="Check"
        initial={initial}
        loading={state.status === "loading"}
        onSubmit={(values) => run({ host: values.host ?? "", ports: values.ports ?? "" })}
        examples={[
          { label: "github.com 22, 80, 443", values: { host: "github.com", ports: "22, 80, 443" } },
          { label: "1.1.1.1 53, 443, 853", values: { host: "1.1.1.1", ports: "53, 443, 853" } },
          { label: "example.com common ports", values: { host: "example.com", ports: "" } },
        ]}
      />
      <p className="-mt-3 text-sm text-muted-foreground">Leave ports empty to check the eight most common ones. Up to 20 ports per check.</p>
      <ToolResult state={state} skeleton={1}>
        {(data) => (
          <Panel title={`${data.host} (${data.address})`} aside={`checked from ${data.from}`}>
            <ul className="divide-y text-sm">
              {data.results.map((r) => (
                <li key={r.port} className="grid grid-cols-[4.5rem_5.5rem_1fr_auto] items-baseline gap-x-3 py-2 first:pt-0 last:pb-0">
                  <span className="font-mono text-[0.8125rem] tabular-nums">{r.port}</span>
                  <Tag tone={STATE[r.state].tone}>{STATE[r.state].label}</Tag>
                  <span className="min-w-0 text-muted-foreground">{r.service ?? ""}{r.service ? ". " : ""}{STATE[r.state].help}</span>
                  <span className="text-muted-foreground tabular-nums">{r.ms !== null ? `${r.ms} ms` : ""}</span>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </ToolResult>
    </>
  );
}
