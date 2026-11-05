import { readHistory } from "@/lib/server/monitor";

export async function GET(request: Request) {
  const requested = Number(new URL(request.url).searchParams.get("hours"));
  const hours = Number.isFinite(requested) ? Math.min(Math.max(1, requested), 24 * 90) : 24;
  return Response.json(await readHistory(hours), { headers: { "cache-control": "no-store" } });
}
