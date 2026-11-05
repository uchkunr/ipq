import { readTraffic } from "@/lib/server/traffic";

const INTERVAL_MS = 2000;

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let stopped = false;
  request.signal.addEventListener("abort", () => (stopped = true), { once: true });

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      while (!stopped) {
        const started = Date.now();
        try {
          const snapshot = await readTraffic();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`));
        } catch {
          stopped = true;
          break;
        }
        await new Promise((r) => setTimeout(r, Math.max(200, INTERVAL_MS - (Date.now() - started))));
      }
      try {
        controller.close();
      } catch {
        stopped = true;
      }
    },
    cancel() {
      stopped = true;
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
