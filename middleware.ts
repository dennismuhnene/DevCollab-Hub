import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 s'),
});

export const config = {
  matcher: '/api/ai/:path*',
};

export default async function middleware(request: NextRequest) {
  // Safely extract client IP (Next.js 16 compatible)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = forwardedFor?.split(',')[0]?.trim();
  const ip = realIp || request.headers.get('x-real-ip') || '127.0.0.1';

  const { success } = await ratelimit.limit(`ip:${ip}`);

  if (!success) {
    return new Response('Too many requests', { status: 429 });
  }

  return NextResponse.next();
}
