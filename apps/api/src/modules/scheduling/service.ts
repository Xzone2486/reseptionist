import { appointmentCreateSchema, type SlotUploadRow } from "@receptionist/shared";
import { SlotStatus } from "@prisma/client";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

const DEFAULT_HOLD_SECONDS = 5 * 60;

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export async function releaseExpiredSlotHolds(client: { appointmentSlot: typeof prisma.appointmentSlot } = prisma) {
  await client.appointmentSlot.updateMany({
    where: { status: "held", holdExpiresAt: { lte: new Date() } },
    data: { status: "available", holdExpiresAt: null, heldByLeadId: null }
  });
}

export async function importSlots(rows: SlotUploadRow[]) {
  const results = [];
  for (const row of rows) {
    results.push(
      await prisma.appointmentSlot.upsert({
        where: { externalId: row.slot_id },
        update: {
          doctorName: row.doctor_name,
          department: row.department,
          date: dateOnly(row.date),
          startTime: row.start_time,
          endTime: row.end_time,
          status: row.status as SlotStatus,
          holdExpiresAt: row.status === "held" ? new Date(Date.now() + DEFAULT_HOLD_SECONDS * 1000) : null
        },
        create: {
          externalId: row.slot_id,
          doctorName: row.doctor_name,
          department: row.department,
          date: dateOnly(row.date),
          startTime: row.start_time,
          endTime: row.end_time,
          status: row.status as SlotStatus,
          holdExpiresAt: row.status === "held" ? new Date(Date.now() + DEFAULT_HOLD_SECONDS * 1000) : null
        }
      })
    );
  }
  return { imported: results.length };
}

export async function listSlots(query: Record<string, unknown>) {
  await releaseExpiredSlotHolds();
  return prisma.appointmentSlot.findMany({
    where: {
      status: query.status ? (query.status as SlotStatus) : undefined,
      department: query.department ? String(query.department) : undefined
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }]
  });
}

export async function checkAvailableSlots(input: { date?: string; department?: string; preferred_time?: string }) {
  await releaseExpiredSlotHolds();
  return prisma.appointmentSlot.findMany({
    where: {
      status: "available",
      date: input.date ? dateOnly(input.date) : undefined,
      department: input.department,
      startTime: input.preferred_time
        ? { gte: input.preferred_time.slice(0, 5) }
        : undefined
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 5
  });
}

export async function holdSlot(input: { slotId: string; leadId?: string; timeoutSeconds?: number }) {
  const timeoutSeconds = input.timeoutSeconds ?? DEFAULT_HOLD_SECONDS;
  const holdExpiresAt = new Date(Date.now() + timeoutSeconds * 1000);
  return prisma.$transaction(async (tx: any) => {
    await releaseExpiredSlotHolds(tx);
    const slot = await tx.appointmentSlot.findFirst({
      where: { OR: [{ id: input.slotId }, { externalId: input.slotId }] }
    });
    if (!slot) throw new AppError(404, "slot_not_found");
    if (slot.status !== "available") throw new AppError(409, "slot_not_available");

    const result = await tx.appointmentSlot.updateMany({
      where: { id: slot.id, status: "available" },
      data: { status: "held", holdExpiresAt, heldByLeadId: input.leadId ?? null }
    });
    if (result.count !== 1) throw new AppError(409, "slot_not_available");
    return tx.appointmentSlot.findUniqueOrThrow({ where: { id: slot.id } });
  });
}

export async function bookAppointment(input: unknown) {
  const data = appointmentCreateSchema.parse(input);
  return prisma.$transaction(async (tx: any) => {
    await releaseExpiredSlotHolds(tx);
    const slot = await tx.appointmentSlot.findFirst({
      where: { OR: [{ id: data.slotId }, { externalId: data.slotId }] }
    });
    if (!slot) throw new AppError(404, "slot_not_found");
    const now = new Date();
    const canBookHeldSlot =
      slot.status === "held" &&
      (!slot.holdExpiresAt || slot.holdExpiresAt > now) &&
      (!slot.heldByLeadId || slot.heldByLeadId === data.leadId);
    if (slot.status !== "available" && !canBookHeldSlot) throw new AppError(409, "slot_not_available");

    const result = await tx.appointmentSlot.updateMany({
      where: {
        id: slot.id,
        OR: [
          { status: "available" },
          {
            status: "held",
            holdExpiresAt: { gt: now },
            OR: [{ heldByLeadId: data.leadId }, { heldByLeadId: null }]
          }
        ]
      },
      data: { status: "booked", holdExpiresAt: null, heldByLeadId: null }
    });
    if (result.count !== 1) throw new AppError(409, "slot_not_available");

    if (data.leadId) {
      await tx.lead.update({ where: { id: data.leadId }, data: { status: "appointment_booked", email: data.email ?? undefined } });
    }

    return tx.appointment.create({
      data: {
        leadId: data.leadId,
        slotId: slot.id,
        patientName: data.patientName,
        phone: data.phone,
        email: data.email,
        reason: data.reason
      },
      include: { slot: true, lead: true }
    });
  });
}

export async function listAppointments() {
  return prisma.appointment.findMany({
    include: { slot: true, lead: true },
    orderBy: { createdAt: "desc" }
  });
}

export async function updateAppointment(id: string, body: any) {
  return prisma.appointment.update({
    where: { id },
    data: {
      patientName: body.patientName,
      phone: body.phone,
      reason: body.reason
    },
    include: { slot: true }
  });
}

export async function cancelAppointment(id: string) {
  return prisma.$transaction(async (tx: any) => {
    const appointment = await tx.appointment.update({ where: { id }, data: { status: "cancelled" } });
    await tx.appointmentSlot.update({ where: { id: appointment.slotId }, data: { status: "cancelled", holdExpiresAt: null, heldByLeadId: null } });
    return appointment;
  });
}
