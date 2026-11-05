import { execFile, spawn } from "node:child_process";

const WINDOWS = process.platform === "win32";

export function run(command: string, args: string[], timeoutMs = 8000) {
  return new Promise<string>((resolve) => {
    execFile(
      command,
      args,
      { timeout: timeoutMs, windowsHide: true, maxBuffer: 8 * 1024 * 1024 },
      (_error, stdout) => resolve(String(stdout ?? "")),
    );
  });
}

function pingArgs(ip: string, timeoutMs: number) {
  if (WINDOWS) return ["-n", "1", "-w", String(timeoutMs), ip];
  if (process.platform === "darwin") return ["-n", "-c", "1", "-W", String(timeoutMs), ip];
  return ["-n", "-c", "1", "-W", String(Math.max(1, Math.ceil(timeoutMs / 1000))), ip];
}

/**
 * Finds the round trip in one ping reply line without depending on the words around it.
 * Windows localises the output ("time=12ms", "время=12мс", "Zeit=12ms") and some consoles
 * mangle the letters, so the rule is: a number after "=" or "<" that is directly followed by
 * a short unit token. "bytes=32", "TTL=57" and "icmp_seq=1" are followed by a space or a
 * longer word and do not match.
 */
export function parsePingMs(out: string): number | null {
  if (!/ttl[=\s]/i.test(out)) return null;
  const match = out.match(/([=<])(\d+(?:[.,]\d+)?)(?![\d.,]) ?([^\s\d]\S{0,3})(?!\S)/);
  if (!match) return null;
  const value = Number(match[2].replace(",", "."));
  if (!Number.isFinite(value)) return null;
  // "time<1ms" means somewhere between 0 and 1, so report the middle.
  return match[1] === "<" ? value / 2 : value;
}

/** Sends one echo request. Returns the round trip in ms, or null when nothing came back. */
export async function ping(ip: string, timeoutMs = 900): Promise<number | null> {
  const out = await run("ping", pingArgs(ip, timeoutMs), timeoutMs + 1500);
  return parsePingMs(out);
}

export type RouteLine = { n: number; ip: string | null };

/** Streams the path to an address one hop at a time using the system trace tool. */
export function traceRoute(
  ip: string,
  onHop: (hop: RouteLine) => void,
  signal: AbortSignal,
  maxHops = 24,
) {
  return new Promise<void>((resolve, reject) => {
    const [command, args] = WINDOWS
      ? ["tracert", ["-d", "-h", String(maxHops), "-w", "700", ip]]
      : ["traceroute", ["-n", "-q", "1", "-w", "1", "-m", String(maxHops), ip]];

    // The command is one of two fixed names, so there is nothing for the bundler to trace.
    const child = spawn(/* turbopackIgnore: true */ command, args as string[], { windowsHide: true });
    const stop = () => child.kill();
    signal.addEventListener("abort", stop, { once: true });

    let buffer = "";
    child.stdout.on("data", (chunk: Buffer) => {
      buffer += chunk.toString("latin1");
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const row = line.match(/^\s*(\d{1,2})\s+(.*)$/);
        if (!row) continue;
        const found = row[2].match(/\b\d{1,3}(?:\.\d{1,3}){3}\b/);
        onHop({ n: Number(row[1]), ip: found ? found[0] : null });
      }
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      signal.removeEventListener("abort", stop);
      reject(
        error.code === "ENOENT"
          ? new Error(`${command} is not installed on this machine.`)
          : error,
      );
    });
    child.on("close", () => {
      signal.removeEventListener("abort", stop);
      resolve();
    });
  });
}
