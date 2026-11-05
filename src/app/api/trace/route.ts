import { normalizeHost } from "@/lib/host";
import { runTrace } from "@/lib/server/trace";
import type { TraceEvent } from "@/lib/types";

export async function GET(request: Request) {
  const host = normalizeHost(new URL(request.url).searchParams.get("host") ?? "");
  if (!host) {
    return Response.json({ message: "Enter a site name like google.com or an IPv4 address." }, { status: 400 });
  }

  const stop = new AbortController();
  request.signal.addEventListener("abort", () => stop.abort(), { once: true });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const emit = (event: TraceEvent) => {
        if (stop.signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        } catch {
          stop.abort();
        }
      };
      void runTrace(host, emit, stop.signal).finally(() => {
        emit({ type: "end" });
        try {
          controller.close();
        } catch {
          stop.abort();
        }
      });
    },
    cancel() {
      stop.abort();
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
