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

// Temporarily disable Redis in production to allow server to start
// TODO: Fix Upstash Redis configuration
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';

if (!REDIS_ENABLED) {
  console.log('⚠️  Redis is disabled via REDIS_ENABLED environment variable');
  console.log('⚠️  Application will run without Redis caching');
} else {
  // Only create and connect if Redis URL is available
  try {
    redisClient = createClient({
      url: redisUrl,
      socket: {
        tls: redisUrl.startsWith('rediss://'),
        rejectUnauthorized: false, // For Upstash and other cloud Redis providers
        reconnectStrategy: false, // Disable automatic reconnection
      },
    });

    redisClient.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
      isConnected = false;
      // Don't crash the app on Redis errors
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
    console.log('✅ Redis client initialized successfully');
  } catch (error) {
    console.error('⚠️  Failed to connect to Redis:', error.message);
    console.log('⚠️  Application will continue without Redis caching');
    redisClient = null;
    isConnected = false;
  }
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

  async quit() {
    if (redisClient && isConnected) {
      try {
        await redisClient.quit();
        console.log('✅ Redis disconnected gracefully');
      } catch (error) {
        console.error('Redis QUIT error:', error.message);
      }
    }
  },

  isAvailable() {
    return redisClient !== null && isConnected;
  },

  // For compatibility with old code
  get isOpen() {
    return isConnected;
  }
};

export default safeRedisClient;