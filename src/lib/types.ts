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

export type Remote = {
  ip: string;
  port: number;
  service: string;
  owner: string | null;
  country: string | null;
};

export type ProcessTraffic = {
  name: string;
  connections: number;
  remotes: Remote[];
};

export type TrafficSnapshot = {
  at: number;
  rxBps: number | null;
  txBps: number | null;
  connections: number;
  listening: number;
  processes: ProcessTraffic[];
  platform: string;
};

export type Zone = "home" | "provider" | "internet" | "games";

export type Sample = {
  t: number;
  id: string;
  label: string;
  zone: Zone;
  sent: number;
  lost: number;
  avg: number | null;
  max: number | null;
};

export type HourCell = { sent: number; lost: number; avg: number | null };

export type HistoryTarget = {
  id: string;
  label: string;
  zone: Zone;
  sent: number;
  lost: number;
  avg: number | null;
  hours: HourCell[];
};

export type HistoryReport = {
  from: number;
  to: number;
  samples: number;
  running: boolean;
  intervalMinutes: number;
  lastRun: number | null;
  targets: HistoryTarget[];
};
