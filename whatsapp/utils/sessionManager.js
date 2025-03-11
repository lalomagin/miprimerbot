const redis = require("./redisConfig");

class SessionManager {
  static async saveSession(sessionId, sessionData) {
    await redis.hset("sessions", sessionId, JSON.stringify(sessionData));
  }

  static async getSession(sessionId) {
    const data = await redis.hget("sessions", sessionId);
    return data ? JSON.parse(data) : null;
  }

  static async deleteSession(sessionId) {
    await redis.hdel("sessions", sessionId);
  }
}

module.exports = SessionManager;
