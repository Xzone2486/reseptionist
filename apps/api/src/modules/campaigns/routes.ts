import { parse } from "csv-parse/sync";
import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../lib/auth.js";
import { callLeadNow, createCampaign, createManualLead, deleteLead, importLeads, listCampaigns, listLeads, startCampaign, stopCampaign, updateLead } from "./service.js";

export async function campaignRoutes(app: FastifyInstance) {
  app.post("/leads/import", { preHandler: requireAuth }, async (request) => {
    const file = await request.file();
    if (!file) return { imported: 0 };
    const rows = parse(await file.toBuffer(), { columns: true, skip_empty_lines: true, trim: true });
    return importLeads(rows);
  });

  app.post("/leads", { preHandler: requireAuth }, async (request) => createManualLead(request.body));
  app.get("/leads", { preHandler: requireAuth }, async () => listLeads());
  app.patch("/leads/:id", { preHandler: requireAuth }, async (request) => updateLead((request.params as any).id, request.body));
  app.delete("/leads/:id", { preHandler: requireAuth }, async (request) => deleteLead((request.params as any).id));
  app.post("/leads/:id/call-now", { preHandler: requireAuth }, async (request) => callLeadNow((request.params as any).id));
  app.post("/campaigns", { preHandler: requireAuth }, async (request) => createCampaign(request.body));
  app.get("/campaigns", { preHandler: requireAuth }, async () => listCampaigns());
  app.post("/campaigns/:id/start", { preHandler: requireAuth }, async (request) => startCampaign((request.params as any).id));
  app.post("/campaigns/:id/stop", { preHandler: requireAuth }, async (request) => stopCampaign((request.params as any).id));
}
