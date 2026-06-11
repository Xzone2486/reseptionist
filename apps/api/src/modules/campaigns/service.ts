import { leadImportSchema, manualLeadSchema } from "@receptionist/shared";
import { config } from "../../config.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { enqueueOutboundCall } from "../../jobs/queue.js";

export async function importLeads(rows: unknown[]) {
  let imported = 0;
  for (const raw of rows) {
    const row = leadImportSchema.parse(raw);
    await prisma.lead.upsert({
      where: { phone: row.phone },
      update: { name: row.name ?? undefined, email: row.email ?? undefined, source: row.source, notes: row.notes ?? undefined },
      create: { name: row.name ?? undefined, email: row.email ?? undefined, phone: row.phone, source: row.source, notes: row.notes ?? undefined }
    });
    imported += 1;
  }
  return { imported };
}

export async function listLeads() {
  return prisma.lead.findMany({
    include: { attempts: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" }
  });
}

function cleanOptional(value?: string | null) {
  return value && value.trim() ? value.trim() : null;
}

export async function createManualLead(input: unknown) {
  const data = manualLeadSchema.parse(input);
  return prisma.lead.upsert({
    where: { phone: data.phone },
    update: {
      name: data.name,
      email: data.email ?? undefined,
      source: data.source || "manual",
      appointmentReason: cleanOptional(data.appointmentReason),
      department: cleanOptional(data.department),
      preferredDate: cleanOptional(data.preferredDate),
      preferredTime: cleanOptional(data.preferredTime),
      notes: cleanOptional(data.notes),
      doNotCall: data.doNotCall,
      status: data.doNotCall ? "do_not_call" : "queued"
    },
    create: {
      name: data.name,
      phone: data.phone,
      email: data.email ?? undefined,
      source: data.source || "manual",
      appointmentReason: cleanOptional(data.appointmentReason),
      department: cleanOptional(data.department),
      preferredDate: cleanOptional(data.preferredDate),
      preferredTime: cleanOptional(data.preferredTime),
      notes: cleanOptional(data.notes),
      doNotCall: data.doNotCall,
      status: data.doNotCall ? "do_not_call" : "queued"
    }
  });
}

export async function updateLead(id: string, input: unknown) {
  const data = manualLeadSchema.partial({ name: true, phone: true }).parse(input);
  if (data.phone) {
    const existing = await prisma.lead.findUnique({ where: { phone: data.phone } });
    if (existing && existing.id !== id) throw new AppError(409, "phone_already_exists");
  }
  return prisma.lead.update({
    where: { id },
    data: {
      name: data.name,
      phone: data.phone,
      email: data.email ?? undefined,
      source: data.source,
      appointmentReason: data.appointmentReason === undefined ? undefined : cleanOptional(data.appointmentReason),
      department: data.department === undefined ? undefined : cleanOptional(data.department),
      preferredDate: data.preferredDate === undefined ? undefined : cleanOptional(data.preferredDate),
      preferredTime: data.preferredTime === undefined ? undefined : cleanOptional(data.preferredTime),
      notes: data.notes === undefined ? undefined : cleanOptional(data.notes),
      doNotCall: data.doNotCall,
      status: data.doNotCall ? "do_not_call" : undefined
    }
  });
}

export async function deleteLead(id: string) {
  return prisma.$transaction(async (tx: any) => {
    const attempts = await tx.callAttempt.findMany({ where: { leadId: id }, select: { id: true } });
    const attemptIds = attempts.map((attempt: { id: string }) => attempt.id);
    if (attemptIds.length) {
      await tx.retryJob.deleteMany({ where: { callAttemptId: { in: attemptIds } } });
      await tx.callTranscript.deleteMany({ where: { callAttemptId: { in: attemptIds } } });
      await tx.extractedCallData.deleteMany({ where: { callAttemptId: { in: attemptIds } } });
      await tx.callAttempt.deleteMany({ where: { id: { in: attemptIds } } });
    }
    await tx.campaignLead.deleteMany({ where: { leadId: id } });
    await tx.appointment.updateMany({ where: { leadId: id }, data: { leadId: null } });
    return tx.lead.delete({ where: { id } });
  });
}

export async function callLeadNow(id: string) {
  return prisma.$transaction(async (tx: any) => {
    const lead = await tx.lead.findUnique({ where: { id } });
    if (!lead) throw new AppError(404, "lead_not_found");
    if (lead.doNotCall) throw new AppError(409, "lead_is_do_not_call");
    const previousAttempts = await tx.callAttempt.count({ where: { leadId: id } });
    const attempt = await tx.callAttempt.create({
      data: {
        leadId: id,
        status: "queued",
        callingProvider: config.CALLING_PROVIDER,
        attemptNumber: previousAttempts + 1
      }
    });
    await tx.lead.update({ where: { id }, data: { status: "calling" } });
    await enqueueOutboundCall({ leadId: id, attemptId: attempt.id, phone: lead.phone, email: lead.email || undefined });
    return attempt;
  });
}

export async function createCampaign(body: any) {
  const leadIds: string[] = body.leadIds || [];
  return prisma.callCampaign.create({
    data: {
      name: body.name || `Campaign ${new Date().toISOString()}`,
      leads: { create: leadIds.map((leadId) => ({ leadId })) }
    },
    include: { leads: { include: { lead: true } } }
  });
}

export async function listCampaigns() {
  return prisma.callCampaign.findMany({
    include: { leads: { include: { lead: true } }, attempts: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function startCampaign(id: string) {
  const campaign = await prisma.callCampaign.update({
    where: { id },
    data: { status: "running" },
    include: { leads: { include: { lead: true } } }
  });
  for (const campaignLead of campaign.leads) {
    if (campaignLead.lead.doNotCall) continue;
    const previousAttempts = await prisma.callAttempt.count({ where: { leadId: campaignLead.leadId, campaignId: id } });
    const attempt = await prisma.callAttempt.create({
      data: {
        leadId: campaignLead.leadId,
        campaignId: id,
        status: "queued",
        callingProvider: config.CALLING_PROVIDER,
        attemptNumber: previousAttempts + 1
      }
    });
    await enqueueOutboundCall({ leadId: campaignLead.leadId, campaignId: id, attemptId: attempt.id, phone: campaignLead.lead.phone, email: campaignLead.lead.email || undefined });
  }
  return campaign;
}

export async function stopCampaign(id: string) {
  return prisma.callCampaign.update({ where: { id }, data: { status: "stopped" } });
}
