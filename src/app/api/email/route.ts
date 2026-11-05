import { checkEmail } from "@/lib/server/email";
import { clientIp, rateLimit, toolResponse } from "@/lib/server/guard";
import { jsonResponse } from "@/lib/server/negotiate";

export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    rateLimit(`email:${clientIp(request)}`, 30);
    const url = new URL(request.url);
    return jsonResponse(await checkEmail(url.searchParams.get("domain") ?? url.searchParams.get("q") ?? "", url.searchParams.get("selector")));
  } catch (error) {
    return toolResponse(error);
  }
}
