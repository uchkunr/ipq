import { NextResponse, type NextRequest } from "next/server";

const LOCAL_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/**
 * Undertow reports what the machine it runs on can see, including which programs
 * are connected where. Only local visits are served unless the owner opts in.
 * Checking the Host header also blocks DNS rebinding from websites in the browser.
 */
export function proxy(request: NextRequest) {
  if (process.env.UNDERTOW_ALLOW_REMOTE === "1") return NextResponse.next();
  if (LOCAL_HOST.test(request.headers.get("host") ?? "")) return NextResponse.next();
  return new NextResponse(
    "Undertow only answers on localhost. Set UNDERTOW_ALLOW_REMOTE=1 to change this.",
    { status: 403 },
  );
}

export const config = { matcher: "/((?!_next/static|_next/image).*)" };
