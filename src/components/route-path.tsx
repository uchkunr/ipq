"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMs, formatPercent } from "@/lib/format";
import type { Box, BoxStatus } from "@/lib/trace-state";
import { cn } from "@/lib/utils";

/** The line between two stops takes the colour of the stop it arrives at. */
const LINE: Record<BoxStatus, string> = {
  waiting: "bg-[repeating-linear-gradient(90deg,var(--input)_0_6px,transparent_6px_12px)] max-md:bg-[repeating-linear-gradient(180deg,var(--input)_0_6px,transparent_6px_12px)]",
  good: "bg-good",
  quiet: "bg-good",
  problem: "bg-[repeating-linear-gradient(90deg,var(--bad)_0_6px,transparent_6px_12px)] max-md:bg-[repeating-linear-gradient(180deg,var(--bad)_0_6px,transparent_6px_12px)]",
  affected: "bg-bad",
  silent: "bg-[repeating-linear-gradient(90deg,var(--input)_0_6px,transparent_6px_12px)] max-md:bg-[repeating-linear-gradient(180deg,var(--input)_0_6px,transparent_6px_12px)]",
};

const DOT: Record<BoxStatus, string> = {
  waiting: "border-input bg-card",
  good: "border-good bg-good",
  quiet: "border-good bg-card",
  problem: "border-bad bg-bad shadow-[0_0_0_5px_var(--bad-soft)]",
  affected: "border-bad bg-card",
  silent: "border-input bg-input",
};

const NOTE: Record<BoxStatus, { running: string; stopped: string; className: string }> = {
  waiting: { running: "Testing", stopped: "Not tested", className: "text-muted-foreground" },
  good: { running: "", stopped: "", className: "" },
  quiet: { running: "Ignores some tests", stopped: "Ignores some tests", className: "text-muted-foreground" },
  problem: { running: "Loss starts here", stopped: "Loss starts here", className: "text-bad font-semibold" },
  affected: { running: "Affected", stopped: "Affected", className: "text-bad" },
  silent: { running: "No reply", stopped: "No reply", className: "text-muted-foreground" },
};

function Track({ before, after, dot, large, open, pulse }: { before: BoxStatus | null; after: BoxStatus | null; dot: string; large?: boolean; open?: boolean; pulse?: boolean }) {
  return (
    <span className="relative flex w-6 shrink-0 self-stretch items-center justify-center md:h-6 md:w-full md:self-auto" aria-hidden>
      {before && <span className={cn("absolute left-1/2 top-0 bottom-1/2 w-0.5 -translate-x-1/2 md:left-0 md:right-1/2 md:top-1/2 md:bottom-auto md:h-0.5 md:w-auto md:-translate-y-1/2 md:translate-x-0", LINE[before])} />}
      {after && <span className={cn("absolute left-1/2 top-1/2 bottom-0 w-0.5 -translate-x-1/2 md:left-1/2 md:right-0 md:bottom-auto md:h-0.5 md:w-auto md:-translate-y-1/2 md:translate-x-0", LINE[after])} />}
      <span
        className={cn(
          "relative rounded-full border-[2.5px] transition-[box-shadow,transform,background-color,border-color] duration-300",
          large ? "size-4.5" : "size-3.5",
          dot,
          pulse && "animate-pulse",
          open && "scale-125 outline-2 outline-offset-3 outline-primary",
        )}
      />
    </span>
  );
}

function Stop({ box, before, after, running, open, onToggle }: { box: Box; before: BoxStatus; after: BoxStatus | null; running: boolean; open: boolean; onToggle: () => void }) {
  const note = NOTE[box.status];
  const text = running ? note.running : note.stopped;
  const lossy = box.status === "problem" || box.status === "affected";
  const tested = box.sent > 0;
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex min-w-0 md:min-w-28 md:flex-1 md:flex-col md:items-stretch"
    >
      <button
        type="button"
        onClick={onToggle}
        disabled={box.hops.length === 0}
        aria-expanded={open}
        className="group flex min-w-0 flex-1 gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary md:flex-col md:items-stretch md:gap-2 md:text-center"
      >
        <Track before={before} after={after} dot={DOT[box.status]} large={box.kind === "site"} open={open} pulse={running && box.status === "waiting"} />
        <span className="min-w-0 flex-1 py-3 md:px-1 md:py-0">
          <span className={cn("block text-sm leading-tight font-semibold [overflow-wrap:anywhere] group-enabled:group-hover:underline group-enabled:group-hover:underline-offset-4", open && "text-primary")}>
            {box.title}
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground [overflow-wrap:anywhere]">{box.role}</span>
          <span className="mt-2 block text-sm tabular-nums">{tested ? formatMs(box.delay) : "—"}</span>
          <span className={cn("block text-sm tabular-nums", lossy ? "text-bad" : "text-muted-foreground")}>
            {tested ? `${formatPercent(box.lost, box.sent)} lost` : "—"}
          </span>
          {text && <span className={cn("mt-1 block text-xs leading-tight", note.className)}>{text}</span>}
        </span>
      </button>
    </motion.li>
  );
}

function RouterTable({ box }: { box: Box }) {
  return (
    <div className="mt-2 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <p className="border-b px-4 py-2.5 text-sm font-semibold">
        Routers inside {box.title}
        <span className="ml-2 font-normal text-muted-foreground">{box.hops.length === 1 ? "1 stop" : `${box.hops.length} stops`}</span>
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14 pl-4">Stop</TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="hidden sm:table-cell">Network</TableHead>
            <TableHead className="text-right">Latency</TableHead>
            <TableHead className="pr-4 text-right">Loss</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {box.hops.map((hop) => (
            <TableRow key={hop.n}>
              <TableCell className="pl-4 tabular-nums text-muted-foreground">{hop.n}</TableCell>
              <TableCell className="font-mono text-[0.8125rem]">{hop.ip ?? <span className="font-sans text-muted-foreground">No response</span>}</TableCell>
              <TableCell className="hidden sm:table-cell">
                {[hop.owner?.asn && `AS${hop.owner.asn}`, hop.owner?.country].filter(Boolean).join(", ") || "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">{hop.sent ? formatMs(hop.avg) : "—"}</TableCell>
              <TableCell className="pr-4 text-right tabular-nums">{hop.sent ? formatPercent(hop.lost, hop.sent) : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="border-t px-4 py-2.5 text-sm text-muted-foreground">
        Some routers skip test replies on purpose. Loss matters only when it continues all the way to the site.
      </p>
    </div>
  );
}

export function RoutePath({ boxes, running }: { boxes: Box[]; running: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const selected = boxes.find((b) => b.key === open);
  return (
    <div>
      <ol className="flex flex-col md:flex-row md:items-start">
        <li className="flex min-w-0 md:min-w-28 md:flex-1 md:flex-col md:items-stretch">
          <div className="flex min-w-0 flex-1 gap-3 md:flex-col md:items-stretch md:gap-2 md:text-center">
            <Track before={null} after={boxes[0]?.status ?? null} dot="border-foreground bg-foreground" large />
            <span className="min-w-0 flex-1 py-3 md:px-1 md:py-0">
              <span className="block text-sm leading-tight font-semibold">This computer</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">Starting point</span>
            </span>
          </div>
        </li>
        {boxes.map((box, i) => (
          <Stop
            key={box.key}
            box={box}
            before={box.status}
            after={boxes[i + 1]?.status ?? null}
            running={running}
            open={open === box.key}
            onToggle={() => setOpen(open === box.key ? null : box.key)}
          />
        ))}
      </ol>
      <AnimatePresence initial={false}>
        {selected && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <RouterTable box={selected} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
