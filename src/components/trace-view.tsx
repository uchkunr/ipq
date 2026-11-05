"use client";

import { CircleAlert, CircleCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import { type FormEvent, type MouseEvent, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ConnectionTiming } from "@/components/connection-timing";
import { RoutePath } from "@/components/route-path";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMs, formatPercent } from "@/lib/format";
import { normalizeHost } from "@/lib/host";
import { buildBoxes, emptyTrace, MIN_TESTS, readVerdict, reduceTrace, type TraceState, type Verdict } from "@/lib/trace-state";
import type { TraceEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const EXAMPLES = ["google.com", "github.com", "playvalorant.com", "steampowered.com"];

type Action = { type: "reset"; host: string } | { type: "stop" } | { type: "batch"; events: TraceEvent[] };

function reducer(state: TraceState, action: Action): TraceState {
  if (action.type === "reset") return { ...emptyTrace, status: "running", host: action.host };
  if (action.type === "stop") return state.status === "running" ? { ...state, status: "stopped" } : state;
  return action.events.reduce(reduceTrace, state);
}

function useTrace() {
  const [state, dispatch] = useReducer(reducer, emptyTrace);
  const source = useRef<EventSource | null>(null);

  const stop = useCallback(() => {
    source.current?.close();
    source.current = null;
    dispatch({ type: "stop" });
  }, []);

  const start = useCallback((host: string) => {
    source.current?.close();
    dispatch({ type: "reset", host });
    const events = new EventSource(`/api/trace?host=${encodeURIComponent(host)}`);
    source.current = events;
    const queue: TraceEvent[] = [];
    let frame = 0;
    const flush = () => {
      frame = 0;
      if (source.current === events || queue.at(-1)?.type === "end") dispatch({ type: "batch", events: queue.splice(0) });
    };
    events.onmessage = (message) => {
      if (source.current !== events) return;
      const event = JSON.parse(message.data) as TraceEvent;
      if (event.type === "end") events.close();
      queue.push(event);
      frame ||= requestAnimationFrame(flush);
    };
    // EventSource reconnects by itself, which would silently restart the check.
    events.onerror = () => {
      events.close();
      if (source.current !== events) return;
      queue.push({ type: "error", message: "The connection to the local Undertow server was lost. Check that it is still running." });
      flush();
    };
  }, []);

  useEffect(() => () => source.current?.close(), []);
  return { state, start, stop };
}

const TONES = {
  good: { icon: CircleCheck, className: "text-good" },
  warn: { icon: TriangleAlert, className: "text-warn" },
  bad: { icon: CircleAlert, className: "text-bad" },
};

function Summary({ state, verdict }: { state: TraceState; verdict: Verdict | null }) {
  const running = state.status === "running";
  const destination = state.routeDone ? state.hops.at(-1) : undefined;
  const tests = destination?.sent ?? 0;
  const Icon = verdict ? TONES[verdict.tone].icon : LoaderCircle;
  const stats = [
    ["Latency", destination?.sent ? formatMs(destination.avg) : "-"],
    ["Packet loss", destination?.sent ? formatPercent(destination.lost, destination.sent) : "-"],
    ["Routers on path", state.hops.length ? String(state.hops.length) : "-"],
    ["Tests sent", String(state.hops.reduce((total, hop) => total + hop.sent, 0))],
  ];
  return (
    <Card className="gap-0 py-0">
      <div aria-live="polite" className="flex items-start gap-3 p-4">
        {verdict || running ? (
          <Icon className={cn("mt-0.5 size-5 shrink-0", verdict ? TONES[verdict.tone].className : "animate-spin text-muted-foreground")} aria-hidden />
        ) : (
          <CircleAlert className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight">
            {verdict?.title ?? (running ? `Testing ${state.host}` : "Check stopped")}
          </p>
          <p className="text-muted-foreground">
            {verdict?.detail ??
              (running
                ? tests
                  ? `${Math.min(tests, MIN_TESTS)} of ${MIN_TESTS} tests finished.`
                  : "Finding the route to the site."
                : `Stopped before ${MIN_TESTS} tests finished, so there is no result yet.`)}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 divide-x divide-y border-t sm:grid-cols-4 sm:divide-y-0">
        {stats.map(([label, value]) => (
          <div key={label} className="px-4 py-3">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function TraceView() {
  const { state, start, stop } = useTrace();
  const [input, setInput] = useState("");
  const [invalid, setInvalid] = useState(false);
  const running = state.status === "running";
  const idle = state.status === "idle";
  const verdict = useMemo(() => readVerdict(state), [state]);
  const boxes = useMemo(() => buildBoxes(state, verdict), [state, verdict]);

  const check = (value: string) => {
    const host = normalizeHost(value);
    setInvalid(!host);
    if (!host) return;
    setInput(host);
    start(host);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!running) check(input);
  };
  // This button becomes the submit button after a stop, so the click must not reach the form.
  const clickStop = (event: MouseEvent) => {
    event.preventDefault();
    stop();
  };

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="text-2xl font-semibold tracking-tight">Check a connection</h2>
        <p className="mt-1 text-muted-foreground">Enter a site to see its route and where packets are lost.</p>
        <form onSubmit={submit} className="mt-4 flex gap-2">
          <label htmlFor="host" className="sr-only">Site address</label>
          <Input
            id="host"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setInvalid(false);
            }}
            placeholder="example.com"
            aria-invalid={invalid}
            aria-describedby={invalid ? "host-error" : undefined}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            inputMode="url"
            className="h-10 bg-card text-base md:text-base"
          />
          {running ? (
            <Button key="stop" type="button" variant="outline" onClick={clickStop} className="h-10 bg-card px-4">
              Stop
            </Button>
          ) : (
            <Button key="check" type="submit" className="h-10 px-5">
              Check
            </Button>
          )}
        </form>
        {invalid && <p id="host-error" role="alert" className="mt-2 text-sm text-bad">Enter a valid site name, like google.com.</p>}
        {idle && (
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            Examples:
            {EXAMPLES.map((host) => (
              <button key={host} type="button" onClick={() => check(host)} className="text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary">
                {host}
              </button>
            ))}
          </p>
        )}
      </section>

      {state.error && (
        <p role="alert" className="rounded-lg bg-bad-soft p-3 text-bad">{state.error}</p>
      )}

      {!idle && !state.error && (
        <>
          <Summary state={state} verdict={verdict} />
          <section aria-label="Route">
            <h2 className="mb-3 font-semibold">Route to {state.host}</h2>
            <RoutePath boxes={boxes} running={running} />
          </section>
          <section aria-label="Connection timing">
            <h2 className="mb-3 font-semibold">Connection timing</h2>
            <ConnectionTiming steps={state.steps} running={running} />
          </section>
        </>
      )}
    </div>
  );
}
