"use client";

import { ChevronDown, ChevronRight, Globe, Laptop, type LucideIcon, Network, RadioTower, Router } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Fragment, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMs, formatPercent } from "@/lib/format";
import type { Box, BoxKind, BoxStatus } from "@/lib/trace-state";
import { cn } from "@/lib/utils";

const ICONS: Record<BoxKind, LucideIcon> = { home: Router, provider: RadioTower, network: Network, site: Globe };

const STATUS: Record<BoxStatus, { label: string; className: string }> = {
  waiting: { label: "Testing", className: "bg-secondary text-muted-foreground" },
  good: { label: "Healthy", className: "bg-good-soft text-good" },
  problem: { label: "Loss starts here", className: "bg-bad-soft text-bad" },
  affected: { label: "Affected", className: "bg-warn-soft text-warn" },
};

function Metric({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-medium", alert && "text-bad")}>{value}</dd>
    </div>
  );
}

function RouteBox({ box, running, open, onToggle }: { box: Box; running: boolean; open: boolean; onToggle: () => void }) {
  const Icon = ICONS[box.kind];
  const status = STATUS[box.status];
  const lossy = box.sent > 0 && box.lost / box.sent >= 0.01;
  const label = box.status === "waiting" && !running ? "Not tested" : status.label;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={box.hops.length === 0}
      aria-expanded={open}
      title={box.title}
      className={cn(
        "flex w-full min-w-0 flex-col gap-3 rounded-lg border bg-card p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary enabled:hover:border-input",
        box.status === "problem" && "border-bad",
        open && "border-primary",
      )}
    >
      <span className="flex items-center gap-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0">
          <span className="block truncate font-semibold">{box.title}</span>
          <span className="block truncate text-sm text-muted-foreground">{box.role}</span>
        </span>
      </span>
      <dl className="space-y-0.5">
        <Metric label="Latency" value={box.sent ? formatMs(box.delay) : "-"} />
        <Metric label="Loss" value={box.sent ? formatPercent(box.lost, box.sent) : "-"} alert={lossy} />
      </dl>
      <Badge variant="secondary" className={cn("w-fit", box.status === "waiting" && !running ? "bg-secondary text-muted-foreground" : status.className)}>
        {label}
      </Badge>
    </button>
  );
}

function Connector() {
  return (
    <span className="flex shrink-0 items-center justify-center text-input" aria-hidden>
      <ChevronDown className="my-0.5 size-4 md:hidden" />
      <ChevronRight className="hidden size-4 md:block" />
    </span>
  );
}

function RouterTable({ box }: { box: Box }) {
  return (
    <div className="mt-3 overflow-hidden rounded-lg border bg-card">
      <p className="border-b px-3 py-2 font-semibold">{box.title} routers</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14 pl-3">Stop</TableHead>
            <TableHead>Address</TableHead>
            <TableHead className="hidden sm:table-cell">Network</TableHead>
            <TableHead className="text-right">Latency</TableHead>
            <TableHead className="pr-3 text-right">Loss</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {box.hops.map((hop) => (
            <TableRow key={hop.n}>
              <TableCell className="pl-3">{hop.n}</TableCell>
              <TableCell>{hop.ip ?? "No response"}</TableCell>
              <TableCell className="hidden sm:table-cell">
                {[hop.owner?.asn && `AS${hop.owner.asn}`, hop.owner?.country].filter(Boolean).join(", ") || "-"}
              </TableCell>
              <TableCell className="text-right">{hop.sent ? formatMs(hop.avg) : "-"}</TableCell>
              <TableCell className="pr-3 text-right">{hop.sent ? formatPercent(hop.lost, hop.sent) : "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <p className="border-t px-3 py-2 text-sm text-muted-foreground">
        Some routers skip test replies. Loss matters only when it continues through to the destination.
      </p>
    </div>
  );
}

export function RoutePath({ boxes, running }: { boxes: Box[]; running: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const selected = boxes.find((b) => b.key === open);
  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-stretch md:gap-1">
        <div className="flex w-full min-w-0 flex-col gap-3 rounded-lg border bg-card p-3">
          <span className="flex items-center gap-2">
            <Laptop className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0">
              <span className="block truncate font-semibold">This computer</span>
              <span className="block truncate text-sm text-muted-foreground">Starting point</span>
            </span>
          </span>
        </div>
        {boxes.map((box) => (
          <Fragment key={box.key}>
            <Connector />
            <RouteBox box={box} running={running} open={open === box.key} onToggle={() => setOpen(open === box.key ? null : box.key)} />
          </Fragment>
        ))}
      </div>
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
