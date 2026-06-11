import { config } from "../config.js";

async function api(path: string, body: unknown) {
  const response = await fetch(`${config.API_BASE_URL}/api${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.VOICE_AGENT_SERVICE_TOKEN}`
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`API tool failed ${path}: ${response.status}`);
  return response.json();
}

export const toolsClient = {
  checkAvailableSlots: (body: { date?: string; department?: string; preferred_time?: string }) =>
    api("/tools/check_available_slots", body),
  holdSlot: (body: { lead_id?: string; slot_id: string; timeout_seconds?: number }) => api("/tools/hold_slot", body),
  bookAppointment: (body: { lead_id?: string; slot_id: string; patient_name: string; phone: string; email?: string; reason: string }) =>
    api("/tools/book_appointment", body),
  sendConfirmationEmail: (body: { appointment_id: string; email?: string; consent_confirmed: boolean }) =>
    api("/tools/send_confirmation_email", body),
  markLeadStatus: (body: { lead_id: string; status: string }) => api("/tools/mark_lead_status", body),
  scheduleRetry: (body: { lead_id: string; reason: string; preferred_time?: string }) => api("/tools/schedule_retry", body),
  transferToHuman: (body: { lead_id?: string; reason: string }) => api("/tools/transfer_to_human", body),
  saveProviderCall: (attemptId: string, body: unknown) => api(`/webhooks/calls/${attemptId}/provider`, body),
  saveOutcome: (attemptId: string, body: unknown) => api(`/webhooks/calls/${attemptId}/outcome`, body),
  saveTranscript: (attemptId: string, body: unknown) => api(`/webhooks/calls/${attemptId}/transcript`, body)
};
