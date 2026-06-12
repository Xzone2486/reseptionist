# Environment

Required for local mock mode:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `API_PORT`
- `WEB_ORIGIN`
- `NEXT_PUBLIC_API_URL`
- `MOCK_MODE=true`
- `CALLING_PROVIDER=mock`
- `MOCK_CALL_MODE=true`
- `VOICE_AGENT_SERVICE_TOKEN`
- `CLINIC_NAME`
- `CLINIC_ADDRESS`

Use these local database values:

```env
DATABASE_URL="postgresql://receptionist:receptionist123@localhost:5432/receptionist?schema=public"
REDIS_URL="redis://localhost:6379"
```

If Postgres was previously started with different credentials, run `docker compose down -v` before recreating it. Docker keeps old users and passwords inside the named volume.

Vobiz calling variables:

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

Allowed `CALLING_PROVIDER` values:

- `mock`
- `vobiz_sip`

For Railway testing use `CALLING_PROVIDER=mock` and `MOCK_CALL_MODE=true`.

Do not commit `.env` files. Use `.env.example` as the template.

Optional Gmail file credentials:

- `GMAIL_CREDENTIALS_FILE`
- `GMAIL_TOKEN_FILE`

Use absolute paths to local secret files. Do not copy Gmail JSON contents into the repository.
