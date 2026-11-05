/** True for curl, wget, scripts and anything else that did not ask for HTML. */
export function wantsText(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.has("json")) return false;
  if (url.searchParams.has("text")) return true;
  const accept = request.headers.get("accept") ?? "";
  if (accept.includes("application/json")) return false;
  if (accept.includes("text/html")) return false;
  return true;
}

export function textResponse(body: string, status = 200) {
  return new Response(body.endsWith("\n") ? body : `${body}\n`, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store", "access-control-allow-origin": "*" },
  });
}

export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store", "access-control-allow-origin": "*" } });
}
