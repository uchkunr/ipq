import { lookupAll } from "@/lib/server/doh";
import { clientIp, rateLimit, toolResponse } from "@/lib/server/guard";
import { jsonResponse, textResponse } from "@/lib/server/negotiate";

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    rateLimit(`dns:${clientIp(request)}`, 60);
    const url = new URL(request.url);
    const result = await lookupAll(url.searchParams.get("name") ?? url.searchParams.get("q") ?? "", url.searchParams.get("type"));
    // JSON by default for scripts; ?text gives a dig-style listing.
    if (url.searchParams.has("text")) {
      const lines: string[] = [];
      for (const r of result.results) {
        lines.push(`; ${r.resolver} (${r.ms} ms) ${r.status}${r.note ? `: ${r.note}` : ""}`);
        for (const a of r.answers) lines.push(`${a.name}\t${a.ttl}\tIN\t${a.type}\t${a.data}`);
      }
      return textResponse(lines.join("\n"));
    }
    return jsonResponse(result);
  } catch (error) {
    return toolResponse(error);
  }
}
