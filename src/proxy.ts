import { NextResponse, type NextRequest } from "next/server";

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/** Pages that double as plain-text endpoints for curl, wget and scripts. */
const TEXT_PAGES: Record<string, string> = { "/ip": "/api/ip", "/headers": "/api/headers" };

function wantsHtml(request: NextRequest) {
  return (request.headers.get("accept") ?? "").includes("text/html");
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // `curl ipq.vercel.app/ip` gets the address back; a browser gets the page.
  const api = TEXT_PAGES[pathname];
  if (api && !wantsHtml(request)) {
    const url = request.nextUrl.clone();
    url.pathname = api;
    return NextResponse.rewrite(url);
  }

  // The connection check reveals what the machine it runs on can see, so a self-hosted copy
  // only serves it locally unless the owner opts in. Checking Host also blocks DNS rebinding.
  if (pathname === "/api/trace" && process.env.IPQ_ALLOW_REMOTE !== "1" && process.env.VERCEL !== "1") {
    if (!LOCAL_HOST.test(request.headers.get("host") ?? "")) {
      return new NextResponse("The connection check only answers on localhost. Set IPQ_ALLOW_REMOTE=1 to change this.", { status: 403 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/ip", "/headers", "/api/trace"] };
