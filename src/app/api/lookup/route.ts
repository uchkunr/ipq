import { clientIp, rateLimit, toolResponse } from "@/lib/server/guard";
import { lookupIp } from "@/lib/server/lookup";
import { jsonResponse } from "@/lib/server/negotiate";

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    rateLimit(`lookup:${clientIp(request)}`, 40);
    const url = new URL(request.url);
    const ip = url.searchParams.get("ip") ?? url.searchParams.get("q") ?? clientIp(request);
    return jsonResponse(await lookupIp(ip));
  } catch (error) {
    return toolResponse(error);
  }
}
