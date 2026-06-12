import { nextDecision, type ExtractedBookingDetails } from "./state-machine.js";
import { toolsClient } from "./tools-client.js";

export async function runMockSession(input: { leadId: string; attemptId: string }) {
  const turns = [
    { speaker: "assistant", text: nextDecision("greeting", "").say },
    { speaker: "user", text: "Yes, I want to book a general medicine appointment tomorrow morning." },
    { speaker: "assistant", text: nextDecision("consent", "yes").say },
    { speaker: "user", text: "My name is Demo Patient. Reason is fever." },
    { speaker: "assistant", text: nextDecision("intent", "book appointment").say },
    { speaker: "assistant", text: "Appointment confirm ho gaya. Aapko email confirmation bhi bhej du? Usme timing, doctor, location aur kab aana hai sab details rahengi." },
    { speaker: "user", text: "Yes, send it to demo.patient@example.com." }
  ];

  const availableSlots = await toolsClient.checkAvailableSlots({ department: "General Medicine" });
  if (availableSlots.length === 0) {
    await toolsClient.transferToHuman({ lead_id: input.leadId, reason: "no_slots_available" });
    await toolsClient.saveOutcome(input.attemptId, { status: "follow_up_needed", reason: "no_slots_available" });
    return;
  }

  const slot = await toolsClient.holdSlot({ lead_id: input.leadId, slot_id: availableSlots[0].externalId });
  turns.push({ speaker: "assistant", text: `I have ${slot.doctorName} available on ${slot.date} at ${slot.startTime}. Should I book it?` });
  turns.push({ speaker: "user", text: "Yes, please confirm it." });

  const appointment = await toolsClient.bookAppointment({
    lead_id: input.leadId,
    slot_id: slot.externalId,
    patient_name: "Demo Patient",
    phone: "+919999999999",
    email: "demo.patient@example.com",
    reason: "Fever"
  });
  try {
    const emailResult: any = await toolsClient.sendConfirmationEmail({
      appointment_id: appointment.id,
      email: "demo.patient@example.com",
      consent_confirmed: true
    });
    turns.push({
      speaker: "assistant",
      text: emailResult.emailSent
        ? "Done, maine confirmation email bhej diya hai. Please appointment se 10-15 minutes pehle aa jaiyega."
        : "Appointment confirm hai. Email local mock mode mein log ho gaya hai, real Gmail send nahi hua."
    });
  } catch {
    turns.push({ speaker: "assistant", text: "Email abhi send nahi ho paya, but appointment confirm hai. Clinic team details share kar degi." });
  }

  const extractedData: ExtractedBookingDetails = {
    patientName: "Demo Patient",
    phone: "+919999999999",
    email: "demo.patient@example.com",
    department: "General Medicine",
    reason: "Fever",
    confirmed: true
  };
  await toolsClient.saveTranscript(input.attemptId, { turns, summary: "Mock caller booked an appointment.", extractedData });
  await toolsClient.saveOutcome(input.attemptId, { status: "appointment_booked", reason: "appointment_confirmed" });
}
