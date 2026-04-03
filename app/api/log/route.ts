import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Log the incoming client error payload to server console for debugging
    // Keep logs concise but include timestamp and URL
    console.log(
      `[client-log] ${new Date().toISOString()} -`,
      JSON.stringify(body, null, 2),
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[client-log] failed to parse body:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
