import fs from "node:fs";
import { google } from "googleapis";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";
import { config } from "../../config.js";
import { getSettings } from "../settings/service.js";

function loadJsonFile(path: string, label: string) {
  if (!fs.existsSync(path)) throw new AppError(500, `${label}_not_found`);
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function createGmailClient() {
  if (!config.GMAIL_CREDENTIALS_FILE || !config.GMAIL_TOKEN_FILE) {
    throw new AppError(500, "gmail_credentials_not_configured");
  }
  const credentials = loadJsonFile(config.GMAIL_CREDENTIALS_FILE, "gmail_credentials");
  const token = loadJsonFile(config.GMAIL_TOKEN_FILE, "gmail_token");
  const clientInfo = credentials.installed || credentials.web;
  if (!clientInfo?.client_id || !clientInfo?.client_secret) {
    throw new AppError(500, "gmail_credentials_invalid");
  }
  const oauth2 = new google.auth.OAuth2(
    clientInfo.client_id,
    clientInfo.client_secret,
    clientInfo.redirect_uris?.[0]
  );
  oauth2.setCredentials(token);
  return google.gmail({ version: "v1", auth: oauth2 });
}

function encodeMessage(message: string) {
  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function formatAppointmentDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

export async function sendAppointmentConfirmationEmail(appointmentId: string, requestedEmail?: string, consentConfirmed = false) {
  if (!consentConfirmed) throw new AppError(400, "email_consent_required");
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { slot: true, lead: true }
  });
  if (!appointment) throw new AppError(404, "appointment_not_found");

  const to = requestedEmail || appointment.email || appointment.lead?.email;
  if (!to) throw new AppError(400, "appointment_email_missing");

  const settings = await getSettings();
  const gmail = createGmailClient();
  const subject = `Appointment confirmed - ${settings.clinicName}`;
  const date = formatAppointmentDate(appointment.slot.date);
  const body = [
    `Hi ${appointment.patientName},`,
    "",
    `Your doctor appointment is confirmed at ${settings.clinicName}.`,
    "",
    `Date: ${date}`,
    `Time: ${appointment.slot.startTime} - ${appointment.slot.endTime}`,
    `Doctor: ${appointment.slot.doctorName}`,
    `Department: ${appointment.slot.department}`,
    `Reason: ${appointment.reason}`,
    `Location: ${settings.clinicAddress}`,
    "",
    "Please come 10-15 minutes early and carry any previous reports, prescriptions, and ID if required.",
    "",
    "Thank you."
  ].join("\n");
  const raw = encodeMessage([
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    body
  ].join("\r\n"));

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw }
  });

  const updated = await prisma.appointment.update({
    where: { id: appointment.id },
    data: {
      email: to,
      confirmationEmailSent: true,
      confirmationEmailSentAt: new Date()
    },
    include: { slot: true, lead: true }
  });
  if (appointment.leadId) {
    await prisma.lead.update({ where: { id: appointment.leadId }, data: { email: to } });
  }
  return { sent: true, appointment: updated };
}

