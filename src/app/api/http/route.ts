import { CHECKED_FROM, clientIp, rateLimit, toolResponse } from "@/lib/server/guard";
import { checkHttp } from "@/lib/server/http";
import { jsonResponse } from "@/lib/server/negotiate";

export const maxDuration = 60;

export async function GET(request: Request) {
  try {
    rateLimit(`http:${clientIp(request)}`, 20);
    const url = new URL(request.url);
    const result = await checkHttp(url.searchParams.get("url") ?? url.searchParams.get("q") ?? "");
    return jsonResponse({ ...result, from: CHECKED_FROM });
  } catch (error) {
    return toolResponse(error);
  }
}
