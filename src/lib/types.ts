export type Owner = {
  asn: number | null;
  name: string;
  country: string | null;
  kind: "private" | "carrier" | "public";
};

export type FlowStep = {
  id: "dns" | "tcp" | "tls" | "http";
  label: string;
  ms: number | null;
  ok: boolean;
  summary: string;
  facts: [string, string][];
};

export type TraceEvent =
  | { type: "start"; host: string; address: string }
  | { type: "step"; step: FlowStep }
  | { type: "hop"; n: number; ip: string | null }
  | { type: "owner"; ip: string; owner: Owner }
  | { type: "pulse"; n: number; rtt: number | null }
  | { type: "route-done" }
  | { type: "error"; message: string }
  | { type: "end" };
