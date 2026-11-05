"use client";

import { useMemo } from "react";
import { Panel, Verdict } from "@/components/kv";
import { ToolForm, ToolResult } from "@/components/tool-form";
import type { EmailResult } from "@/lib/server/email";
import { useTool } from "@/lib/use-tool";

const PARAMS = ["domain", "selector"];

function Record({ value }: { value: string | null }) {
  if (!value) return null;
  return <pre className="mt-2 overflow-x-auto rounded-lg bg-secondary px-3 py-2 font-mono text-[0.8125rem] whitespace-pre-wrap [overflow-wrap:anywhere]">{value}</pre>;
}

export function EmailTool() {
  const { state, run, initial } = useTool<EmailResult>("/api/email", PARAMS);
  const fields = useMemo(
    () => [
      { name: "domain", label: "Domain", placeholder: "example.com" },
      { name: "selector", label: "DKIM selector", placeholder: "DKIM selector (optional)", inputMode: "text" as const, optional: true, width: "sm:w-56" },
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
        onSubmit={(values) => run({ domain: values.domain ?? "", selector: values.selector ?? "" })}
        examples={[
          { label: "github.com", values: { domain: "github.com" } },
          { label: "google.com, selector 20230601", values: { domain: "google.com", selector: "20230601" } },
          { label: "example.com", values: { domain: "example.com" } },
        ]}
      />
      <p className="-mt-3 text-sm text-muted-foreground">Common DKIM selectors: google, default, selector1 and selector2 (Microsoft 365), k1 (Mailchimp), s1 and s2 (SendGrid).</p>
      <ToolResult state={state} skeleton={4}>
        {(data) => (
          <>
            <Panel title="MX, where mail is delivered">
              <Verdict tone={data.mx.verdict.tone}>{data.mx.verdict.text}</Verdict>
              {data.mx.records.length > 0 && (
                <ul className="mt-2 font-mono text-[0.8125rem] leading-relaxed">
                  {data.mx.records.map((r) => <li key={`${r.priority}-${r.host}`}><span className="text-muted-foreground">{r.priority}</span> {r.host}</li>)}
                </ul>
              )}
            </Panel>
            <Panel title="SPF, who may send">
              <Verdict tone={data.spf.verdict.tone}>{data.spf.verdict.text}</Verdict>
              <Record value={data.spf.record} />
            </Panel>
            <Panel title="DMARC, what happens when checks fail">
              <Verdict tone={data.dmarc.verdict.tone}>{data.dmarc.verdict.text}</Verdict>
              <Record value={data.dmarc.record} />
            </Panel>
            {data.dkim && (
              <Panel title={`DKIM, selector ${data.dkim.selector}`}>
                <Verdict tone={data.dkim.verdict.tone}>{data.dkim.verdict.text}</Verdict>
                <Record value={data.dkim.record} />
              </Panel>
            )}
          </>
        )}
      </ToolResult>
    </>
  );
}
