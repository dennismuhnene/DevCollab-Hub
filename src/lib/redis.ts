import { Redis } from '@upstash/redis';

let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
  if (redisInstance) {
    return redisInstance;
  }

  // These variables are only checked when the function is first called (at runtime).
  if (!process.env.upstash_redis_rest_url || !process.env.upstash_redis_rest_token) {
    throw new Error('Missing Upstash Redis credentials at runtime.');
  }

  redisInstance = new Redis({
    url: process.env.upstash_redis_rest_url,
    token: process.env.upstash_redis_rest_token,
  });

  return redisInstance;
}
