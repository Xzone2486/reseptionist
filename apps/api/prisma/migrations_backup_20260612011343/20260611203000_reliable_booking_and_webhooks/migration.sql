ALTER TYPE "SlotStatus" ADD VALUE IF NOT EXISTS 'held';
ALTER TYPE "SlotStatus" ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TYPE "CallStatus" ADD VALUE IF NOT EXISTS 'queued';
ALTER TYPE "CallStatus" ADD VALUE IF NOT EXISTS 'dialing';
ALTER TYPE "CallStatus" ADD VALUE IF NOT EXISTS 'answered';
ALTER TYPE "CallStatus" ADD VALUE IF NOT EXISTS 'appointment_requested';
ALTER TYPE "CallStatus" ADD VALUE IF NOT EXISTS 'appointment_booked';
ALTER TYPE "CallStatus" ADD VALUE IF NOT EXISTS 'follow_up_needed';

ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "needsHumanFollowup" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "handoffReason" TEXT;

ALTER TABLE "AppointmentSlot" ADD COLUMN IF NOT EXISTS "holdExpiresAt" TIMESTAMP(3);
ALTER TABLE "AppointmentSlot" ADD COLUMN IF NOT EXISTS "heldByLeadId" TEXT;

CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  "id" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "payload" JSONB NOT NULL,

  CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "WebhookEvent_provider_eventId_key" ON "WebhookEvent"("provider", "eventId");
