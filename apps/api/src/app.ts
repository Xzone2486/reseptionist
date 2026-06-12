import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { config } from "./config.js";
import { checkDatabaseConnection } from "./lib/database.js";
import { registerErrorHandler } from "./lib/errors.js";
import { authRoutes } from "./modules/auth/routes.js";
import { campaignRoutes } from "./modules/campaigns/routes.js";
import { callRoutes } from "./modules/calls/routes.js";
import { leadsRoutes } from "./modules/leads/routes.js";
import { schedulingRoutes } from "./modules/scheduling/routes.js";
import { settingsRoutes } from "./modules/settings/routes.js";

export async function buildApp() {
  const app = Fastify({ logger: true });
  registerErrorHandler(app);
  await app.register(cors, { origin: config.WEB_ORIGIN, credentials: true });
  await app.register(cookie);
  await app.register(jwt, {
    secret: config.JWT_SECRET,
    cookie: { cookieName: "token", signed: false }
  });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });

  app.get("/health", async (_request, reply) => {
    const database = await checkDatabaseConnection();
    if (!database.ok) reply.status(503);
    return {
      ok: database.ok,
      service: "api",
      mockMode: config.MOCK_MODE,
      mockCallMode: config.MOCK_CALL_MODE,
      callingProvider: config.CALLING_PROVIDER,
      database
    };
  });
  app.register(authRoutes, { prefix: "/api" });
  app.register(settingsRoutes, { prefix: "/api" });
  app.register(schedulingRoutes, { prefix: "/api" });
  await app.register(leadsRoutes, { prefix: "/api/leads" });
  app.register(campaignRoutes, { prefix: "/api" });
  app.register(callRoutes, { prefix: "/api" });
  return app;
}
