import { Ratelimit } from '@upstash/ratelimit';
import { getRedisClient } from './redis'; // Changed import

// The Ratelimit instance will be created on first use at runtime.
let ratelimit: Ratelimit | null = null;

function getRateLimiter() {
  // If the instance already exists, return it.
  if (ratelimit) {
    return ratelimit;
  }

  // At runtime, get the Redis client and create the Ratelimit instance.
  const redisClient = getRedisClient();
  
  ratelimit = new Ratelimit({
    redis: redisClient,
    // Allow 3 requests from the same user in a 10-second window.
    limiter: Ratelimit.fixedWindow(3, '10 s'),
  });

  return ratelimit;
}

export async function checkRateLimit(userId: string) {
  const limiter = getRateLimiter();

  // This check is now robust. getRateLimiter() will throw if Redis creds are missing at runtime.
  const { success } = await limiter.limit(userId);

  if (!success) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
}
