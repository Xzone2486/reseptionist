import type { FastifyInstance } from "fastify";
import { config } from "../../config.js";
import { enqueueOutboundCall } from "../../jobs/queue.js";
import { prisma } from "../../lib/prisma.js";

export async function leadsRoutes(app: FastifyInstance) {
  app.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string" }, (_request, body, done) => {
    done(null, body);
  });

  app.post("/:leadId/call-now", async (request, reply) => {
    const { leadId } = request.params as { leadId: string };

    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: "unauthorized" });
      return;
    }

    try {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (!lead) {
        reply.status(404).send({ error: "lead_not_found" });
        return;
      }
      if (lead.doNotCall) {
        reply.status(400).send({ error: "lead_is_do_not_call" });
        return;
      }

      const attemptNumber = (await prisma.callAttempt.count({ where: { leadId } })) + 1;
      const scheduledFor = new Date();
      const attempt = await prisma.callAttempt.create({
        data: {
          leadId,
          status: "queued",
          callingProvider: config.CALLING_PROVIDER,
          attemptNumber,
          scheduledFor
        }
      });
      const updatedLead = await prisma.lead.update({
        where: { id: leadId },
        data: { status: "queued" }
      });

      await enqueueOutboundCall({
        leadId,
        callAttemptId: attempt.id,
        attemptId: attempt.id,
        phone: updatedLead.phone,
        email: updatedLead.email || undefined
      });

      return {
        ok: true,
        message: "Call queued",
        lead: updatedLead,
        attempt
      };
    } catch (error) {
      request.log.error({ err: error, leadId }, "failed to queue lead call");
      reply.status(500).send({ error: "failed_to_queue_call" });
    }
  });
}
