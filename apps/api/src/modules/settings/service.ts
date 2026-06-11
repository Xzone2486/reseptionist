import { defaultRetryRules, settingsSchema, type Settings } from "@receptionist/shared";
import { prisma } from "../../lib/prisma.js";

export const defaultSettings: Settings = {
  clinicName: process.env.CLINIC_NAME || "Demo Care Clinic",
  clinicAddress: process.env.CLINIC_ADDRESS || "Clinic address not configured",
  openingHours: {
    timezone: "Asia/Calcutta",
    days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    open: "09:00",
    close: "18:00"
  },
  retryRules: defaultRetryRules,
  voice: {
    providerMode: (process.env.CALLING_PROVIDER as "mock" | "vobiz_sip" | "vobiz_api") || "mock",
    ttsVoiceId: process.env.CARTESIA_VOICE_ID || null,
    llmModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    interruptionEnabled: true,
    silenceTimeoutMs: 4500
  }
};

export async function getSettings(): Promise<Settings> {
  const row = await prisma.setting.findUnique({ where: { key: "clinic" } });
  if (!row) return defaultSettings;
  return settingsSchema.parse(row.value);
}

export async function updateSettings(input: unknown): Promise<Settings> {
  const value = settingsSchema.parse(input);
  await prisma.setting.upsert({
    where: { key: "clinic" },
    update: { value },
    create: { key: "clinic", value }
  });
  return value;
}
