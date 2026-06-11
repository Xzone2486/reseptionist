import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../lib/auth.js";
import { getSettings, updateSettings } from "./service.js";

export async function settingsRoutes(app: FastifyInstance) {
  app.get("/settings", { preHandler: requireAuth }, async () => getSettings());
  app.put("/settings", { preHandler: requireAuth }, async (request) => updateSettings(request.body));
}

