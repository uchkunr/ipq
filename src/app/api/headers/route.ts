import { visibleHeaders } from "@/lib/server/client-info";
import { jsonResponse, textResponse, wantsText } from "@/lib/server/negotiate";

export async function GET(request: Request) {
  const headers = visibleHeaders(request.headers);
  if (wantsText(request)) return textResponse(headers.map(([name, value]) => `${name}: ${value}`).join("\n"));
  return jsonResponse({ method: request.method, headers: Object.fromEntries(headers) });
}
