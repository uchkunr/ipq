import { formatMs } from "@/lib/format";
import type { FlowStep, Owner, TraceEvent } from "@/lib/types";

export type Hop = {
  n: number;
  ip: string | null;
  owner: Owner | null;
  sent: number;
  lost: number;
  avg: number | null;
  last: number | null;
  recent: (number | null)[];
};

export type TraceState = {
  status: "idle" | "running" | "stopped" | "failed";
  host: string | null;
  address: string | null;
  steps: FlowStep[];
  hops: Hop[];
  routeDone: boolean;
  error: string | null;
};

export const emptyTrace: TraceState = {
  status: "idle",
  host: null,
  address: null,
  steps: [],
  hops: [],
  routeDone: false,
  error: null,
};

const RECENT = 48;

export function reduceTrace(state: TraceState, event: TraceEvent): TraceState {
  switch (event.type) {
    case "start":
      return { ...state, host: event.host, address: event.address };
    case "step":
      return { ...state, steps: [...state.steps.filter((s) => s.id !== event.step.id), event.step] };
    case "hop":
      if (state.hops.some((h) => h.n === event.n)) return state;
      return {
        ...state,
        hops: [
          ...state.hops,
          { n: event.n, ip: event.ip, owner: null, sent: 0, lost: 0, avg: null, last: null, recent: [] },
        ].sort((a, b) => a.n - b.n),
      };
    case "owner":
      return { ...state, hops: state.hops.map((h) => (h.ip === event.ip ? { ...h, owner: event.owner } : h)) };
    case "pulse":
      return {
        ...state,
        hops: state.hops.map((h) => {
          if (h.n !== event.n) return h;
          const replied = h.sent - h.lost;
          const avg =
            event.rtt === null ? h.avg : ((h.avg ?? 0) * replied + event.rtt) / (replied + 1);
          return {
            ...h,
            sent: h.sent + 1,
            lost: h.lost + (event.rtt === null ? 1 : 0),
            avg,
            last: event.rtt,
            recent: [...h.recent.slice(-(RECENT - 1)), event.rtt],
          };
        }),
      };
    case "route-done":
      return { ...state, routeDone: true };
    case "error":
      return { ...state, status: "failed", error: event.message };
    case "end":
      return state.status === "running" ? { ...state, status: "stopped" } : state;
  }
}

export type Verdict = {
  tone: "good" | "warn" | "bad";
  title: string;
  detail: string;
  startsAt: number | null;
};

const MIN_PROBES = 15;

function lossOf(hop: Hop) {
  return hop.sent ? (hop.lost / hop.sent) * 100 : 0;
}

function nameOf(hop: Hop) {
  return hop.owner?.name ?? hop.ip ?? `hop ${hop.n}`;
}

/** Reads the hop table the way a network engineer would, in plain words. */
export function readVerdict(state: TraceState): Verdict | null {
  const measured = state.hops.filter((h) => h.ip && h.sent >= MIN_PROBES);
  const destination = state.hops.at(-1);
  if (!state.routeDone || !destination?.ip || destination.sent < MIN_PROBES) return null;

  const end = lossOf(destination);
  const host = state.host ?? "the site";
  if (destination.lost === destination.sent) {
    return {
      tone: "warn",
      title: `${host} does not reply to tests`,
      detail: "Many servers ignore these tests on purpose. If the site opens normally, there is nothing to fix.",
      startsAt: null,
    };
  }
  if (end < 1) {
    return {
      tone: "good",
      title: `Your connection to ${host} is healthy`,
      detail: `${destination.sent} tests sent, ${destination.lost} lost, ${formatMs(destination.avg)} round trip.`,
      startsAt: null,
    };
  }

  let first = measured.length - 1;
  while (first > 0 && lossOf(measured[first - 1]) >= 1) first--;
  const start = measured[first];
  const local = start.owner?.kind === "private";
  return {
    tone: end >= 3 ? "bad" : "warn",
    title: `${end.toFixed(1)}% of data to ${host} is getting lost`,
    detail: local
      ? "The problem starts inside your home. Check your cable, Wi-Fi and router first."
      : `The problem starts at ${nameOf(start)}. Your computer and router are fine, so this is not something you can fix at home. Contact your provider.`,
    startsAt: start.n,
  };
}

export type BoxStatus = "waiting" | "good" | "problem" | "affected";

export type Box = {
  key: string;
  title: string;
  role: string;
  hops: Hop[];
  delay: number | null;
  added: number | null;
  sent: number;
  lost: number;
  recent: (number | null)[];
  status: BoxStatus;
};

function makeBox(key: string, title: string, role: string): Box {
  return { key, title, role, hops: [], delay: null, added: null, sent: 0, lost: 0, recent: [], status: "waiting" };
}

/** Folds routers into one box per network, so people read a path instead of a table. */
export function buildBoxes(state: TraceState, verdict: Verdict | null): Box[] {
  const boxes: Box[] = [];
  let providerSeen = false;
  const destination = state.hops.find((h) => h.ip !== null && h.ip === state.address);

  for (const hop of state.hops) {
    if (hop === destination) continue;
    const last = boxes.at(-1);
    if (hop.owner?.kind === "private") {
      if (last?.key === "home") last.hops.push(hop);
      else {
        const box = makeBox("home", "Your router", "The box in your home");
        box.hops.push(hop);
        boxes.push(box);
      }
      continue;
    }
    const known = hop.ip && hop.owner?.kind === "public" ? hop.owner.name : null;
    if (!known) {
      if (last && last.key !== "home") last.hops.push(hop);
      else {
        const box = makeBox("pending", "Your internet provider", "Your first stop on the internet");
        box.hops.push(hop);
        boxes.push(box);
        providerSeen = true;
      }
      continue;
    }
    if (last?.key === "pending") {
      last.key = known;
      last.title = known;
      last.hops.push(hop);
    } else if (last?.key === known) {
      last.hops.push(hop);
    } else {
      const box = makeBox(known, known, providerSeen ? "A network on the way" : "Your internet provider");
      box.hops.push(hop);
      boxes.push(box);
      providerSeen = true;
    }
  }

  const site = makeBox("site", state.host ?? "The site", destination?.owner?.name ?? "The site you asked for");
  if (destination) site.hops.push(destination);
  boxes.push(site);

  let before = 0;
  let troubled = false;
  for (const box of boxes) {
    const answering = box.hops.filter((h) => h.ip && h.sent > 0).at(-1);
    if (answering) {
      box.delay = answering.avg;
      box.sent = answering.sent;
      box.lost = answering.lost;
      box.recent = answering.recent;
      box.added = answering.avg === null ? null : Math.max(0, answering.avg - before);
      before = Math.max(before, answering.avg ?? 0);
    }
    const starts = verdict?.startsAt !== null && box.hops.some((h) => h.n === verdict?.startsAt);
    if (starts) {
      box.status = "problem";
      troubled = true;
    } else if (troubled) box.status = "affected";
    else if (box.sent >= 5) box.status = "good";
  }
  // A network can appear twice on one route, so keys need the position too.
  return boxes.map((box, i) => ({ ...box, key: `${box.key}-${i}` }));
}
