import { Redis } from '@upstash/redis';

if (!process.env.upstash_redis_rest_url || !process.env.upstash_redis_rest_token) {
  throw new Error('Missing Upstash Redis credentials in environment variables.');
}

export const redis = new Redis({
  url: process.env.upstash_redis_rest_url,
  token: process.env.upstash_redis_rest_token,
});
