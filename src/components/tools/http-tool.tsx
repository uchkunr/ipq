"use client";

import { useMemo } from "react";
import { Kv, Panel, Tag } from "@/components/kv";
import { ToolForm, ToolResult } from "@/components/tool-form";
import type { HttpResult } from "@/lib/server/http";
import { useTool } from "@/lib/use-tool";

const PARAMS = ["url"];

function statusTone(status: number) {
  if (status >= 500) return "bad" as const;
  if (status >= 400) return "warn" as const;
  if (status >= 300) return "muted" as const;
  return "good" as const;
}

export function HttpTool() {
  const { state, run, initial } = useTool<HttpResult & { from: string }>("/api/http", PARAMS);
  const fields = useMemo(() => [{ name: "url", label: "URL", placeholder: "https://example.com" }], []);
  return (
    <>
      <ToolForm
        fields={fields}
        action="Check"
        initial={initial}
        loading={state.status === "loading"}
        onSubmit={(values) => run({ url: values.url ?? "" })}
        examples={[
          { label: "http://github.com", values: { url: "http://github.com" } },
          { label: "vercel.com", values: { url: "vercel.com" } },
          { label: "example.com", values: { url: "example.com" } },
        ]}
      />
      <ToolResult state={state}>
        {(data) => {
          const last = data.hops.at(-1)!;
          return (
            <>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl font-semibold tabular-nums">{last.status}</span>
                <span className="text-lg">{last.statusText}</span>
                <span className="text-sm text-muted-foreground tabular-nums">{data.totalMs} ms total, {data.hops.length === 1 ? "no redirects" : `${data.hops.length - 1} redirect${data.hops.length > 2 ? "s" : ""}`}, checked from {data.from}</span>
              </div>
              <Panel title="Redirect chain">
                <ol className="flex flex-col gap-2 text-sm">
                  {data.hops.map((hop, i) => (
                    <li key={i} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3">
                      <Tag tone={statusTone(hop.status)}>{hop.status}</Tag>
                      <span className="min-w-0 font-mono text-[0.8125rem] [overflow-wrap:anywhere]">{hop.url}</span>
                      <span className="text-muted-foreground tabular-nums">{hop.ms} ms</span>
                    </li>
                  ))}
                </ol>
              </Panel>
              <Panel title="Security headers" aside={`${data.securityScore.present} of ${data.securityScore.total} present`}>
                <ul className="flex flex-col gap-2 text-sm">
                  {data.security.map((h) => (
                    <li key={h.name} className="grid grid-cols-[auto_1fr] gap-x-3">
                      <Tag tone={h.present ? "good" : "warn"}>{h.present ? "present" : "missing"}</Tag>
                      <span className="min-w-0">
                        <span className="font-mono text-[0.8125rem]">{h.name}</span>
                        <span className="block text-muted-foreground">{h.present ? <span className="font-mono text-xs [overflow-wrap:anywhere]">{h.value}</span> : h.why}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel title="Response headers" aside={`${data.headers.length}`}>
                <Kv rows={data.headers.map(([name, value]) => [name, <span key={name} className="font-mono text-[0.8125rem]">{value}</span>])} />
              </Panel>
            </>
          );
        }}
      </ToolResult>
    </>
  );
}
