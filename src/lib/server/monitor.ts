import dgram from "node:dgram";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { HistoryReport, HistoryTarget, Sample, Zone } from "@/lib/types";
import { ping, traceRoute } from "./tools";

const DATA_DIR = path.join(process.cwd(), ".undertow");
const DATA_FILE = path.join(DATA_DIR, "samples.jsonl");
const INTERVAL_MINUTES = Math.max(1, Number(process.env.UNDERTOW_INTERVAL_MINUTES) || 5);
const PROBES_PER_BURST = 20;
const PROBE_GAP_MS = 500;

type Target = { id: string; label: string; zone: Zone; ip: string; kind: "icmp" | "udp-dns" };

const FIXED_TARGETS: Target[] = [
  { id: "cloudflare", label: "Cloudflare", zone: "internet", ip: "1.1.1.1", kind: "icmp" },
  { id: "google", label: "Google", zone: "internet", ip: "8.8.8.8", kind: "icmp" },
  { id: "google-udp", label: "Google over UDP", zone: "internet", ip: "8.8.8.8", kind: "udp-dns" },
  { id: "quad9", label: "Quad9", zone: "internet", ip: "9.9.9.9", kind: "icmp" },
  { id: "valve-sto", label: "Valve Stockholm", zone: "games", ip: "162.254.198.41", kind: "icmp" },
  { id: "valve-fra", label: "Valve Frankfurt", zone: "games", ip: "155.133.226.68", kind: "icmp" },
];

const QUERY = Buffer.from([
  0x12, 0x34, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 7, ...Buffer.from("example"), 3, ...Buffer.from("com"), 0, 0, 1, 0, 1,
]);

function udpDns(ip: string, timeoutMs = 900) {
  return new Promise<number | null>((resolve) => {
    const socket = dgram.createSocket("udp4");
    const start = performance.now();
    const finish = (value: number | null) => {
      clearTimeout(timer);
      socket.close();
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), timeoutMs);
    socket.once("error", () => finish(null));
    socket.once("message", () => finish(Math.round(performance.now() - start)));
    socket.send(QUERY, 53, ip);
  });
}

function isPrivate(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31);
}

function isCarrier(ip: string) {
  const [a, b] = ip.split(".").map(Number);
  return a === 100 && b >= 64 && b <= 127;
}

/** Finds the home router and the last hop inside the provider's own first public range. */
async function discoverLocalTargets(): Promise<Target[]> {
  const hops: string[] = [];
  await traceRoute("1.1.1.1", (hop) => hop.ip && hops.push(hop.ip), AbortSignal.timeout(20000), 6).catch(() => undefined);
  const found: Target[] = [];
  const router = hops.find(isPrivate);
  if (router) found.push({ id: "router", label: "Your router", zone: "home", ip: router, kind: "icmp" });
  const provider = hops.find((ip) => !isPrivate(ip) && !isCarrier(ip));
  if (provider) found.push({ id: "provider", label: "Your provider", zone: "provider", ip: provider, kind: "icmp" });
  return found;
}

async function burst(target: Target): Promise<Sample> {
  const results: (number | null)[] = await Promise.all(
    Array.from({ length: PROBES_PER_BURST }, async (_, i) => {
      await new Promise((r) => setTimeout(r, i * PROBE_GAP_MS));
      return target.kind === "icmp" ? ping(target.ip) : udpDns(target.ip);
    }),
  );
  const ok = results.filter((v): v is number => v !== null);
  return {
    t: Date.now(),
    id: target.id,
    label: target.label,
    zone: target.zone,
    sent: results.length,
    lost: results.length - ok.length,
    avg: ok.length ? Math.round((ok.reduce((a, b) => a + b, 0) / ok.length) * 10) / 10 : null,
    max: ok.length ? Math.max(...ok) : null,
  };
}

type State = { timer: NodeJS.Timeout | null; lastRun: number | null; busy: boolean; local: Target[] };

const shared = globalThis as typeof globalThis & { __undertowMonitor?: State };

async function sweep(state: State) {
  if (state.busy) return;
  state.busy = true;
  try {
    if (!state.local.length) state.local = await discoverLocalTargets();
    const samples = await Promise.all([...state.local, ...FIXED_TARGETS].map(burst));
    await mkdir(DATA_DIR, { recursive: true });
    await appendFile(DATA_FILE, samples.map((s) => JSON.stringify(s)).join("\n") + "\n");
    state.lastRun = Date.now();
  } catch (error) {
    console.error("Undertow monitor sweep failed:", error);
  } finally {
    state.busy = false;
  }
}

export function startMonitor() {
  if (shared.__undertowMonitor) return;
  const state: State = { timer: null, lastRun: null, busy: false, local: [] };
  shared.__undertowMonitor = state;
  setTimeout(() => void sweep(state), 3000).unref?.();
  state.timer = setInterval(() => void sweep(state), INTERVAL_MINUTES * 60 * 1000);
  state.timer.unref?.();
}

async function readSamples(from: number) {
  const text = await readFile(DATA_FILE, "utf8").catch(() => "");
  const samples: Sample[] = [];
  for (const line of text.split("\n")) {
    if (!line) continue;
    try {
      const sample = JSON.parse(line) as Sample;
      if (sample.t >= from) samples.push(sample);
    } catch {
      continue;
    }
  }
  return samples;
}

export async function readHistory(hours: number): Promise<HistoryReport> {
  const to = Date.now();
  const from = to - hours * 3600 * 1000;
  const samples = await readSamples(from);
  const byId = new Map<string, HistoryTarget & { rttSum: number; rttCount: number; hourRtt: number[] }>();
  for (const s of samples) {
    let row = byId.get(s.id);
    if (!row) {
      row = {
        id: s.id,
        label: s.label,
        zone: s.zone,
        sent: 0,
        lost: 0,
        avg: null,
        hours: Array.from({ length: 24 }, () => ({ sent: 0, lost: 0, avg: null })),
        rttSum: 0,
        rttCount: 0,
        hourRtt: new Array(24).fill(0),
      };
      byId.set(s.id, row);
    }
    const replied = s.sent - s.lost;
    const cell = row.hours[new Date(s.t).getHours()];
    row.sent += s.sent;
    row.lost += s.lost;
    cell.sent += s.sent;
    cell.lost += s.lost;
    if (s.avg !== null && replied > 0) {
      row.rttSum += s.avg * replied;
      row.rttCount += replied;
      row.hourRtt[new Date(s.t).getHours()] += s.avg * replied;
    }
  }
  const order: Zone[] = ["home", "provider", "internet", "games"];
  const targets = [...byId.values()]
    .map(({ rttSum, rttCount, hourRtt, ...row }) => ({
      ...row,
      avg: rttCount ? Math.round((rttSum / rttCount) * 10) / 10 : null,
      hours: row.hours.map((cell, i) => {
        const replied = cell.sent - cell.lost;
        return { ...cell, avg: replied ? Math.round((hourRtt[i] / replied) * 10) / 10 : null };
      }),
    }))
    .sort((a, b) => order.indexOf(a.zone) - order.indexOf(b.zone));

  return {
    from,
    to,
    samples: samples.length,
    running: Boolean(shared.__undertowMonitor),
    intervalMinutes: INTERVAL_MINUTES,
    lastRun: shared.__undertowMonitor?.lastRun ?? (samples.at(-1)?.t ?? null),
    targets,
  };
}
