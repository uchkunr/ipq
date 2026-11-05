import { CHECKED_FROM, clientIp, rateLimit, resolvePublicHost, ToolError, toolResponse } from "@/lib/server/guard";
import { jsonResponse } from "@/lib/server/negotiate";
import { checkTls } from "@/lib/server/tls";

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    rateLimit(`ssl:${clientIp(request)}`, 20);
    const url = new URL(request.url);
    const raw = (url.searchParams.get("host") ?? url.searchParams.get("q") ?? "").replace(/^https?:\/\//, "");
    const port = Number(url.searchParams.get("port") ?? 443);
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new ToolError("Port must be between 1 and 65535.");
    const { host, address } = await resolvePublicHost(raw);
    const result = await checkTls(host, address, port);
    return jsonResponse({ ...result, from: CHECKED_FROM });
  } catch (error) {
    return toolResponse(error);
  }
}
