# Railway Deployment

Use one Railway project with these services:

1. PostgreSQL plugin
2. Redis plugin
3. API service from this repo
4. Web service from this repo
5. Voice agent service from this repo

API service:

- Root directory: repository root
- Config file: `railway.api.json`
- Start command: `npm run prisma:deploy --workspace @receptionist/api && npm run seed --workspace @receptionist/api && npm run start --workspace @receptionist/api`
- Health check: `/health`
- Variables: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `API_PORT=4000`, `WEB_ORIGIN`, `CALLING_PROVIDER=mock`, `MOCK_CALL_MODE=true`, `VOICE_AGENT_SERVICE_TOKEN`

Web service:

- Config file: `railway.web.json`
- Start command: `npm run start --workspace @receptionist/web`
- Variables: `NEXT_PUBLIC_API_URL=https://your-api-service.up.railway.app`

Voice agent service:

- Config file: `railway.voice-agent.json`
- Start command: `npm run start --workspace @receptionist/voice-agent`
- Variables: `API_BASE_URL=https://your-api-service.up.railway.app`, `REDIS_URL`, `CALLING_PROVIDER=mock`, `MOCK_CALL_MODE=true`, `VOICE_AGENT_SERVICE_TOKEN`

Trial-friendly mock testing:

1. Deploy PostgreSQL and Redis.
2. Deploy API with `CALLING_PROVIDER=mock` and `MOCK_CALL_MODE=true`.
3. Deploy web and set `NEXT_PUBLIC_API_URL`.
4. Deploy voice-agent with `CALLING_PROVIDER=mock` and `MOCK_CALL_MODE=true`.
5. Login with the seeded admin account.
6. Upload `samples/appointment_slots.csv` and `samples/leads.csv`.
7. Create a campaign, start it, and verify call attempts, transcripts, extracted data, and bookings.

When ready for real outbound calls, choose `CALLING_PROVIDER=vobiz_sip`, set `MOCK_CALL_MODE=false`, add the required Vobiz SIP, LiveKit, Deepgram, Groq, and Cartesia variables, then redeploy the API and voice-agent services.

For `vobiz_sip`, first create the LiveKit outbound SIP trunk from Vobiz credentials:

```bash
npm run setup:vobiz-trunk --workspace @receptionist/voice-agent
```

Set the printed `OUTBOUND_TRUNK_ID` in Railway for the voice-agent service.
