ALTER TABLE "Lead" ADD COLUMN "email" TEXT;

ALTER TABLE "Appointment" ADD COLUMN "email" TEXT;
ALTER TABLE "Appointment" ADD COLUMN "confirmationEmailSent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Appointment" ADD COLUMN "confirmationEmailSentAt" TIMESTAMP(3);

