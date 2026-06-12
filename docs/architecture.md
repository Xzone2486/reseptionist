# Architecture

This monorepo separates the receptionist system into independent services:

- `apps/web`: Next.js dashboard for staff operations.
- `apps/api`: Fastify API, Prisma data model, authentication, uploads, booking, campaigns, retry records, and secure tool/webhook endpoints.
- `services/voice-agent`: BullMQ worker that starts outbound calls and runs the conversation. It supports mock mode today and has isolated calling adapters for mock and Vobiz SIP through LiveKit.
- `packages/shared`: Zod schemas, statuses, retry defaults, and tool contracts shared by API, web, and worker.

Outbound flow:

1. Staff imports leads and slots.
2. Staff creates and starts a campaign.
3. API creates `call_attempts` and queues `outbound-calls` jobs in Redis.
4. Voice agent consumes jobs.
5. In mock mode it simulates the conversation and calls backend tools.
6. In Vobiz SIP mode the worker dispatches `LIVEKIT_AGENT_NAME` to a room, then creates a LiveKit SIP participant using `OUTBOUND_TRUNK_ID`; Vobiz handles PSTN through the SIP trunk while the room agent streams STT, LLM, and TTS.

Inbound-ready design:

- Telephony startup is behind `CallingProvider`, so inbound can later add an inbound room entrypoint and route incoming metadata to the same agent state machine.
- Calling is behind `CallingProvider`, so the app can switch between `mock` and `vobiz_sip` without changing campaign or booking code.
- Scheduling is behind provider classes. `FileSchedulingProvider` is live; `GoogleCalendarSchedulingProvider` is stubbed for OAuth/free-busy/event creation.
- Conversation tools call the API over stable tool endpoints, so inbound and outbound can share booking, retry, and status behavior.
