import { clientInfo } from "@/lib/server/client-info";
import { jsonResponse, textResponse, wantsText } from "@/lib/server/negotiate";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (wantsText(request) && !url.searchParams.has("full")) {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    return textResponse(forwarded || request.headers.get("x-real-ip") || "127.0.0.1");
  }
  const info = await clientInfo(request.headers);
  if (wantsText(request)) {
    const lines = [
      `ip        ${info.ip}`,
      `hostname  ${info.hostname ?? "-"}`,
      `network   ${info.network ? `${info.network.asn ? `AS${info.network.asn} ` : ""}${info.network.name}` : "-"}`,
      `location  ${[info.city, info.region, info.country].filter(Boolean).join(", ") || "-"}`,
      `timezone  ${info.timezone ?? "-"}`,
    ];
    return textResponse(lines.join("\n"));
  }
  return jsonResponse(info);
}
