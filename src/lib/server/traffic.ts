import { readFile } from "node:fs/promises";
import type { ProcessTraffic, Remote, TrafficSnapshot } from "@/lib/types";
import { lookupOwner } from "./owners";
import { run } from "./tools";

type Connection = { process: string; ip: string; port: number };
type Reading = { connections: Connection[]; listening: number; rx: number | null; tx: number | null };

const SERVICES: Record<number, string> = {
  22: "SSH",
  53: "DNS",
  80: "Web",
  443: "Secure web",
  587: "Mail",
  993: "Mail",
  3478: "Voice and video",
  5222: "Messaging",
  5223: "Push messages",
  8080: "Web",
  8443: "Secure web",
};

function splitEndpoint(value: string) {
  const at = value.lastIndexOf(":");
  return { ip: value.slice(0, at).replace(/^\[|\]$/g, "").replace(/^::ffff:/, ""), port: Number(value.slice(at + 1)) };
}

function skipIp(ip: string) {
  return !ip || ip === "*" || ip === "0.0.0.0" || ip === "127.0.0.1" || ip === "::1" || ip === "::";
}

let processNames = new Map<string, string>();
let processNamesAt = 0;

async function windowsProcesses() {
  if (Date.now() - processNamesAt < 15000) return processNames;
  const out = await run("tasklist", ["/FO", "CSV", "/NH"]);
  const next = new Map<string, string>();
  for (const line of out.split(/\r?\n/)) {
    const cells = line.match(/"([^"]*)"/g);
    if (cells && cells.length >= 2) {
      next.set(cells[1].replace(/"/g, ""), cells[0].replace(/"/g, "").replace(/\.exe$/i, ""));
    }
  }
  processNames = next;
  processNamesAt = Date.now();
  return next;
}

async function readWindows(): Promise<Reading> {
  const [tcp, bytes, names] = await Promise.all([
    run("netstat", ["-ano", "-p", "TCP"]),
    run("netstat", ["-e"]),
    windowsProcesses(),
  ]);
  const connections: Connection[] = [];
  let listening = 0;
  for (const line of tcp.split(/\r?\n/)) {
    const cells = line.trim().split(/\s+/);
    if (cells[0] !== "TCP" || cells.length < 5) continue;
    if (cells[3] === "LISTENING") {
      listening++;
      continue;
    }
    if (cells[3] !== "ESTABLISHED") continue;
    const { ip, port } = splitEndpoint(cells[2]);
    if (skipIp(ip)) continue;
    connections.push({ process: names.get(cells[4]) ?? `Process ${cells[4]}`, ip, port });
  }
  const row = bytes.split(/\r?\n/).map((l) => l.trim().split(/\s+/)).find((c) => c.length >= 3 && /^\d+$/.test(c.at(-1) ?? "") && /^\d+$/.test(c.at(-2) ?? ""));
  return { connections, listening, rx: row ? Number(row.at(-2)) : null, tx: row ? Number(row.at(-1)) : null };
}

async function readLinux(): Promise<Reading> {
  const [tcp, listen, dev] = await Promise.all([
    run("ss", ["-H", "-tnp", "state", "established"]),
    run("ss", ["-H", "-tln"]),
    readFile("/proc/net/dev", "utf8").catch(() => ""),
  ]);
  const connections: Connection[] = [];
  for (const line of tcp.split("\n")) {
    const cells = line.trim().split(/\s+/);
    if (cells.length < 4) continue;
    const { ip, port } = splitEndpoint(cells[3]);
    if (skipIp(ip)) continue;
    const name = line.match(/users:\(\("([^"]+)"/)?.[1] ?? "Other users";
    connections.push({ process: name, ip, port });
  }
  let rx = 0;
  let tx = 0;
  for (const line of dev.split("\n").slice(2)) {
    const [iface, rest] = line.split(":");
    if (!rest || iface.trim() === "lo") continue;
    const values = rest.trim().split(/\s+/).map(Number);
    rx += values[0];
    tx += values[8];
  }
  return { connections, listening: listen.split("\n").filter(Boolean).length, rx: dev ? rx : null, tx: dev ? tx : null };
}

async function readMac(): Promise<Reading> {
  const [tcp, listen, ifaces] = await Promise.all([
    run("lsof", ["-nP", "-iTCP", "-sTCP:ESTABLISHED"]),
    run("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"]),
    run("netstat", ["-ib"]),
  ]);
  const connections: Connection[] = [];
  for (const line of tcp.split("\n").slice(1)) {
    const match = line.match(/^(\S+).*->(\S+)\s+\(ESTABLISHED\)/);
    if (!match) continue;
    const { ip, port } = splitEndpoint(match[2]);
    if (!skipIp(ip)) connections.push({ process: match[1], ip, port });
  }
  let rx = 0;
  let tx = 0;
  for (const line of ifaces.split("\n").slice(1)) {
    const cells = line.trim().split(/\s+/);
    if (!cells[2]?.startsWith("<Link#") || cells[0].startsWith("lo")) continue;
    rx += Number(cells.at(-5)) || 0;
    tx += Number(cells.at(-2)) || 0;
  }
  return { connections, listening: Math.max(0, listen.split("\n").filter(Boolean).length - 1), rx, tx };
}

function read() {
  if (process.platform === "win32") return readWindows();
  if (process.platform === "darwin") return readMac();
  return readLinux();
}

async function describe(connection: Connection): Promise<Remote> {
  const owner = await Promise.race([
    lookupOwner(connection.ip),
    new Promise<null>((r) => setTimeout(r, 250, null)),
  ]);
  return {
    ip: connection.ip,
    port: connection.port,
    service: SERVICES[connection.port] ?? `Port ${connection.port}`,
    owner: owner?.name ?? null,
    country: owner?.country ?? null,
  };
}

let previous: { at: number; rx: number; tx: number } | null = null;

export async function readTraffic(): Promise<TrafficSnapshot> {
  const reading = await read();
  const at = Date.now();
  let rxBps: number | null = null;
  let txBps: number | null = null;
  if (reading.rx !== null && reading.tx !== null) {
    if (previous && at > previous.at) {
      const seconds = (at - previous.at) / 1000;
      rxBps = Math.max(0, (reading.rx - previous.rx) * 8) / seconds;
      txBps = Math.max(0, (reading.tx - previous.tx) * 8) / seconds;
    }
    previous = { at, rx: reading.rx, tx: reading.tx };
  }

  const groups = new Map<string, Connection[]>();
  for (const connection of reading.connections) {
    const list = groups.get(connection.process) ?? [];
    list.push(connection);
    groups.set(connection.process, list);
  }
  const processes: ProcessTraffic[] = await Promise.all(
    [...groups.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(async ([name, list]) => {
        const unique = [...new Map(list.map((c) => [`${c.ip}:${c.port}`, c])).values()].slice(0, 12);
        return { name, connections: list.length, remotes: await Promise.all(unique.map(describe)) };
      }),
  );

  return {
    at,
    rxBps,
    txBps,
    connections: reading.connections.length,
    listening: reading.listening,
    processes,
    platform: process.platform,
  };
}
