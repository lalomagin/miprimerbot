const redis = require("./redisConfig");

async function checkRedisMemoryUsage() {
  const memoryInfo = await redis.info("memory");
  console.log("🔍 Uso de memoria en Redis:\n", memoryInfo);
}

setInterval(checkRedisMemoryUsage, 60000); // Verificar cada 60 segundos
