"use client";

import { useMemo } from "react";
import { Kv, Panel, Tag, Verdict } from "@/components/kv";
import { ToolForm, ToolResult } from "@/components/tool-form";
import type { TlsResult } from "@/lib/server/tls";
import { useTool } from "@/lib/use-tool";

const PARAMS = ["host", "port"];

function when(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function SslTool() {
  const { state, run, initial } = useTool<TlsResult & { from: string }>("/api/ssl", PARAMS);
  const fields = useMemo(
    () => [
      { name: "host", label: "Host name", placeholder: "example.com" },
      { name: "port", label: "Port", placeholder: "443", inputMode: "numeric" as const, optional: true, width: "sm:w-24" },
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
        onSubmit={(values) => run({ host: values.host ?? "", port: values.port ?? "" })}
        examples={[
          { label: "github.com", values: { host: "github.com" } },
          { label: "expired.badssl.com", values: { host: "expired.badssl.com" } },
          { label: "self-signed.badssl.com", values: { host: "self-signed.badssl.com" } },
        ]}
      />
      <ToolResult state={state}>
        {(data) => {
          const leaf = data.chain[0];
          const expiryTone = data.daysLeft < 0 ? "bad" : data.daysLeft < 14 ? "bad" : data.daysLeft < 30 ? "warn" : "good";
          return (
            <>
              <div className="flex flex-col gap-1.5">
                <Verdict tone={data.trusted ? "good" : "bad"}>
                  {data.trusted ? `The certificate for ${data.host} is valid and trusted.` : `Browsers will not trust this certificate: ${data.reason}`}
                </Verdict>
                <Verdict tone={expiryTone}>
                  {data.daysLeft < 0 ? `Expired ${-data.daysLeft} days ago, on ${when(leaf.validTo)}.` : `Expires in ${data.daysLeft} days, on ${when(leaf.validTo)}.`}
                </Verdict>
              </div>
              <Panel title="Certificate" aside={`${data.ms} ms from ${data.from}`}>
                <Kv
                  rows={[
                    ["Issued to", leaf.subject],
                    ["Issued by", leaf.issuer],
                    ["Valid from", when(leaf.validFrom)],
                    ["Valid until", when(leaf.validTo)],
                    ["Protocol", data.protocol],
                    ["Cipher", data.cipher],
                    ["HTTP version", data.alpn === "h2" ? "HTTP/2" : data.alpn ?? null],
                    ["Address", data.address],
                    ["Fingerprint", <span key="fp" className="font-mono text-xs">{leaf.fingerprint}</span>],
                  ]}
                />
              </Panel>
              <Panel title="Covers these names" aside={`${data.sans.length}`}>
                <ul className="flex flex-wrap gap-1.5">
                  {data.sans.map((san) => (
                    <li key={san}><Tag tone={san.replace(/^\*\./, "") === data.host.replace(/^[^.]+\./, "") || san === data.host ? "good" : "muted"}>{san}</Tag></li>
                  ))}
                </ul>
              </Panel>
              <Panel title="Chain" aside={`${data.chain.length} certificates`}>
                <ol className="flex flex-col gap-3 text-sm">
                  {data.chain.map((cert, i) => (
                    <li key={cert.fingerprint} className="grid grid-cols-[1.25rem_1fr] gap-x-2">
                      <span className="text-muted-foreground tabular-nums">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="block font-medium [overflow-wrap:anywhere]">{cert.subject}</span>
                        <span className="block text-muted-foreground">{cert.selfSigned ? "Self-signed root" : `Issued by ${cert.issuer}`}, until {when(cert.validTo)}{cert.keyBits ? `, ${cert.keyBits}-bit key` : ""}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </Panel>
            </>
          );
        }}
      </ToolResult>
    </>
  );
}
