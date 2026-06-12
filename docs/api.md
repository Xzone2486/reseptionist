# API

Base path: `/api`

Auth:

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Scheduling:

- `POST /slots/upload`
- `GET /slots`
- `GET /appointments`
- `POST /appointments`
- `PUT /appointments/:id`
- `POST /appointments/:id/cancel`

Leads and campaigns:

- `POST /leads/import`
- `POST /leads`
- `GET /leads`
- `POST /campaigns`
- `GET /campaigns`
- `POST /campaigns/:id/start`
- `POST /campaigns/:id/stop`

Calls:

- `GET /call-attempts`
- `GET /call-attempts/:id/transcript`
- `POST /webhooks/calls/:id/outcome`
- `POST /webhooks/calls/:id/provider`
- `POST /webhooks/calls/:id/transcript`

Voice tools:

- `POST /tools/check_available_slots`
- `POST /tools/book_appointment`
- `POST /tools/send_confirmation_email`
- `POST /tools/mark_lead_status`
- `POST /tools/schedule_retry`
- `POST /tools/end_call`
- `POST /tools/transfer_to_human`

Voice-agent webhook and tool endpoints require `Authorization: Bearer VOICE_AGENT_SERVICE_TOKEN`.
