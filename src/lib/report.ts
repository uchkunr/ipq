import { formatMs, formatPercent } from "@/lib/format";
import type { Box, TraceState, Verdict } from "@/lib/trace-state";

const STEP_NAMES: Record<string, string> = { dns: "DNS lookup", tcp: "Connection", tls: "Encryption", http: "Server response" };

/** Plain text a person can paste into a chat with their provider's support. */
export function buildReport(state: TraceState, verdict: Verdict | null, boxes: Box[]) {
  const lines: string[] = [];
  lines.push(`ipq connection report for ${state.host ?? "unknown site"}`);
  lines.push(`${new Date().toLocaleString()}, measured from this computer${state.address ? `, site address ${state.address}` : ""}`);
  lines.push("");
  if (verdict) {
    lines.push(`Result: ${verdict.title}`);
    lines.push(verdict.detail);
  } else {
    lines.push("Result: the check was stopped before a result was ready.");
  }
  lines.push("");
  lines.push("Route, one line per network:");
  lines.push("  This computer");
  boxes.forEach((box, i) => {
    const tested = box.sent > 0;
    const metrics = tested ? `${formatMs(box.delay)}, ${formatPercent(box.lost, box.sent)} lost` : "no reply";
    const mark = box.status === "problem" ? "  <- loss starts here" : box.status === "affected" ? "  <- affected" : "";
    lines.push(`  ${i + 1}. ${box.title} (${box.role}): ${metrics}${mark}`);
  });
  lines.push("");
  lines.push("Routers:");
  for (const hop of state.hops) {
    const network = [hop.owner?.asn && `AS${hop.owner.asn}`, hop.owner?.name].filter(Boolean).join(" ");
    const metrics = hop.sent ? `${formatMs(hop.avg)}, ${formatPercent(hop.lost, hop.sent)} lost of ${hop.sent}` : "no reply";
    lines.push(`  ${String(hop.n).padStart(2)}  ${(hop.ip ?? "*").padEnd(15)}  ${metrics}${network ? `  (${network})` : ""}`);
  }
  if (state.steps.length) {
    lines.push("");
    lines.push(
      `Timing: ${state.steps.map((s) => `${STEP_NAMES[s.id] ?? s.label} ${s.ms === null ? "failed" : formatMs(s.ms)}`).join(", ")}`,
    );
  }
  return lines.join("\n");
}
