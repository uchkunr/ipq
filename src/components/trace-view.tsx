"use client";

import { Check, CircleAlert, LoaderCircle, Monitor } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type FormEvent, Fragment, useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMs, formatPercent } from "@/lib/format";
import { type Box, buildBoxes, emptyTrace, readVerdict, reduceTrace, type TraceState } from "@/lib/trace-state";
import type { FlowStep, TraceEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

const SUGGESTIONS = ["google.com", "playvalorant.com", "steampowered.com", "github.com"];

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

  const start = useCallback((input: string) => {
    source.current?.close();
    dispatch({ type: "reset", host: input });
    const url = `/api/trace?host=${encodeURIComponent(input)}`;
    const events = new EventSource(url);
    source.current = events;
    const queue: TraceEvent[] = [];
    let frame = 0;
    const flush = () => {
      frame = 0;
      dispatch({ type: "batch", events: queue.splice(0) });
    };
    events.onmessage = (message) => {
      const event = JSON.parse(message.data) as TraceEvent;
      if (event.type === "end") events.close();
      queue.push(event);
      frame ||= requestAnimationFrame(flush);
    };
    events.onerror = async () => {
      events.close();
      if (source.current !== events) return;
      const check = await fetch(url, { method: "HEAD" }).catch(() => null);
      const message =
        check?.status === 400
          ? "Enter a site name like google.com."
          : "Undertow lost contact with its local server. Check that it is still running.";
      queue.push({ type: "error", message });
      flush();
    };
  }, []);

  useEffect(() => () => source.current?.close(), []);
  return { state, start, stop };
}

const STATUS = {
  waiting: { text: "Checking", box: "border-border", label: "text-muted-foreground" },
  good: { text: "Working", box: "border-good", label: "text-good" },
  problem: { text: "Problem starts here", box: "border-bad bg-bad-soft", label: "text-bad" },
  affected: { text: "Affected", box: "border-warn", label: "text-warn" },
} as const;

function ProbeStrip({ recent }: { recent: (number | null)[] }) {
  if (!recent.length) return null;
  return (
    <span className="mt-2 flex h-2 gap-px overflow-hidden" aria-hidden>
      {recent.slice(-24).map((rtt, i) => (
        <span key={i} className={cn("h-full flex-1 max-w-1.5", rtt === null ? "bg-bad" : "bg-good/35")} />
      ))}
    </span>
  );
}

function PathBox({ box, open, onToggle }: { box: Box; open: boolean; onToggle: () => void }) {
  const status = STATUS[box.status];
  const expandable = box.hops.length > 0;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={!expandable}
      aria-expanded={open}
      className={cn(
        "w-full rounded-md border-2 bg-card p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:w-44",
        status.box,
        open && "ring-2 ring-primary",
      )}
    >
      <span className="block truncate font-semibold">{box.title}</span>
      <span className="block truncate text-sm text-muted-foreground">{box.role}</span>
      <span className={cn("mt-2 block text-sm font-medium", status.label)}>{status.text}</span>
      {box.sent > 0 && (
        <span className="block text-sm">
          {formatMs(box.delay)}, {formatPercent(box.lost, box.sent)} lost
        </span>
      )}
      <ProbeStrip recent={box.recent} />
    </button>
  );
}

function Link({ added }: { added: number | null }) {
  return (
    <span className="flex shrink-0 items-center justify-center gap-2 py-1 text-xs text-muted-foreground md:w-14 md:flex-col md:gap-0 md:py-0" aria-hidden>
      <span className="h-3 w-0.5 bg-input md:h-0.5 md:w-full" />
      {added !== null && added >= 1 && <span>+{Math.round(added)} ms</span>}
    </span>
  );
}

function PathChain({ boxes, running }: { boxes: Box[]; running: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const selected = boxes.find((b) => b.key === open);
  return (
    <div>
      <div className="flex flex-col md:flex-row md:flex-wrap md:items-stretch md:gap-y-3">
        <div className="flex items-center gap-3 rounded-md border-2 border-good bg-card p-3 md:w-44 md:flex-col md:items-start md:gap-1">
          <Monitor className="size-5 shrink-0" aria-hidden />
          <span>
            <span className="block font-semibold">This computer</span>
            <span className="block text-sm text-muted-foreground">Where the test starts</span>
          </span>
        </div>
        {boxes.map((box) => (
          <Fragment key={box.key}>
            <Link added={box.added} />
            <PathBox box={box} open={open === box.key} onToggle={() => setOpen(open === box.key ? null : box.key)} />
          </Fragment>
        ))}
      </div>
      {running && boxes.length < 3 && <p className="mt-3 text-sm text-muted-foreground">Finding the path, one stop at a time.</p>}
      <AnimatePresence initial={false}>
        {selected && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            <div className="mt-3 rounded-md bg-card p-3">
              <h3 className="font-semibold">Routers inside {selected.title}</h3>
              <ul className="mt-1">
                {selected.hops.map((hop) => (
                  <li key={hop.n} className="flex flex-wrap justify-between gap-x-4 border-b py-1.5 text-sm last:border-0">
                    <span>
                      Stop {hop.n}: {hop.ip ?? "does not reply to tests"}
                      {hop.owner?.asn ? `, AS${hop.owner.asn}` : ""}
                      {hop.owner?.country ? `, ${hop.owner.country}` : ""}
                    </span>
                    {hop.sent > 0 && <span>{formatMs(hop.avg)}, {formatPercent(hop.lost, hop.sent)} lost</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-sm text-muted-foreground">A single router that skips tests is normal. Loss only matters when it continues all the way to the site.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const STEP_NAMES: Record<FlowStep["id"], [string, string]> = {
  dns: ["Find the address", "Turns the name into an internet address"],
  tcp: ["Connect", "Opens a line to the server"],
  tls: ["Make it private", "Sets up encryption"],
  http: ["Get a reply", "The server starts answering"],
};
const STEP_ORDER: FlowStep["id"][] = ["dns", "tcp", "tls", "http"];

function SiteSteps({ steps, running }: { steps: FlowStep[]; running: boolean }) {
  const [open, setOpen] = useState<FlowStep["id"] | null>(null);
  const selected = steps.find((s) => s.id === open);
  return (
    <div>
      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {STEP_ORDER.map((id) => {
          const step = steps.find((s) => s.id === id);
          const [name, help] = STEP_NAMES[id];
          return (
            <li key={id}>
              <button
                type="button"
                disabled={!step}
                aria-expanded={open === id}
                onClick={() => setOpen(open === id ? null : id)}
                className={cn("flex h-full w-full items-start justify-between gap-2 rounded-md bg-card p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary", open === id && "ring-2 ring-primary")}
              >
                <span>
                  <span className="block font-semibold">{name}</span>
                  <span className="block text-sm text-muted-foreground">{help}</span>
                  <span className="mt-1 block text-sm">{step ? (step.ms === null ? "Failed" : formatMs(step.ms)) : running ? "Waiting" : "Skipped"}</span>
                </span>
                {step ? step.ok ? <Check className="size-5 shrink-0 text-good" aria-label="Passed" /> : <CircleAlert className="size-5 shrink-0 text-bad" aria-label="Failed" /> : running ? <LoaderCircle className="size-5 shrink-0 animate-spin text-muted-foreground" aria-hidden /> : null}
              </button>
            </li>
          );
        })}
      </ol>
      {selected && (
        <div className="mt-2 rounded-md bg-card p-3 text-sm">
          <p>{selected.summary}</p>
          {selected.facts.length > 0 && (
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3">
              {selected.facts.map(([label, value]) => (
                <Fragment key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="min-w-0 [overflow-wrap:anywhere]">{value}</dd>
                </Fragment>
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}

function Answer({ state }: { state: TraceState }) {
  const verdict = useMemo(() => readVerdict(state), [state]);
  const tested = state.hops.at(-1)?.sent ?? 0;
  const tone = verdict?.tone;
  return (
    <section aria-live="polite" className={cn("rounded-lg p-4", tone === "good" && "bg-good-soft", tone === "warn" && "bg-warn-soft", tone === "bad" && "bg-bad-soft", !tone && "bg-card")}>
      {state.error ? (
        <p role="alert" className="text-lg font-semibold text-bad">{state.error}</p>
      ) : verdict ? (
        <>
          <p className="text-xl font-bold">{verdict.title}</p>
          <p className="max-w-[70ch]">{verdict.detail}</p>
        </>
      ) : (
        <>
          <p className="text-xl font-bold">Checking {state.host}</p>
          <p className="text-muted-foreground">
            {state.status === "running" ? `The answer appears after about 15 seconds of testing. ${tested ? `${tested} of 15 tests done.` : ""}` : "Stopped before there was enough data for an answer."}
          </p>
        </>
      )}
    </section>
  );
}

export function TraceView() {
  const { state, start, stop } = useTrace();
  const [input, setInput] = useState("");
  const idle = state.status === "idle";
  const running = state.status === "running";
  const boxes = useMemo(() => buildBoxes(state, readVerdict(state)), [state]);

  const go = (value: string) => {
    const host = value.trim();
    if (!host) return;
    setInput(host);
    start(host);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    go(input);
  };

  return (
    <div className="flex flex-col gap-4">
      {idle && <h2 className="max-w-[24ch] pt-6 text-3xl font-bold tracking-tight sm:text-4xl">Find out where your internet is breaking</h2>}
      <form onSubmit={submit} className="flex max-w-2xl gap-2">
        <label htmlFor="host" className="sr-only">Site to check</label>
        <Input id="host" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a site, like google.com" autoComplete="off" autoCapitalize="none" spellCheck={false} inputMode="url" className="h-12 bg-card text-base md:text-base" />
        {running ? (
          <Button type="button" onClick={stop} variant="outline" className="h-12 bg-card px-5">Stop</Button>
        ) : (
          <Button type="submit" className="h-12 px-6">Check</Button>
        )}
      </form>

      {idle && (
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <span className="text-muted-foreground">Try</span>
          {SUGGESTIONS.map((host) => (
            <button key={host} type="button" onClick={() => go(host)} className="underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary">{host}</button>
          ))}
        </p>
      )}

      {!idle && (
        <>
          <Answer state={state} />
          {!state.error && (
            <>
              <section aria-label="Path to the site">
                <h2 className="mb-2 font-semibold">The path to {state.host}</h2>
                <PathChain boxes={boxes} running={running} />
              </section>
              <section aria-label="Opening the site">
                <h2 className="mb-2 font-semibold">Opening the site</h2>
                <SiteSteps steps={state.steps} running={running} />
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
