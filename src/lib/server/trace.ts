import { lookup, resolve4, resolve6, resolveCname } from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";
import type { FlowStep, TraceEvent } from "@/lib/types";
import { isIpv4 } from "@/lib/host";
import { lookupOwner } from "./owners";
import { ping, traceRoute } from "./tools";

const TRACE_LIMIT_MS = 10 * 60 * 1000;
const PULSE_GAP_MS = 1000;

function since(start: number) {
  return Math.round((performance.now() - start) * 10) / 10;
}

async function resolveHost(host: string) {
  const start = performance.now();
  if (isIpv4(host)) {
    const step: FlowStep = {
      id: "dns",
      label: "Name lookup",
      ms: 0,
      ok: true,
      summary: "You entered an address, so no lookup was needed.",
      facts: [["Address", host]],
    };
    return { address: host, step };
  }
  const found = await lookup(host, { family: 4 });
  const ms = since(start);
  const [v4, v6, cname] = await Promise.all([
    resolve4(host).catch(() => [] as string[]),
    resolve6(host).catch(() => [] as string[]),
    resolveCname(host).catch(() => [] as string[]),
  ]);
  const facts: [string, string][] = [["Using", found.address]];
  if (cname.length) facts.push(["Alias of", cname.join(", ")]);
  if (v4.length > 1) facts.push(["IPv4 addresses", v4.join(", ")]);
  if (v6.length) facts.push(["IPv6 addresses", v6.slice(0, 3).join(", ")]);
  const step: FlowStep = {
    id: "dns",
    label: "Name lookup",
    ms,
    ok: true,
    summary: `${host} points to ${found.address}.`,
    facts,
  };
  return { address: found.address, step };
}

function tcpConnect(address: string, port: number) {
  return new Promise<number | null>((resolve) => {
    const start = performance.now();
    const socket = net.connect({ host: address, port });
    const finish = (value: number | null) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(4000, () => finish(null));
    socket.once("error", () => finish(null));
    socket.once("connect", () => finish(since(start)));
  });
}

function tlsHandshake(host: string, address: string) {
  return new Promise<FlowStep>((resolve) => {
    const start = performance.now();
    const socket = tls.connect({
      host: address,
      port: 443,
      servername: isIpv4(host) ? undefined : host,
      ALPNProtocols: ["h2", "http/1.1"],
      rejectUnauthorized: false,
    });
    const failed = (reason: string): FlowStep => ({
      id: "tls",
      label: "Secure connection",
      ms: null,
      ok: false,
      summary: reason,
      facts: [],
    });
    socket.setTimeout(5000, () => {
      socket.destroy();
      resolve(failed("The secure handshake timed out after 5 seconds."));
    });
    socket.once("error", (error) => {
      socket.destroy();
      resolve(failed(`The secure handshake failed: ${error.message}`));
    });
    socket.once("secureConnect", () => {
      const ms = since(start);
      const cert = socket.getPeerCertificate();
      const trusted = socket.authorized;
      const issuer = cert?.issuer?.O ?? cert?.issuer?.CN ?? "unknown issuer";
      const facts: [string, string][] = [
        ["Protocol", socket.getProtocol() ?? "unknown"],
        ["Cipher", socket.getCipher()?.name ?? "unknown"],
        ["Negotiated", String(socket.alpnProtocol || "http/1.1")],
        ["Certificate for", String(cert?.subject?.CN ?? host)],
        ["Issued by", String(issuer)],
        ["Expires", cert?.valid_to ? new Date(cert.valid_to).toDateString() : "unknown"],
      ];
      socket.destroy();
      resolve({
        id: "tls",
        label: "Secure connection",
        ms,
        ok: trusted,
        summary: trusted
          ? `Encrypted with ${facts[0][1]}, certificate from ${issuer}.`
          : `Encrypted, but the certificate is not trusted: ${String(socket.authorizationError)}.`,
        facts,
      });
    });
  });
}

async function httpRequest(host: string, secure: boolean, signal: AbortSignal): Promise<FlowStep> {
  let url = `${secure ? "https" : "http"}://${host}/`;
  const facts: [string, string][] = [];
  const start = performance.now();
  try {
    for (let i = 0; i < 6; i++) {
      const response = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
        headers: { "user-agent": "ipq connection check" },
      });
      const ms = since(start);
      void response.body?.cancel().catch(() => undefined);
      const location = response.headers.get("location");
      if (response.status >= 300 && response.status < 400 && location) {
        const next = new URL(location, url).toString();
        facts.push([`Redirect ${response.status}`, next]);
        url = next;
        continue;
      }
      facts.unshift(["Final address", url]);
      for (const [label, header] of [
        ["Server", "server"],
        ["Content type", "content-type"],
        ["Edge", "via"],
        ["Cache", "cf-cache-status"],
      ]) {
        const value = response.headers.get(header);
        if (value) facts.push([label, value]);
      }
      return {
        id: "http",
        label: "First byte",
        ms,
        ok: response.status < 500,
        summary: `The server answered ${response.status} ${response.statusText}`.trim() + ".",
        facts,
      };
    }
    return {
      id: "http",
      label: "First byte",
      ms: null,
      ok: false,
      summary: "Stopped after 6 redirects.",
      facts,
    };
  } catch (error) {
    return {
      id: "http",
      label: "First byte",
      ms: null,
      ok: false,
      summary: `No answer: ${error instanceof Error ? error.message : "request failed"}.`,
      facts,
    };
  }
}

async function runFlow(host: string, address: string, emit: (e: TraceEvent) => void, signal: AbortSignal) {
  const https = await tcpConnect(address, 443);
  const http = https === null ? await tcpConnect(address, 80) : null;
  const port = https !== null ? 443 : http !== null ? 80 : null;
  emit({
    type: "step",
    step: {
      id: "tcp",
      label: "Connection",
      ms: https ?? http,
      ok: port !== null,
      summary:
        port !== null
          ? `Reached ${address} on port ${port}.`
          : `${address} did not accept a connection on port 443 or 80.`,
      facts: port !== null ? [["Port", String(port)]] : [],
    },
  });
  if (port === null || signal.aborted) return;
  if (port === 443) emit({ type: "step", step: await tlsHandshake(host, address) });
  if (signal.aborted) return;
  emit({ type: "step", step: await httpRequest(host, port === 443, signal) });
}

async function pulseHop(n: number, ip: string, emit: (e: TraceEvent) => void, signal: AbortSignal) {
  while (!signal.aborted) {
    const started = Date.now();
    const rtt = await ping(ip);
    if (signal.aborted) return;
    emit({ type: "pulse", n, rtt });
    const wait = PULSE_GAP_MS - (Date.now() - started);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
}

export async function runTrace(host: string, emit: (e: TraceEvent) => void, outer: AbortSignal) {
  const signal = AbortSignal.any([outer, AbortSignal.timeout(TRACE_LIMIT_MS)]);
  let address: string;
  try {
    const resolved = await resolveHost(host);
    address = resolved.address;
    emit({ type: "start", host, address });
    emit({ type: "step", step: resolved.step });
  } catch {
    emit({ type: "error", message: `${host} could not be found. Check the spelling, or that it has an IPv4 address.` });
    return;
  }

  const pulses: Promise<void>[] = [];
  const onHop = (hop: { n: number; ip: string | null }) => {
    emit({ type: "hop", n: hop.n, ip: hop.ip });
    if (!hop.ip) return;
    const ip = hop.ip;
    void lookupOwner(ip).then((owner) => {
      if (!signal.aborted) emit({ type: "owner", ip, owner });
    });
    pulses.push(pulseHop(hop.n, ip, emit, signal));
  };

  const flow = runFlow(host, address, emit, signal).catch(() => undefined);
  const route = traceRoute(address, onHop, signal)
    .then(() => {
      if (!signal.aborted) emit({ type: "route-done" });
    })
    .catch((error: Error) => emit({ type: "error", message: error.message }));

  await Promise.all([flow, route]);
  await Promise.all(pulses);
}
