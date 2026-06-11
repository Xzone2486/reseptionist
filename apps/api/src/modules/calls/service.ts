import type { CallStatus } from "@receptionist/shared";
import { config } from "../../config.js";
import { prisma } from "../../lib/prisma.js";
import { enqueueOutboundCall } from "../../jobs/queue.js";
import { isTerminalNoRetry, retryDelayMs } from "./retry.js";
import { getSettings } from "../settings/service.js";
import { normalizeVobizStatus, stableWebhookEventId, verifyVobizWebhookSignature } from "./lifecycle.js";

export { normalizeVobizStatus, verifyVobizWebhookSignature };

export async function listCallAttempts() {
  return prisma.callAttempt.findMany({
    include: { lead: true, campaign: true, transcript: true, extractedData: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function getTranscript(attemptId: string) {
  return prisma.callAttempt.findUnique({
    where: { id: attemptId },
    include: { lead: true, transcript: true, extractedData: true }
  });
}

export async function updateCallOutcome(attemptId: string, body: any) {
  const status = body.status as CallStatus;
  const attempt = await prisma.callAttempt.update({
    where: { id: attemptId },
    data: {
      status,
      endedAt: new Date(),
      failureReason: body.reason
    }
  });

  await prisma.lead.update({
    where: { id: attempt.leadId },
    data: {
      status,
      doNotCall: status === "do_not_call" || status === "wrong_number",
      needsHumanFollowup: status === "follow_up_needed" ? true : undefined,
      handoffReason: status === "follow_up_needed" ? body.reason : undefined
    }
  });

  if (!isTerminalNoRetry(status) && ["no_answer", "busy", "failed"].includes(status)) {
    await scheduleRetry(attempt.leadId, attempt.id, status as "no_answer" | "busy" | "failed");
  }
  return attempt;
}

export async function updateProviderCall(attemptId: string, body: any) {
  return prisma.callAttempt.update({
    where: { id: attemptId },
    data: {
      status: "dialing",
      callingProvider: body.callingProvider,
      providerCallId: body.providerCallId,
      roomName: body.roomName,
      startedAt: body.startedAt ? new Date(body.startedAt) : undefined
    }
  });
}

export async function handleVobizWebhook(payload: any) {
  const eventId = stableWebhookEventId(payload);
  try {
    await prisma.webhookEvent.create({
      data: { provider: "vobiz", eventId, eventType: String(payload.event || payload.status || payload.call_status || ""), payload }
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return { duplicate: true, eventId };
    }
    throw error;
  }

  const providerCallId = payload.call_id || payload.callId || payload.uuid || payload.id;
  const attemptId = payload.call_attempt_id || payload.callAttemptId || payload.metadata?.attemptId;
  const where = attemptId ? { id: attemptId } : { providerCallId: String(providerCallId) };
  const status = normalizeVobizStatus(payload.status || payload.event || payload.call_status);

  const attempt = await prisma.callAttempt.update({
    where,
    data: {
      status,
      providerCallId: providerCallId ? String(providerCallId) : undefined,
      durationSeconds: payload.duration ? Number(payload.duration) : undefined,
      recordingUrl: payload.recording_url || payload.recordingUrl,
      cost: payload.cost ? String(payload.cost) : undefined,
      answeredByMachine: payload.answered_by_machine ?? payload.machine_detected ?? undefined,
      startedAt: ["dialing", "answered"].includes(status) ? new Date() : undefined,
      endedAt: ["completed", "failed", "no_answer"].includes(status) ? new Date() : undefined,
      failureReason: payload.reason || payload.error
    }
  });

  await prisma.lead.update({ where: { id: attempt.leadId }, data: { status } });
  if (["no_answer", "failed"].includes(status)) {
    await scheduleRetry(attempt.leadId, attempt.id, status as "no_answer" | "failed");
  }
  await prisma.webhookEvent.update({ where: { provider_eventId: { provider: "vobiz", eventId } }, data: { processedAt: new Date() } });
  return attempt;
}

export async function saveTranscript(attemptId: string, body: any) {
  await prisma.callTranscript.upsert({
    where: { callAttemptId: attemptId },
    update: { turns: body.turns || [], summary: body.summary },
    create: { callAttemptId: attemptId, turns: body.turns || [], summary: body.summary }
  });
  if (body.extractedData) {
    await prisma.extractedCallData.upsert({
      where: { callAttemptId: attemptId },
      update: { ...body.extractedData, raw: body.extractedData },
      create: { callAttemptId: attemptId, ...body.extractedData, raw: body.extractedData }
    });
  }
  return { ok: true };
}

export async function scheduleRetry(
  leadId: string,
  attemptId: string | null,
  reason: "no_answer" | "busy" | "failed" | "call_later",
  preferredTime?: string
) {
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead || lead.doNotCall) return { skipped: true, reason: "terminal_lead" };
  const settings = await getSettings();
  const previousAttempts = await prisma.callAttempt.count({ where: { leadId } });
  const maxAttempts = settings.retryRules[reason].maxAttempts;
  if (previousAttempts >= maxAttempts) {
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "follow_up_needed", needsHumanFollowup: true, handoffReason: `retry_limit_${reason}` }
    });
    return { skipped: true, reason: "retry_limit_reached" };
  }
  const delay = await retryDelayMs(reason, preferredTime);
  const scheduledFor = new Date(Date.now() + delay);
  const retryJob = await prisma.retryJob.create({
    data: { leadId, callAttemptId: attemptId || undefined, reason, scheduledFor }
  });
  if (attemptId) {
    await prisma.callAttempt.update({ where: { id: attemptId }, data: { status: "retry_scheduled", scheduledFor } });
  }
  const newAttempt = await prisma.callAttempt.create({
    data: { leadId, status: "queued", attemptNumber: previousAttempts + 1, scheduledFor, callingProvider: config.CALLING_PROVIDER }
  });
  await enqueueOutboundCall({ leadId, attemptId: newAttempt.id, phone: lead?.phone, email: lead?.email || undefined }, delay);
  return retryJob;
}

export async function markHumanFollowup(input: { lead_id?: string; reason: string }) {
  if (!input.lead_id) return { queued: true, reason: input.reason };
  return prisma.lead.update({
    where: { id: input.lead_id },
    data: { status: "follow_up_needed", needsHumanFollowup: true, handoffReason: input.reason }
  });
}
