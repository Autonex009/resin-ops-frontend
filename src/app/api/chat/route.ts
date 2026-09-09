import { NextResponse } from "next/server";

// Thin proxy: the browser chat widget POSTs here, and we forward to the backend
// chat endpoint with the internal API key attached. The key (and the DeepSeek
// key behind it) stay server-side and never reach the client.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const base = process.env.API_BASE_URL;
  const key = process.env.INTERNAL_API_KEY;
  if (!base || !key) {
    return NextResponse.json(
      { error: "API not configured. Set API_BASE_URL and INTERNAL_API_KEY." },
      { status: 503 },
    );
  }

  const body = await request.text();

  let res: Response;
  try {
    res = await fetch(`${base.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-internal-api-key": key,
      },
      body,
      cache: "no-store",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat request failed." },
      { status: 502 },
    );
  }

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  });
}
