import net from "node:net";
import { ToolError } from "./guard";

export const COMMON_PORTS: { port: number; service: string }[] = [
  { port: 21, service: "FTP" },
  { port: 22, service: "SSH" },
  { port: 25, service: "SMTP" },
  { port: 53, service: "DNS" },
  { port: 80, service: "HTTP" },
  { port: 110, service: "POP3" },
  { port: 143, service: "IMAP" },
  { port: 443, service: "HTTPS" },
  { port: 465, service: "SMTPS" },
  { port: 587, service: "SMTP submission" },
  { port: 993, service: "IMAPS" },
  { port: 995, service: "POP3S" },
  { port: 3306, service: "MySQL" },
  { port: 3389, service: "RDP" },
  { port: 5432, service: "PostgreSQL" },
  { port: 6379, service: "Redis" },
  { port: 8080, service: "HTTP alt" },
  { port: 8443, service: "HTTPS alt" },
  { port: 27017, service: "MongoDB" },
];

export const MAX_PORTS = 20;

export type PortResult = { port: number; service: string | null; state: "open" | "closed" | "filtered"; ms: number | null };

export function parsePorts(raw: string | null) {
  if (!raw) return COMMON_PORTS.slice(0, 8).map((p) => p.port);
  const ports = [...new Set(raw.split(/[,\s]+/).filter(Boolean).map(Number))];
  if (ports.some((p) => !Number.isInteger(p) || p < 1 || p > 65535)) throw new ToolError("Ports must be whole numbers between 1 and 65535.");
  if (ports.length > MAX_PORTS) throw new ToolError(`Check up to ${MAX_PORTS} ports at a time.`);
  return ports;
}

function probe(address: string, port: number, timeoutMs: number) {
  return new Promise<PortResult>((resolve) => {
    const start = performance.now();
    const service = COMMON_PORTS.find((p) => p.port === port)?.service ?? null;
    const socket = net.connect({ host: address, port });
    const done = (state: PortResult["state"], timed: boolean) => {
      socket.destroy();
      resolve({ port, service, state, ms: timed ? Math.round(performance.now() - start) : null });
    };
    socket.setTimeout(timeoutMs, () => done("filtered", false));
    socket.once("connect", () => done("open", true));
    socket.once("error", (error: NodeJS.ErrnoException) => done(error.code === "ECONNREFUSED" ? "closed" : "filtered", error.code === "ECONNREFUSED"));
  });
}

export async function checkPorts(address: string, ports: number[], timeoutMs = 3000) {
  return Promise.all(ports.map((port) => probe(address, port, timeoutMs)));
}
