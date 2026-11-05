"use client";

import { Check, CircleAlert, CircleCheck, Copy, LoaderCircle, RotateCw, TriangleAlert } from "lucide-react";
import { motion } from "motion/react";
import { type FormEvent, type MouseEvent, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ConnectionTiming } from "@/components/connection-timing";
import { RoutePath } from "@/components/route-path";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMs, formatPercent } from "@/lib/format";
import { normalizeHost } from "@/lib/host";
import { buildReport } from "@/lib/report";
import { type Box, buildBoxes, emptyTrace, MIN_TESTS, readVerdict, reduceTrace, type TraceState, type Verdict } from "@/lib/trace-state";
import type { TraceEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const EXAMPLES = ["google.com", "github.com", "playvalorant.com", "steampowered.com"];

type Action = { type: "reset"; host: string } | { type: "stop" } | { type: "batch"; events: TraceEvent[] };

function reducer(state: TraceState, action: Action): TraceState {
  if (action.type === "reset") return { ...emptyTrace, status: "running", host: action.host, startedAt: Date.now() };
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
      queue.push({ type: "error", message: "The connection to the local ipq server was lost. Check that it is still running." });
      flush();
    };
  }, []);

  useEffect(() => () => source.current?.close(), []);
  return { state, start, stop };
}

/** Seconds since the check started, ticking once a second while it runs. */
function useElapsed(startedAt: number | null, running: boolean) {
  const [seconds, setSeconds] = useState(0);
  const [tracked, setTracked] = useState(startedAt);
  if (tracked !== startedAt) {
    // A new check started, so the counter starts over.
    setTracked(startedAt);
    setSeconds(0);
  }
  useEffect(() => {
    if (!running || !startedAt) return;
    const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [running, startedAt]);
  return seconds;
}

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}:${String(s).padStart(2, "0")}` : `${s}s`;
}

const TONES = {
  good: { icon: CircleCheck, className: "text-good", bar: "bg-good" },
  warn: { icon: TriangleAlert, className: "text-warn", bar: "bg-warn" },
  bad: { icon: CircleAlert, className: "text-bad", bar: "bg-bad" },
};

function CopyReport({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(id);
  }, [copied]);
  return (
    <Button
      type="button"
      variant="outline"
      className="h-9 bg-card px-3"
      onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true))}
    >
      {copied ? <Check className="text-good" aria-hidden /> : <Copy aria-hidden />}
      {copied ? "Copied" : "Copy report"}
    </Button>
  );
}

function Summary({ state, verdict, boxes, onAgain }: { state: TraceState; verdict: Verdict | null; boxes: Box[]; onAgain: () => void }) {
  const running = state.status === "running";
  const destination = state.routeDone ? state.hops.at(-1) : undefined;
  const tests = Math.min(destination?.sent ?? 0, MIN_TESTS);
  const elapsed = useElapsed(state.startedAt, running);
  const Icon = verdict ? TONES[verdict.tone].icon : LoaderCircle;
  const problem = boxes.find((box) => box.status === "problem");
  const report = useMemo(() => buildReport(state, verdict, boxes), [state, verdict, boxes]);
  const stats = [
    ["Latency", destination?.sent ? formatMs(destination.avg) : "—"],
    ["Packet loss", destination?.sent ? formatPercent(destination.lost, destination.sent) : "—"],
    ["Routers on path", state.hops.length ? String(state.hops.length) : "—"],
    ["Loss begins at", verdict ? (problem?.title ?? "Nowhere") : "—"],
  ];

  let title: string;
  let detail: string;
  if (verdict) {
    title = verdict.title;
    detail = verdict.detail;
  } else if (running) {
    title = `Testing ${state.host}`;
    detail = state.routeDone
      ? `Pinging every router on the route. A result is ready after ${MIN_TESTS} tests.`
      : state.hops.length
        ? `Found ${state.hops.length} routers so far. Still looking for the rest of the route.`
        : "Finding the route to the site.";
  } else {
    title = "Check stopped";
    detail = `Stopped before ${MIN_TESTS} tests finished, so there is no result yet.`;
  }

  return (
    <section aria-live="polite" className="border-t pt-6">
      <div className="flex items-start gap-3">
        <Icon className={cn("mt-1 size-6 shrink-0", verdict ? TONES[verdict.tone].className : running ? "animate-spin text-muted-foreground" : "text-muted-foreground")} aria-hidden />
        <div className="min-w-0 flex-1">
          <motion.h2
            key={verdict ? "verdict" : "pending"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="text-2xl font-semibold tracking-tight text-balance"
          >
            {title}
          </motion.h2>
          <p className="mt-1 max-w-prose text-muted-foreground">{detail}</p>
          {running && !verdict && (
            <div className="mt-3 max-w-sm">
              <div className="flex justify-between text-sm text-muted-foreground tabular-nums">
                <span>{state.routeDone ? `${tests} of ${MIN_TESTS} tests` : "Finding the route"}</span>
                <span>{formatElapsed(elapsed)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary" aria-hidden>
                <motion.div
                  className="h-full rounded-full bg-foreground/60"
                  animate={{ width: state.routeDone ? `${Math.max(4, (tests / MIN_TESTS) * 100)}%` : "4%" }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              </div>
            </div>
          )}
          {running && verdict && (
            <p className="mt-2 text-sm text-muted-foreground tabular-nums">
              Still testing, {formatElapsed(elapsed)} so far. The numbers below keep updating until you stop.
            </p>
          )}
        </div>
      </div>
      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="min-w-0 border-l-2 pl-3">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="truncate text-lg font-semibold tabular-nums" title={value}>{value}</dd>
          </div>
        ))}
      </dl>
      {!running && (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" className="h-9 px-3" onClick={onAgain}>
            <RotateCw aria-hidden />
            Check again
          </Button>
          <CopyReport text={report} />
        </div>
      )}
      {running && verdict && (
        <div className="mt-5">
          <CopyReport text={report} />
        </div>
      )}
    </section>
  );
}

export function TraceView({ hosted = false }: { hosted?: boolean }) {
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

  if (hosted) {
    return (
      <div className="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <h2 className="text-lg font-semibold tracking-tight">This check runs on your computer, not here</h2>
        <p className="mt-2 max-w-prose text-muted-foreground">
          A server can only trace its own route, which says nothing about your Wi-Fi, router or provider. Run ipq locally and the check opens in your browser with the route from your machine, one stop per network, and the exact point where packets start to disappear.
        </p>
        <ol className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
          {[
            ["1", "Install Bun", "A fast JavaScript runtime, one command from bun.sh."],
            ["2", "Clone and start", "The command below installs dependencies and starts the local server."],
            ["3", "Open 127.0.0.1:3400", "Enter a site and let the check run for a minute."],
          ].map(([n, title, text]) => (
            <li key={n} className="rounded-lg bg-background p-3">
              <span className="block text-xs text-muted-foreground">Step {n}</span>
              <span className="block font-medium">{title}</span>
              <span className="block text-muted-foreground">{text}</span>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className={cn("font-semibold tracking-tight", idle ? "text-xl" : "text-lg")}>Check a connection</h2>
        {idle && (
          <p className="mt-1 max-w-prose text-muted-foreground">
            Enter a site. ipq finds every network between you and it, tests each one, and tells you where packets go missing.
          </p>
        )}
        <form onSubmit={submit} className="mt-3 flex gap-2">
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
            autoFocus
            spellCheck={false}
            inputMode="url"
            className="h-11 bg-card px-3 text-base md:text-base"
          />
          {running ? (
            <Button key="stop" type="button" variant="outline" onClick={clickStop} className="h-11 bg-card px-4">
              Stop
            </Button>
          ) : (
            <Button key="check" type="submit" className="h-11 px-5">
              Check
            </Button>
          )}
        </form>
        {invalid && <p id="host-error" role="alert" className="mt-2 text-sm text-bad">Enter a valid site name, like google.com.</p>}
        {idle && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Try</span>
            {EXAMPLES.map((host) => (
              <button
                key={host}
                type="button"
                onClick={() => check(host)}
                className="rounded-full border bg-card px-3 py-1 font-medium transition-colors hover:border-foreground/40 hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {host}
              </button>
            ))}
          </div>
        )}
      </section>

      {state.error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl bg-bad-soft px-4 py-3 text-bad">
          <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">{state.error}</p>
            <button type="button" onClick={() => state.host && check(state.host)} className="mt-1 text-sm underline underline-offset-4">
              Try again
            </button>
          </div>
        </div>
      )}

      {!idle && !state.error && (
        <>
          <Summary state={state} verdict={verdict} boxes={boxes} onAgain={() => state.host && check(state.host)} />
          <section aria-label="Route">
            <h2 className="font-semibold">Route to {state.host}</h2>
            <p className="mb-5 text-sm text-muted-foreground">Each stop is one network. Select a stop to see its routers.</p>
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
