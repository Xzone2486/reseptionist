import type { CallStatus } from "@receptionist/shared";
import { getSettings } from "../settings/service.js";

export function isTerminalNoRetry(status: CallStatus) {
  return ["declined", "wrong_number", "do_not_call", "booked", "appointment_booked", "follow_up_needed", "completed"].includes(status);
}

export async function retryDelayMs(reason: "no_answer" | "busy" | "failed" | "call_later", preferredTime?: string) {
  if (preferredTime) {
    const date = new Date(preferredTime);
    if (!Number.isNaN(date.getTime()) && date.getTime() > Date.now()) return date.getTime() - Date.now();
  }
  const settings = await getSettings();
  return settings.retryRules[reason].delayMinutes * 60 * 1000;
}
