import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { toolSchemas } from "@receptionist/shared";
import { requireAuth } from "../../lib/auth.js";
import { config } from "../../config.js";
import { bookAppointment, checkAvailableSlots, holdSlot } from "../scheduling/service.js";
import { getTranscript, handleVobizWebhook, listCallAttempts, markHumanFollowup, saveTranscript, scheduleRetry, updateCallOutcome, updateProviderCall, verifyVobizWebhookSignature } from "./service.js";
import { prisma } from "../../lib/prisma.js";
import { sendAppointmentConfirmationEmail } from "../email/service.js";

function requireServiceToken(request: any, reply: any, done: any) {
  const token = request.headers.authorization?.replace("Bearer ", "");
  if (token !== config.VOICE_AGENT_SERVICE_TOKEN) {
    reply.status(401).send({ error: "unauthorized" });
    return;
  }
  done();
}

function requireVobizWebhookSecret(request: any, reply: any, done: any) {
  if (!config.VOBIZ_WEBHOOK_SECRET) {
    done();
    return;
  }
  if (!verifyVobizWebhookSignature(request.headers, request.body)) {
    reply.status(401).send({ error: "invalid_vobiz_webhook_signature" });
    return;
  }
  done();
}

export async function callRoutes(app: FastifyInstance) {
  app.get("/call-attempts", { preHandler: requireAuth }, async () => listCallAttempts());
  app.get("/call-attempts/:id/transcript", { preHandler: requireAuth }, async (request) => getTranscript((request.params as any).id));

  app.post("/webhooks/calls/:id/outcome", { preHandler: requireServiceToken }, async (request) =>
    updateCallOutcome((request.params as any).id, request.body)
  );
  app.post("/webhooks/calls/:id/provider", { preHandler: requireServiceToken }, async (request) =>
    updateProviderCall((request.params as any).id, request.body)
  );
  app.post("/webhooks/calls/:id/transcript", { preHandler: requireServiceToken }, async (request) =>
    saveTranscript((request.params as any).id, request.body)
  );
  app.post("/webhooks/vobiz/calls", { preHandler: requireVobizWebhookSecret }, async (request) =>
    handleVobizWebhook(request.body)
  );

  app.post("/tools/check_available_slots", { preHandler: requireServiceToken }, async (request) =>
    checkAvailableSlots(toolSchemas.check_available_slots.parse(request.body))
  );
  app.post("/tools/hold_slot", { preHandler: requireServiceToken }, async (request) => {
    const body = toolSchemas.hold_slot.parse(request.body);
    return holdSlot({ leadId: body.lead_id, slotId: body.slot_id, timeoutSeconds: body.timeout_seconds });
  });
  app.post("/tools/book_appointment", { preHandler: requireServiceToken }, async (request) => {
    const body = toolSchemas.book_appointment.parse(request.body);
    const slot = await prisma.appointmentSlot.findUnique({ where: { externalId: body.slot_id } });
    return bookAppointment({
      leadId: body.lead_id,
      slotId: slot?.id || body.slot_id,
      patientName: body.patient_name,
      phone: body.phone,
      email: body.email,
      reason: body.reason
    });
  });
  app.post("/tools/send_confirmation_email", { preHandler: requireServiceToken }, async (request) => {
    const body = toolSchemas.send_confirmation_email.parse(request.body);
    return sendAppointmentConfirmationEmail(body.appointment_id, body.email, body.consent_confirmed);
  });
  app.post("/tools/mark_lead_status", { preHandler: requireServiceToken }, async (request) => {
    const body = toolSchemas.mark_lead_status.parse(request.body);
    return prisma.lead.update({ where: { id: body.lead_id }, data: { status: body.status, doNotCall: body.status === "do_not_call" } });
  });
  app.post("/tools/schedule_retry", { preHandler: requireServiceToken }, async (request) => {
    const body = toolSchemas.schedule_retry.parse(request.body);
    return scheduleRetry(body.lead_id, null, body.reason, body.preferred_time);
  });
  app.post("/tools/end_call", { preHandler: requireServiceToken }, async (request) => z.object({ reason: z.string() }).parse(request.body));
  app.post("/tools/transfer_to_human", { preHandler: requireServiceToken }, async (request) =>
    markHumanFollowup(z.object({ lead_id: z.string().optional(), reason: z.string() }).parse(request.body))
  );
}
