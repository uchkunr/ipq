"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMs } from "@/lib/format";
import type { FlowStep } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Bars share one fixed scale so a slow step looks slow next to a fast one. */
const SCALE_MS = 1000;

const STEPS: { id: FlowStep["id"]; name: string; help: string; slowAfter: number }[] = [
  { id: "dns", name: "DNS lookup", help: "Finds the site's address", slowAfter: 150 },
  { id: "tcp", name: "Connection", help: "Opens a line to the server", slowAfter: 250 },
  { id: "tls", name: "Encryption", help: "Secures the connection", slowAfter: 400 },
  { id: "http", name: "Server response", help: "Time until the first reply", slowAfter: 800 },
];

export function ConnectionTiming({ steps, running }: { steps: FlowStep[]; running: boolean }) {
  const [open, setOpen] = useState<FlowStep["id"] | null>(null);
  return (
    <ol className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 divide-y">
      {STEPS.map(({ id, name, help, slowAfter }) => {
        const step = steps.find((s) => s.id === id);
        const expanded = open === id && step;
        const failed = step ? !step.ok || step.ms === null : false;
        const slow = Boolean(step && step.ms !== null && step.ms > slowAfter);
        const tone = failed ? "bad" : slow ? "warn" : "ok";
        return (
          <li key={id}>
            <button
              type="button"
              disabled={!step}
              aria-expanded={Boolean(expanded)}
              onClick={() => setOpen(open === id ? null : id)}
              className="grid w-full grid-cols-[1fr_auto_1rem] items-center gap-x-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:grid-cols-[11rem_1fr_6rem_1rem]"
            >
              <span className="min-w-0">
                <span className="block font-medium">{name}</span>
                <span className="block truncate text-sm text-muted-foreground">{help}</span>
              </span>
              <span className="hidden h-1.5 overflow-hidden rounded-full bg-secondary sm:block" aria-hidden>
                {step && step.ms !== null && (
                  <span
                    className={cn("block h-full rounded-full", tone === "bad" ? "bg-bad" : tone === "warn" ? "bg-warn" : "bg-foreground/55")}
                    style={{ width: `${Math.min(100, Math.max(1.5, (step.ms / SCALE_MS) * 100))}%` }}
                  />
                )}
              </span>
              <span className={cn("text-right font-medium tabular-nums", tone === "bad" && "text-bad", tone === "warn" && "text-warn")}>
                {step ? (
                  step.ms === null ? "Failed" : <>{formatMs(step.ms)}{slow && <span className="ml-1.5 text-xs font-normal">slow</span>}</>
                ) : running ? (
                  <Skeleton className="ml-auto h-4 w-12" />
                ) : (
                  "—"
                )}
              </span>
              {step ? <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} aria-hidden /> : <span />}
            </button>
            {expanded && (
              <div className="px-4 pb-3 text-sm">
                <p>{step.summary}</p>
                {step.facts.length > 0 && (
                  <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5">
                    {step.facts.map(([label, value]) => (
                      <div key={label} className="contents">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="min-w-0 [overflow-wrap:anywhere]">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
