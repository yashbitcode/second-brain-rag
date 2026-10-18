import "dotenv/config";
import { createNodeRedisClient } from 'bullmq';
import { createClient } from 'redis';

export const rawClient = createClient({
  url: process.env.REDIS_URI
});

export const connection = createNodeRedisClient(rawClient);
