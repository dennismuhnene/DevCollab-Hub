// src/app/api/telemetry/route.ts
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    // Minimal validation
    if (!payload || !payload.name) {
      return NextResponse.json({ ok: false, error: 'invalid payload' }, { status: 400 });
    }

    // TODO: replace with DB insert or other persistence layer as required.
    // For now, write to server console so you can see telemetry in server logs.
    // In production, store in a telemetry DB/table or push to your analytics pipeline.
    // Keep payload limited and avoid storing PII.
    console.info('[telemetry]', JSON.stringify(payload));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Telemetry endpoint error', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
