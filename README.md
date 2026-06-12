# Doctor AI Voice Receptionist

Production-oriented outbound AI receptionist for doctor appointment booking. It runs locally and on Railway in mock mode before paid telephony credentials are added.

## Stack

- Next.js, TypeScript, Tailwind CSS dashboard
- Fastify, Prisma, PostgreSQL API
- Redis and BullMQ background jobs
- Separate voice-agent worker
- Vobiz SIP through LiveKit
- Deepgram, Groq, and Cartesia provider stubs for live mode
- CSV and Excel slot import

## Running Locally

Local development uses the root `.env` as the single source of truth. If `apps/api/.env` exists, keep its database values identical to the root `.env`.

Use these local database values:

```env
DATABASE_URL="postgresql://receptionist:receptionist123@localhost:5432/receptionist?schema=public"
REDIS_URL="redis://localhost:6379"
EMAIL_PROVIDER=mock
MOCK_EMAIL_MODE=true
```

First-time setup:

```bash
cp .env.example .env
npm install
npm run local:db:reset
npm run db:migrate
npm run db:seed
```

Run each service in a separate terminal from the project root:

Terminal 1:

```bash
docker compose up -d postgres redis
```

Terminal 2:

```bash
npm run dev -w @receptionist/api
```

Terminal 3:

```bash
npm run dev -w @receptionist/web
```

Terminal 4:

```bash
npm run dev -w @receptionist/voice-agent
```

Local URLs:

- Web: `http://localhost:3000`
- API: `http://localhost:4000`
- API health: `http://localhost:4000/health`

Seeded login:

- Email: `admin@clinic.local` #receptionist
- Password: `ChangeMe123!`    #receptionist123

If database authentication fails, an old Docker volume may still contain the previous `postgres:postgres` credentials. Remove the volume and recreate the database:

```bash
docker compose down -v
docker compose up -d postgres redis
npm run db:migrate
npm run db:seed
```

The shortcut is:

```bash
npm run local:db:reset
npm run db:migrate
npm run db:seed
```

For local call testing, keep email in mock mode:

```env
EMAIL_PROVIDER=mock
MOCK_EMAIL_MODE=true
```

Mock email mode logs the confirmation email payload and does not call Gmail. Real Gmail delivery requires valid OAuth credentials and a valid refresh token in `GMAIL_CREDENTIALS_FILE` and `GMAIL_TOKEN_FILE`. Gmail `invalid_grant` means the refresh token expired, was revoked, or belongs to a different OAuth client; the appointment stays booked, but the email is reported as not sent.

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
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:reset
npm run local:db:up
npm run local:db:reset
```

## Live Calling

Keep `CALLING_PROVIDER=mock` and `MOCK_CALL_MODE=true` until Vobiz is configured.

Allowed calling providers:

- `mock`
- `vobiz_sip`

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

The provider adapter is isolated in `services/voice-agent/src/providers/calling-provider.ts`; add or adjust SIP-specific details there without changing campaign or booking logic.

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
