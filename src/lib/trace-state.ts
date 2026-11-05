import { formatMs } from "@/lib/format";
import type { FlowStep, Owner, TraceEvent } from "@/lib/types";

export type Hop = {
  n: number;
  ip: string | null;
  owner: Owner | null;
  sent: number;
  lost: number;
  avg: number | null;
};

export type TraceState = {
  status: "idle" | "running" | "stopped" | "failed";
  host: string | null;
  address: string | null;
  startedAt: number | null;
  steps: FlowStep[];
  hops: Hop[];
  routeDone: boolean;
  error: string | null;
};

export const emptyTrace: TraceState = {
  status: "idle",
  host: null,
  address: null,
  startedAt: null,
  steps: [],
  hops: [],
  routeDone: false,
  error: null,
};

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
        hops: [...state.hops, { n: event.n, ip: event.ip, owner: null, sent: 0, lost: 0, avg: null }].sort((a, b) => a.n - b.n),
      };
    case "owner":
      return { ...state, hops: state.hops.map((h) => (h.ip === event.ip ? { ...h, owner: event.owner } : h)) };
    case "pulse":
      return {
        ...state,
        hops: state.hops.map((h) => {
          if (h.n !== event.n) return h;
          const replied = h.sent - h.lost;
          const avg = event.rtt === null ? h.avg : ((h.avg ?? 0) * replied + event.rtt) / (replied + 1);
          return { ...h, sent: h.sent + 1, lost: h.lost + (event.rtt === null ? 1 : 0), avg };
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

/** "Uzbektelekom Joint Stock Company" reads better as "Uzbektelekom" in a small box. */
export function shortName(name: string) {
  const short = name
    .replace(/,?\s+(joint stock company|limited liability company|llc|ltd\.?|limited|inc\.?|corp\.?|corporation|gmbh|jsc|plc)$/i, "")
    .trim();
  return short || name;
}

export const MIN_TESTS = 15;

export type Verdict = {
  tone: "good" | "warn" | "bad";
  title: string;
  detail: string;
  startsAt: number | null;
};

function lossOf(hop: Hop) {
  return hop.sent ? (hop.lost / hop.sent) * 100 : 0;
}

function nameOf(hop: Hop) {
  return hop.owner ? shortName(hop.owner.name) : (hop.ip ?? `stop ${hop.n}`);
}

/** Reads the route the way a network engineer would, in plain words. */
export function readVerdict(state: TraceState): Verdict | null {
  const measured = state.hops.filter((h) => h.ip && h.sent >= MIN_TESTS);
  const destination = state.hops.at(-1);
  if (!state.routeDone || !destination?.ip || destination.sent < MIN_TESTS) return null;

  const end = lossOf(destination);
  const host = state.host ?? "the site";
  if (destination.lost === destination.sent) {
    return {
      tone: "warn",
      title: `${host} does not respond to network tests`,
      detail: "Many servers ignore these tests on purpose. If the site opens normally, no action is needed.",
      startsAt: null,
    };
  }
  if (end < 1) {
    return {
      tone: "good",
      title: `Your connection to ${host} is healthy`,
      detail: `${destination.sent} tests completed with ${destination.lost} lost and a ${formatMs(destination.avg)} average round trip.`,
      startsAt: null,
    };
  }

  let first = measured.length - 1;
  while (first > 0 && lossOf(measured[first - 1]) >= 1) first--;
  const start = measured[first];
  const local = start.owner?.kind === "private";
  // Loss that appears only at the destination is the site's own doing; neither the home network nor the provider can fix it.
  if (start.n === destination.n) {
    return {
      tone: "warn",
      title: `${host} drops ${end.toFixed(1)}% of tests`,
      detail: `Every network on the way is clean, so the loss happens at ${host} itself${destination.owner ? ` (${shortName(destination.owner.name)})` : ""}. Servers often limit test replies on purpose. If the site opens normally, no action is needed.`,
      startsAt: start.n,
    };
  }
  return {
    tone: end >= 3 ? "bad" : "warn",
    title: `${end.toFixed(1)}% packet loss on the way to ${host}`,
    detail: local
      ? "The loss begins inside your home network. Check your cable, Wi-Fi and router first."
      : `The loss begins at ${nameOf(start)} and continues to the site. Your computer and router are not the cause, so contact your internet provider.`,
    startsAt: start.n,
  };
}

/**
 * waiting: not enough tests yet. good: answers cleanly. quiet: drops some tests but the loss does not continue,
 * so it is rate limiting rather than a fault. problem: the loss starts here. affected: downstream of the problem.
 * silent: never answered a single test.
 */
export type BoxStatus = "waiting" | "good" | "quiet" | "problem" | "affected" | "silent";
export type BoxKind = "home" | "provider" | "network" | "site";

export type Box = {
  key: string;
  kind: BoxKind;
  title: string;
  role: string;
  hops: Hop[];
  delay: number | null;
  sent: number;
  lost: number;
  status: BoxStatus;
};

function makeBox(key: string, kind: BoxKind, title: string, role: string): Box {
  return { key, kind, title, role, hops: [], delay: null, sent: 0, lost: 0, status: "waiting" };
}

/** Folds routers into one box per network, so people read a path instead of a table. */
export function buildBoxes(state: TraceState, verdict: Verdict | null): Box[] {
  const boxes: Box[] = [];
  const destination = state.hops.find((h) => h.ip !== null && h.ip === state.address);
  let providerSeen = false;

  for (const hop of state.hops) {
    if (hop === destination) continue;
    const last = boxes.at(-1);
    if (hop.owner?.kind === "private") {
      if (last?.kind !== "home") boxes.push(makeBox("home", "home", "Your router", "Home network"));
      boxes.at(-1)?.hops.push(hop);
      continue;
    }
    const known = hop.ip && hop.owner?.kind === "public" ? hop.owner.name : null;
    if (!known) {
      if (!last || last.kind === "home") {
        boxes.push(makeBox("pending", "provider", "Your provider", "Internet provider"));
        providerSeen = true;
      }
      boxes.at(-1)?.hops.push(hop);
      continue;
    }
    if (last?.key === "pending") {
      last.key = known;
      last.title = shortName(known);
    } else if (last?.key !== known) {
      boxes.push(
        providerSeen
          ? makeBox(known, "network", shortName(known), "Transit network")
          : makeBox(known, "provider", shortName(known), "Internet provider"),
      );
      providerSeen = true;
    }
    boxes.at(-1)?.hops.push(hop);
  }

  const site = makeBox("site", "site", state.host ?? "Destination", destination?.owner ? shortName(destination.owner.name) : "Destination");
  if (destination) site.hops.push(destination);
  boxes.push(site);

  let troubled = false;
  for (const box of boxes) {
    const answering = box.hops.filter((h) => h.ip && h.sent > 0).at(-1);
    if (answering) {
      box.delay = answering.avg;
      box.sent = answering.sent;
      box.lost = answering.lost;
    }
    if (verdict?.startsAt != null && box.hops.some((h) => h.n === verdict.startsAt)) {
      box.status = "problem";
      troubled = true;
    } else if (troubled) box.status = "affected";
    else if (box.sent >= 5) box.status = box.lost / box.sent >= 0.01 ? "quiet" : "good";
    else if (state.routeDone && !box.hops.some((h) => h.ip)) box.status = "silent";
  }
  // A network can appear twice on one route, so keys need the position too.
  return boxes.map((box, i) => ({ ...box, key: `${box.key}-${i}` }));
}
