// src/app/api/debug-env/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // Log to console for Cloud Run logs inspection
  console.log('GEMINI_API_KEY_check:', process.env.GEMINI_API_KEY);
  console.log('gemini_api_key_check:', process.env.gemini_api_key);

  return NextResponse.json({
    hasFsaKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    hasUpstashUrl: !!process.env.upstash_redis_rest_url,
    hasUpstashToken: !!process.env.upstash_redis_rest_token,
    gcloudProject: process.env.GCLOUD_PROJECT,
    // Add the Gemini keys to the response for direct checking
    hasGeminiApiKeyUpper: !!process.env.GEMINI_API_KEY,
    hasGeminiApiKeyLower: !!process.env.gemini_api_key,
    geminiApiKeyUpperValue: process.env.GEMINI_API_KEY ? 'Exists' : 'Does not exist or is empty',
    geminiApiKeyLowerValue: process.env.gemini_api_key ? 'Exists' : 'Does not exist or is empty',
  });
}
