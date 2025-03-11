//import 'dotenv/config'; PARA LOCAL
import { createClient } from 'redis';
var client;
async function connectToRedis(url) {
  const redisClient = createClient({
    url: url,
    disableOfflineQueue: true,
    socket: { connectTimeout: 3000 }
  });
  try {
    await redisClient.connect();
    console.log(`Connected to Redis at ${url}`);
    return redisClient;
  } catch (error) {
    console.log(`Failed to connect to Redis at ${url}:`, error);
    return null;
  }
}

export async function inicializar() {
  // Try primary server first
  client = await connectToRedis(process.env.REDIS_COMPLETO);
  if (!client) {
    // If primary server fails, try fallback server
    client = await connectToRedis(process.env.REDIS_COMPLETO_BK);
    if (!client) {
      console.log("Failed to connect to both Redis servers. Notifying...");
    }
  }
}

export async function setCachedApiResponse(key, value, tiempo) {
  if (!client) {
    await inicializar();
  }
  if (client) {
    await client.set(key, value, { EX: 60 * tiempo });
  } else {
    console.error("No Redis client available. Cannot set cache.");
  }
}

export async function getCachedApiResponse(key) {
  if (!client) {
    await inicializar();
  }
  if (client) {
    return await client.get(key);
  } else {
    console.error("No Redis client available. Cannot get cache.");
    return null;
  }
}
export async function deleteCachedApiResponse(key) {
  if (!client) {
    await inicializar();
  }
  if (client) {
    return await client.get(key);
  } else {
    console.error("No Redis client available. Cannot get cache.");
    return null;
  }
}
