// backend/src/config/redis.js
import { createClient } from 'redis';

// Parse Redis URL, removing any CLI command prefix if present
const getRedisUrl = () => {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

  // If the URL contains 'redis-cli' command, extract just the URL part
  if (redisUrl.includes('redis-cli')) {
    const urlMatch = redisUrl.match(/redis:\/\/[^\s]+/);
    if (urlMatch) {
      // If TLS is mentioned, use rediss:// instead of redis://
      const url = urlMatch[0];
      return redisUrl.includes('--tls') ? url.replace('redis://', 'rediss://') : url;
    }
  }

  return redisUrl;
};

const redisUrl = getRedisUrl();

let redisClient = null;
let isConnected = false;

// Only create and connect if Redis URL is available
try {
  redisClient = createClient({
    url: redisUrl,
    socket: {
      tls: redisUrl.startsWith('rediss://'),
      rejectUnauthorized: false, // For Upstash and other cloud Redis providers
    },
  });

  redisClient.on('error', (err) => {
    console.error('❌ Redis error:', err);
    isConnected = false;
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis connected');
    isConnected = true;
  });

  redisClient.on('disconnect', () => {
    console.log('⚠️  Redis disconnected');
    isConnected = false;
  });

  await redisClient.connect();
  isConnected = true;
} catch (error) {
  console.error('⚠️  Failed to connect to Redis:', error.message);
  console.log('⚠️  Application will continue without Redis caching');
  redisClient = null;
  isConnected = false;
}

// Safe wrapper for Redis operations
const safeRedisClient = {
  async get(key) {
    if (!redisClient || !isConnected) return null;
    try {
      return await redisClient.get(key);
    } catch (error) {
      console.error('Redis GET error:', error.message);
      return null;
    }
  },

  async setEx(key, seconds, value) {
    if (!redisClient || !isConnected) return null;
    try {
      return await redisClient.setEx(key, seconds, value);
    } catch (error) {
      console.error('Redis SETEX error:', error.message);
      return null;
    }
  },

  async del(key) {
    if (!redisClient || !isConnected) return null;
    try {
      return await redisClient.del(key);
    } catch (error) {
      console.error('Redis DEL error:', error.message);
      return null;
    }
  },

  isAvailable() {
    return redisClient !== null && isConnected;
  }
};

export default safeRedisClient;