"use client";

import { Check, ChevronDown, CircleAlert } from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMs } from "@/lib/format";
import type { FlowStep } from "@/lib/types";
import { cn } from "@/lib/utils";

const STEPS: { id: FlowStep["id"]; name: string; help: string }[] = [
  { id: "dns", name: "DNS lookup", help: "Finds the site's address" },
  { id: "tcp", name: "Connection", help: "Opens a line to the server" },
  { id: "tls", name: "Encryption", help: "Secures the connection" },
  { id: "http", name: "Server response", help: "Time until the first reply" },
];

export function ConnectionTiming({ steps, running }: { steps: FlowStep[]; running: boolean }) {
  const [open, setOpen] = useState<FlowStep["id"] | null>(null);
  const longest = Math.max(1, ...steps.map((s) => s.ms ?? 0));
  return (
    <Card className="gap-0 py-0">
      <ol className="divide-y">
        {STEPS.map(({ id, name, help }) => {
          const step = steps.find((s) => s.id === id);
          const expanded = open === id && step;
          return (
            <li key={id}>
              <button
                type="button"
                disabled={!step}
                aria-expanded={Boolean(expanded)}
                onClick={() => setOpen(open === id ? null : id)}
                className="grid w-full grid-cols-[1.25rem_1fr_auto_1rem] items-center gap-x-3 px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:grid-cols-[1.25rem_12rem_1fr_5rem_1rem]"
              >
                {step ? (
                  step.ok ? <Check className="size-4 text-good" aria-label="Passed" /> : <CircleAlert className="size-4 text-bad" aria-label="Failed" />
                ) : (
                  <span />
                )}
                <span className="min-w-0">
                  <span className="block font-medium">{name}</span>
                  <span className="block truncate text-sm text-muted-foreground">{help}</span>
                </span>
                <span className="hidden h-1.5 overflow-hidden rounded-full bg-secondary sm:block" aria-hidden>
                  {step && <span className={cn("block h-full rounded-full", step.ok ? "bg-primary" : "bg-bad")} style={{ width: `${Math.max(2, ((step.ms ?? longest) / longest) * 100)}%` }} />}
                </span>
                <span className="text-right font-medium">
                  {step ? (step.ms === null ? "Failed" : formatMs(step.ms)) : running ? <Skeleton className="ml-auto h-4 w-12" /> : "-"}
                </span>
                {step ? <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} aria-hidden /> : <span />}
              </button>
              {expanded && (
                <div className="px-4 pb-3 text-sm sm:pl-12">
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
    </Card>
  );
}
