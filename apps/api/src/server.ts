import { buildApp } from "./app.js";
import { config } from "./config.js";
import { checkDatabaseConnection, maskDatabaseUrl } from "./lib/database.js";

const app = await buildApp();
const database = await checkDatabaseConnection();
if (!database.ok) {
  app.log.error({ databaseUrl: maskDatabaseUrl(), message: database.message }, "database connection check failed");
} else {
  app.log.info({ databaseUrl: maskDatabaseUrl() }, "database connection check passed");
}
await app.listen({ port: config.API_PORT, host: "0.0.0.0" });
