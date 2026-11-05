import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

export const alt = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const host = SITE_URL.replace(/^https?:\/\//, "");
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#f5f6f8", color: "#101828", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 72, height: 72, borderRadius: 18, background: "#0d2740", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="52" height="52" viewBox="0 0 32 32">
              <circle cx="14" cy="14" r="6.75" fill="none" stroke="#ffffff" strokeWidth="3.5" />
              <path d="M19 19l6.5 6.5" stroke="#8fd3dc" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          </div>
          <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: -1 }}>{SITE_NAME}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ fontSize: 84, fontWeight: 600, letterSpacing: -2, lineHeight: 1.02 }}>{`${SITE_TAGLINE}.`}</div>
          <div style={{ fontSize: 32, color: "#5a6676" }}>DNS, WHOIS, SSL, HTTP, ports, email DNS, your IP. Browser or curl.</div>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 26, color: "#0d2740", fontFamily: "monospace" }}>
          <span style={{ background: "#ffffff", padding: "10px 18px", borderRadius: 12 }}>{`curl ${host}/ip`}</span>
        </div>
      </div>
    ),
    size,
  );
}
