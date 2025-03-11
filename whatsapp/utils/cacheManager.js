const redis = require("./redisConfig");

class CacheManager {
  static async setCache(key, value, ttl = 3600) { // TTL por defecto: 1 hora
    await redis.setex(key, ttl, JSON.stringify(value));
  }

  static async getCache(key) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  static async deleteCache(key) {
    await redis.del(key);
  }
}

module.exports = CacheManager;
