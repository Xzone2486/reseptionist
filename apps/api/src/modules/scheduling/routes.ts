import type { FastifyInstance } from "fastify";
import { requireAuth } from "../../lib/auth.js";
import { bookAppointment, cancelAppointment, importSlots, listAppointments, listSlots, updateAppointment } from "./service.js";
import { FileSchedulingProvider } from "./provider.js";

export async function schedulingRoutes(app: FastifyInstance) {
  const provider = new FileSchedulingProvider();

  app.post("/slots/upload", { preHandler: requireAuth }, async (request) => {
    const file = await request.file();
    if (!file) return { imported: 0 };
    const rows = await provider.parseSlotFile(await file.toBuffer(), file.filename);
    return importSlots(rows);
  });

  app.get("/slots", { preHandler: requireAuth }, async (request) => listSlots(request.query as Record<string, unknown>));
  app.get("/appointments", { preHandler: requireAuth }, async () => listAppointments());
  app.post("/appointments", { preHandler: requireAuth }, async (request) => bookAppointment(request.body));
  app.put("/appointments/:id", { preHandler: requireAuth }, async (request) => updateAppointment((request.params as any).id, request.body));
  app.post("/appointments/:id/cancel", { preHandler: requireAuth }, async (request) => cancelAppointment((request.params as any).id));
}

