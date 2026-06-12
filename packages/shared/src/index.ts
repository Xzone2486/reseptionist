import { z } from "zod";

export const callStatuses = [
  "queued",
  "dialing",
  "answered",
  "appointment_requested",
  "appointment_booked",
  "follow_up_needed",
  "pending",
  "calling",
  "completed",
  "failed",
  "retry_scheduled",
  "booked",
  "declined",
  "no_answer",
  "busy",
  "do_not_call",
  "wrong_number"
] as const;

export const slotStatuses = ["available", "held", "booked", "cancelled"] as const;
export const campaignStatuses = ["draft", "running", "paused", "completed", "stopped"] as const;
export const callingProviders = ["mock", "vobiz_sip"] as const;
const optionalEmail = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().email().optional().nullable()
);

export const slotUploadSchema = z.object({
  slot_id: z.string().min(1),
  doctor_name: z.string().min(1),
  department: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^\d{2}:\d{2}$/),
  end_time: z.string().regex(/^\d{2}:\d{2}$/),
  status: z.enum(slotStatuses)
});

export const leadImportSchema = z.object({
  name: z.string().optional().nullable(),
  phone: z.string().min(7),
  email: optionalEmail,
  source: z.string().default("website"),
  notes: z.string().optional().nullable()
});

export const manualLeadSchema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().trim().min(7).regex(/^\+?[0-9][0-9\s\-()]{6,}$/),
  email: optionalEmail,
  source: z.string().trim().default("manual"),
  appointmentReason: z.string().trim().optional().nullable(),
  department: z.string().trim().optional().nullable(),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")).nullable(),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")).nullable(),
  notes: z.string().trim().optional().nullable(),
  doNotCall: z.boolean().default(false)
});

export const appointmentCreateSchema = z.object({
  leadId: z.string().uuid().optional(),
  slotId: z.string().uuid(),
  patientName: z.string().min(1),
  phone: z.string().min(7),
  email: optionalEmail,
  reason: z.string().min(1)
});

export const retryRulesSchema = z.object({
  no_answer: z.object({ enabled: z.boolean(), delayMinutes: z.number().int().min(1), maxAttempts: z.number().int().min(1) }),
  busy: z.object({ enabled: z.boolean(), delayMinutes: z.number().int().min(1), maxAttempts: z.number().int().min(1) }),
  failed: z.object({ enabled: z.boolean(), delayMinutes: z.number().int().min(1), maxAttempts: z.number().int().min(1) }),
  call_later: z.object({ enabled: z.boolean(), delayMinutes: z.number().int().min(1), maxAttempts: z.number().int().min(1) })
});

export const defaultRetryRules = {
  no_answer: { enabled: true, delayMinutes: 120, maxAttempts: 3 },
  busy: { enabled: true, delayMinutes: 60, maxAttempts: 3 },
  failed: { enabled: true, delayMinutes: 120, maxAttempts: 2 },
  call_later: { enabled: true, delayMinutes: 1440, maxAttempts: 3 }
} satisfies z.infer<typeof retryRulesSchema>;

export const settingsSchema = z.object({
  clinicName: z.string().min(1),
  clinicAddress: z.string().default("Clinic address not configured"),
  openingHours: z.object({
    timezone: z.string().default("Asia/Calcutta"),
    days: z.array(z.string()),
    open: z.string(),
    close: z.string()
  }),
  retryRules: retryRulesSchema,
  voice: z.object({
    providerMode: z.enum(callingProviders),
    ttsVoiceId: z.string().optional().nullable(),
    llmModel: z.string().default("llama-3.1-8b-instant"),
    interruptionEnabled: z.boolean().default(true),
    silenceTimeoutMs: z.number().int().default(4500)
  })
});

export const toolSchemas = {
  check_available_slots: z.object({
    date: z.string().optional(),
    department: z.string().optional(),
    preferred_time: z.string().optional()
  }),
  book_appointment: z.object({
    lead_id: z.string().optional(),
    slot_id: z.string(),
    patient_name: z.string(),
    phone: z.string(),
    email: z.preprocess((value) => value === "" ? undefined : value, z.string().email().optional()),
    reason: z.string()
  }),
  hold_slot: z.object({
    lead_id: z.string().optional(),
    slot_id: z.string(),
    timeout_seconds: z.number().int().min(30).max(1800).optional()
  }),
  send_confirmation_email: z.object({
    appointment_id: z.string(),
    email: z.preprocess((value) => value === "" ? undefined : value, z.string().email().optional()),
    consent_confirmed: z.boolean()
  }),
  mark_lead_status: z.object({
    lead_id: z.string(),
    status: z.enum(callStatuses)
  }),
  schedule_retry: z.object({
    lead_id: z.string(),
    reason: z.enum(["no_answer", "busy", "failed", "call_later"]),
    preferred_time: z.string().optional()
  }),
  end_call: z.object({ reason: z.string() }),
  transfer_to_human: z.object({ lead_id: z.string().optional(), reason: z.string() })
};

export type SlotUploadRow = z.infer<typeof slotUploadSchema>;
export type LeadImportRow = z.infer<typeof leadImportSchema>;
export type ManualLeadInput = z.infer<typeof manualLeadSchema>;
export type RetryRules = z.infer<typeof retryRulesSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type CallStatus = (typeof callStatuses)[number];
