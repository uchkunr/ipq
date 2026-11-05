import { CHECKED_FROM, clientIp, rateLimit, resolvePublicHost, toolResponse } from "@/lib/server/guard";
import { jsonResponse } from "@/lib/server/negotiate";
import { checkPorts, parsePorts } from "@/lib/server/ports";

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    rateLimit(`ports:${clientIp(request)}`, 15);
    const url = new URL(request.url);
    const ports = parsePorts(url.searchParams.get("ports"));
    const { host, address } = await resolvePublicHost(url.searchParams.get("host") ?? url.searchParams.get("q"));
    const results = await checkPorts(address, ports);
    return jsonResponse({ host, address, results, from: CHECKED_FROM });
  } catch (error) {
    return toolResponse(error);
  }
}
