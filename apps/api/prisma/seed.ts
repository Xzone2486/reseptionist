import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { defaultSettings } from "../src/modules/settings/service.js";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: "admin@clinic.local" },
    update: {},
    create: {
      email: "admin@clinic.local",
      passwordHash: await bcrypt.hash("ChangeMe123!", 10),
      role: "ADMIN"
    }
  });

  await prisma.setting.upsert({
    where: { key: "clinic" },
    update: { value: defaultSettings },
    create: { key: "clinic", value: defaultSettings }
  });

  const slots = [
    ["SLOT-1001", "Dr. Meera Shah", "General Medicine", "2026-06-15", "10:00", "10:30"],
    ["SLOT-1002", "Dr. Meera Shah", "General Medicine", "2026-06-15", "10:30", "11:00"],
    ["SLOT-2001", "Dr. Arjun Rao", "Dermatology", "2026-06-16", "14:00", "14:30"]
  ];

  for (const [externalId, doctorName, department, date, startTime, endTime] of slots) {
    await prisma.appointmentSlot.upsert({
      where: { externalId },
      update: {},
      create: {
        externalId,
        doctorName,
        department,
        date: new Date(`${date}T00:00:00.000Z`),
        startTime,
        endTime,
        status: "available"
      }
    });
  }

  for (const lead of [
    { name: "Riya Sharma", phone: "+919876543210", email: "riya@example.com" },
    { name: "Amit Verma", phone: "+919812345678", email: "amit@example.com" }
  ]) {
    await prisma.lead.upsert({
      where: { phone: lead.phone },
      update: {},
      create: { ...lead, source: "website" }
    });
  }
}

main().finally(async () => prisma.$disconnect());
