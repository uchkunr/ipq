import { clientIp, rateLimit, toolResponse } from "@/lib/server/guard";
import { jsonResponse } from "@/lib/server/negotiate";
import { whois } from "@/lib/server/rdap";

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    rateLimit(`whois:${clientIp(request)}`, 30);
    const url = new URL(request.url);
    return jsonResponse(await whois(url.searchParams.get("q") ?? url.searchParams.get("domain") ?? ""));
  } catch (error) {
    return toolResponse(error);
  }
}
