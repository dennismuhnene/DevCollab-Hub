import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';

// Allow 3 requests per 10 seconds
const ratelimit = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.fixedWindow(3, '10 s'),
});

export async function checkRateLimit(userId: string) {
  const { success } = await ratelimit.limit(userId);
  if (!success) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
}