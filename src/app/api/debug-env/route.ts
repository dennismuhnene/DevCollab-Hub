// src/app/api/debug-env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasFsaKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    hasUpstashUrl: !!process.env.upstash_redis_rest_url,
    hasUpstashToken: !!process.env.upstash_redis_rest_token,
    gcloudProject: process.env.GCLOUD_PROJECT,
  });
}
