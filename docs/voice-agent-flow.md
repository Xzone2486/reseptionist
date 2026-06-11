# Voice Agent Flow

State machine:

1. Greeting
2. Consent / good time to talk
3. Appointment intent detection
4. Slot preference collection
5. Availability lookup
6. Offer available slot
7. Confirm booking
8. Save appointment
9. Ask whether to send confirmation email
10. Send confirmation email only after consent
11. End call politely
12. Retry or mark declined

Guardrails:

- Keep phone responses brief.
- Ask one question at a time.
- Never provide medical advice.
- Never hallucinate slots.
- Only book after confirming name, date, time, and reason.
- Speak in natural Indian Hinglish, mixing Hindi and English comfortably.
- After booking, ask before sending confirmation email. If email exists, ask permission; if missing, collect email and ask permission.
- Never retry declined, wrong-number, or do-not-call leads.
- Ask once when speech is unclear; if still unclear, end politely and retry when appropriate.

Calling provider modes:

- `mock`: no real call is placed; campaign, booking, transcript, retry, and extracted-data flows are simulated.
- `vobiz_sip`: Vobiz provides SIP/PSTN trunking while LiveKit runs the realtime AI room with Deepgram, Groq, and Cartesia.
- `vobiz_api`: `VobizApiCallingProvider` starts calls through Vobiz's outbound API and the API receives Vobiz call webhooks.

Live provider notes:

- Deepgram should run streaming STT with interim transcripts and endpointing.
- Groq should receive the system prompt plus tool definitions.
- Cartesia should stream TTS and stop immediately on LiveKit interruption/barge-in.
- Call end and SIP failure events should post to `/api/webhooks/calls/:id/outcome`.
- Vobiz API events should post to `/api/webhooks/vobiz/calls`.
