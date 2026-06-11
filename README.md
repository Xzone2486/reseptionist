# Doctor AI Voice Receptionist

Production-oriented outbound AI receptionist for doctor appointment booking. It runs locally and on Railway in mock mode before paid telephony credentials are added.

## Stack

- Next.js, TypeScript, Tailwind CSS dashboard
- Fastify, Prisma, PostgreSQL API
- Redis and BullMQ background jobs
- Separate voice-agent worker
- Vobiz SIP through LiveKit and Vobiz Voice API provider seams
- Deepgram, Groq, and Cartesia provider stubs for live mode
- CSV and Excel slot import

## Local Setup

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis
npm run db:migrate
npm run db:seed
npm run dev
```

Open:

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/health`

Seeded login:

- Email: `admin@clinic.local` #receptionist
- Password: `ChangeMe123!`    #receptionist123

## Mock Flow

1. Upload `samples/appointment_slots.csv`.
2. Upload `samples/leads.csv`; the optional `email` column is used for confirmation mail consent during the call.
3. Create a campaign.
4. Start the campaign.
5. The voice-agent worker consumes queued jobs, simulates a call, checks slots, books one, saves transcript and extracted data, and updates call status.

## Scripts

```bash
npm run dev
npm run build
npm run test
npm run lint
npm run db:migrate
npm run db:seed
```

## Live Calling

Keep `CALLING_PROVIDER=mock` and `MOCK_CALL_MODE=true` until Vobiz is configured.

Allowed calling providers:

- `mock`
- `vobiz_sip`
- `vobiz_api`

For Vobiz SIP mode, Vobiz handles the PSTN/SIP trunk while LiveKit, Deepgram, Groq, and Cartesia handle realtime AI. Set:

- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_AGENT_NAME`
- `VOBIZ_SIP_DOMAIN`
- `VOBIZ_USERNAME`
- `VOBIZ_PASSWORD`
- `VOBIZ_OUTBOUND_NUMBER`
- `OUTBOUND_TRUNK_ID`
- `DEEPGRAM_API_KEY`
- `GROQ_API_KEY`
- `CARTESIA_API_KEY`
- `CARTESIA_VOICE_ID`

For Vobiz Voice API mode, set:

- `VOBIZ_AUTH_ID`
- `VOBIZ_AUTH_TOKEN`
- `VOBIZ_CALLER_ID`
- `VOBIZ_WEBHOOK_SECRET`

The provider adapter is isolated in `services/voice-agent/src/providers/calling-provider.ts`; add or adjust Vobiz-specific request details there without changing campaign or booking logic.

Create the LiveKit outbound SIP trunk from Vobiz credentials:

```bash
npm run setup:vobiz-trunk --workspace @receptionist/voice-agent
```

Copy the printed `OUTBOUND_TRUNK_ID` into `.env`.

## Docs

- `docs/architecture.md`
- `docs/api.md`
- `docs/environment.md`
- `docs/voice-agent-flow.md`
- `docs/deployment.md`
