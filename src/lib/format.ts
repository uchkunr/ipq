export function formatMs(value: number | null | undefined) {
  if (value === null || value === undefined) return "no reply";
  if (value < 1) return "under 1 ms";
  return `${value >= 100 ? Math.round(value) : Math.round(value * 10) / 10} ms`;
}

export function formatPercent(lost: number, sent: number) {
  if (!sent) return "0%";
  const value = (lost / sent) * 100;
  return `${value >= 10 || value === 0 ? Math.round(value) : value.toFixed(1)}%`;
}

export function formatRate(bitsPerSecond: number | null) {
  if (bitsPerSecond === null) return "measuring";
  if (bitsPerSecond >= 1e9) return `${(bitsPerSecond / 1e9).toFixed(2)} Gbit/s`;
  if (bitsPerSecond >= 1e6) return `${(bitsPerSecond / 1e6).toFixed(1)} Mbit/s`;
  if (bitsPerSecond >= 1e3) return `${Math.round(bitsPerSecond / 1e3)} kbit/s`;
  return `${Math.round(bitsPerSecond)} bit/s`;
}

export function formatClock(time: number | null) {
  if (!time) return "not yet";
  return new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
