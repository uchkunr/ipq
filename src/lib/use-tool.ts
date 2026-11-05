"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

export type ToolState<T> = { status: "idle" | "loading" | "done" | "error"; data: T | null; error: string | null; ms: number | null };

const noop = () => () => {};
const readSearch = () => window.location.search;
const serverSearch = () => "";

/** The query string at first render in the browser, empty on the server. */
export function useInitialSearch() {
  return useSyncExternalStore(noop, readSearch, serverSearch);
}

/**
 * Runs one tool API and keeps the query in the address bar, so a result can be shared by copying the URL.
 * `initial` holds the parameters found in the URL on arrival; they run once, right after mount.
 */
export function useTool<T>(api: string, paramNames: string[], seed?: Record<string, string>) {
  const [state, setState] = useState<ToolState<T>>({ status: "idle", data: null, error: null, ms: null });
  const controller = useRef<AbortController | null>(null);
  const search = useInitialSearch();
  const initial = useMemo(() => {
    const params = new URLSearchParams(search);
    const found: Record<string, string> = { ...seed };
    for (const name of paramNames) {
      const value = params.get(name);
      if (value) found[name] = value;
    }
    return found;
  }, [search, paramNames, seed]);

  const run = useCallback(
    async (params: Record<string, string>) => {
      controller.current?.abort();
      const own = new AbortController();
      controller.current = own;
      const query = new URLSearchParams();
      for (const name of paramNames) if (params[name]) query.set(name, params[name]);
      window.history.replaceState(null, "", `${window.location.pathname}${query.size ? `?${query}` : ""}`);
      setState({ status: "loading", data: null, error: null, ms: null });
      const start = performance.now();
      try {
        const response = await fetch(`${api}?${query}`, { signal: own.signal, headers: { accept: "application/json" } });
        const body = (await response.json()) as T & { error?: string };
        if (own.signal.aborted) return;
        if (!response.ok) {
          setState({ status: "error", data: null, error: body.error ?? `The server answered ${response.status}.`, ms: null });
          return;
        }
        setState({ status: "done", data: body, error: null, ms: Math.round(performance.now() - start) });
      } catch (error) {
        if (own.signal.aborted) return;
        setState({ status: "error", data: null, error: error instanceof Error ? error.message : "The request failed.", ms: null });
      }
    },
    [api, paramNames],
  );

  const ran = useRef(false);
  useEffect(() => {
    if (ran.current || !Object.keys(initial).length) return;
    ran.current = true;
    // Deferred so the first paint shows the form with its values before the request starts.
    const id = setTimeout(() => void run(initial), 0);
    return () => clearTimeout(id);
  }, [initial, run]);

  useEffect(() => () => controller.current?.abort(), []);

  return { state, run, initial };
}
