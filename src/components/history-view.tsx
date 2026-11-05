"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatClock, formatMs, formatPercent } from "@/lib/format";
import type { HistoryReport, HourCell, Zone } from "@/lib/types";
import { cn } from "@/lib/utils";

const RANGES = [
  { hours: 24, label: "Last day" },
  { hours: 24 * 7, label: "Last week" },
  { hours: 24 * 30, label: "Last month" },
];

const ZONE_NAMES: Record<Zone, string> = {
  home: "Your home",
  provider: "Your provider",
  internet: "The wider internet",
  games: "Game servers",
};

function cellColor(cell: HourCell) {
  if (!cell.sent) return "transparent";
  const loss = (cell.lost / cell.sent) * 100;
  if (loss < 0.5) return "#a9dcc0";
  if (loss < 2) return "#f4d38f";
  if (loss < 5) return "#ec8f8f";
  return "var(--bad)";
}

function buildReport(report: HistoryReport) {
  const lines = [
    "Connection report from Undertow",
    `Period: ${new Date(report.from).toLocaleString()} to ${new Date(report.to).toLocaleString()}`,
    "",
    "Target: average delay, packets lost",
  ];
  for (const target of report.targets) {
    lines.push(`${target.label}: ${formatMs(target.avg)}, ${formatPercent(target.lost, target.sent)} (${target.lost} of ${target.sent})`);
  }
  const worst = report.targets
    .filter((t) => t.zone === "internet" || t.zone === "games")
    .flatMap((t) => t.hours.map((cell, hour) => ({ hour, cell })))
    .filter(({ cell }) => cell.sent > 0)
    .reduce<Record<number, { sent: number; lost: number }>>((all, { hour, cell }) => {
      all[hour] ??= { sent: 0, lost: 0 };
      all[hour].sent += cell.sent;
      all[hour].lost += cell.lost;
      return all;
    }, {});
  const ranked = Object.entries(worst)
    .sort(([, a], [, b]) => b.lost / b.sent - a.lost / a.sent)
    .slice(0, 3)
    .filter(([, value]) => value.lost > 0);
  if (ranked.length) {
    lines.push("", "Worst hours:");
    for (const [hour, value] of ranked) lines.push(`${String(hour).padStart(2, "0")}:00 - ${formatPercent(value.lost, value.sent)} lost`);
  }
  return lines.join("\n");
}

export function HistoryView() {
  const [hours, setHours] = useState(24);
  const [report, setReport] = useState<HistoryReport | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const load = () =>
      fetch(`/api/history?hours=${hours}`)
        .then((r) => r.json() as Promise<HistoryReport>)
        .then((data) => {
          if (active) {
            setReport(data);
            setFailed(false);
          }
        })
        .catch(() => active && setFailed(true));
    void load();
    const timer = setInterval(load, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [hours]);

  const copy = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(buildReport(report));
    toast("Report copied");
  };

  const zones = report ? ([...new Set(report.targets.map((t) => t.zone))] as Zone[]) : [];

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-[56ch]">
          <h2 className="text-2xl font-bold tracking-tight">When your connection is at its worst</h2>
          <p className="text-muted-foreground">
            {report
              ? `Undertow checks ${report.targets.length || 8} targets every ${report.intervalMinutes} minutes while it runs. Last check at ${formatClock(report.lastRun)}.`
              : "Loading measurements."}
          </p>
        </div>
        <Button onClick={copy} disabled={!report?.samples} className="h-10">
          Copy report for your provider
        </Button>
      </div>

      <div role="group" aria-label="Time range" className="mt-4 flex gap-5">
        {RANGES.map((range) => (
          <button
            key={range.hours}
            type="button"
            onClick={() => setHours(range.hours)}
            aria-pressed={hours === range.hours}
            className={cn(
              "rounded-sm underline-offset-4 focus-visible:outline-2 focus-visible:outline-primary",
              hours === range.hours ? "underline decoration-2" : "text-muted-foreground",
            )}
          >
            {range.label}
          </button>
        ))}
      </div>

      {failed && (
        <p role="alert" className="mt-4 text-bad">
          History could not be loaded. Check that the Undertow server is still running.
        </p>
      )}
      {report && report.samples === 0 && (
        <p className="mt-8 text-lg">The first check is under way. It takes about 15 seconds, and results appear here on their own.</p>
      )}

      {report && report.samples > 0 && (
        <div className="mt-5">
          <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-px text-center text-[0.7rem] text-muted-foreground" aria-hidden>
            {Array.from({ length: 24 }, (_, hour) => (
              <span key={hour}>{hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}</span>
            ))}
          </div>
          {zones.map((zone) => (
            <section key={zone} className="mt-4">
              <h3 className="font-semibold">{ZONE_NAMES[zone]}</h3>
              {report.targets
                .filter((t) => t.zone === zone)
                .map((target) => (
                  <div key={target.id} className="mt-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span>{target.label}</span>
                      <span className={cn(target.lost / target.sent >= 0.01 ? "text-bad" : "text-muted-foreground")}>
                        {formatPercent(target.lost, target.sent)} lost, {formatMs(target.avg)}
                      </span>
                    </div>
                    <div className="grid grid-cols-[repeat(24,minmax(0,1fr))] gap-px">
                      {target.hours.map((cell, hour) => (
                        <Tooltip key={hour}>
                          <TooltipTrigger
                            render={<span />}
                            className="h-6 rounded-[1px] border border-border/60"
                            style={{ background: cellColor(cell) }}
                            aria-label={`${hour}:00, ${cell.sent ? `${formatPercent(cell.lost, cell.sent)} lost` : "no measurements"}`}
                          />
                          <TooltipContent>
                            {String(hour).padStart(2, "0")}:00,{" "}
                            {cell.sent ? `${formatPercent(cell.lost, cell.sent)} lost, ${formatMs(cell.avg)}` : "no measurements"}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ))}
            </section>
          ))}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><i className="size-3 bg-[#a9dcc0]" />Under 0.5% lost</span>
            <span className="flex items-center gap-1.5"><i className="size-3 bg-[#f4d38f]" />Up to 2%</span>
            <span className="flex items-center gap-1.5"><i className="size-3 bg-[#ec8f8f]" />Up to 5%</span>
            <span className="flex items-center gap-1.5"><i className="size-3 bg-bad" />Over 5%</span>
          </div>
          <p className="mt-4 max-w-[70ch] text-sm text-muted-foreground">
            If your router and provider stay green while the rest turns red, the problem is past your home. Hours use this computer&apos;s local time.
          </p>
        </div>
      )}
    </div>
  );
}
