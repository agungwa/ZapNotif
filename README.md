# ZapNotif ⚡

> WhatsApp notifications & OTP, minus the official API.

ZapNotif is an unofficial WhatsApp notification service. It exposes a clean REST API for sending template-based messages — including OTP verification — through a paired WhatsApp session ([Baileys](https://github.com/WhiskeySockets/Baileys)), no official Cloud API required.

## Features

- 📨 Send template-based WhatsApp messages via REST
- 🔐 Seeded OTP verification template (AUTHENTICATION category)
- 📄 Template store with `{{1}}`, `{{2}}` ... placeholder rendering
- 🔄 Auto-reconnect with persistent multi-file session (scan QR once)
- ✅ Request/response shapes compatible with the standard Notification Service API contract

## Stack

| | |
|---|---|
| Runtime | [Bun](https://bun.sh) |
| Language | TypeScript (strict) |
| HTTP | [Hono](https://hono.dev) |
| Validation | zod |
| WhatsApp | @whiskeysockets/baileys (unofficial, multi-device) |

## Getting started

```bash
bun install
bun start
```

A QR code prints in the terminal on first run — scan it with WhatsApp (*Linked devices → Link a device*). The session persists in `./session/`, so you only scan once.

> Port defaults to `3000`. Change it with `PORT=3100 bun start`.

## API

### Get template detail

```http
GET /v1/whatsapp/templates/:id
```

```json
{
  "id": "9f1c2d34-otp1-4e5f-8a9b-1c2d3e4f5a6b",
  "name": "otp_verification",
  "language": "id",
  "body": "Hai {{1}}! ...",
  "status": "APPROVED",
  "category": "AUTHENTICATION",
  "createdAt": "2026-09-11T00:00:00.000Z"
}
```

### Send template message

```http
POST /v1/whatsapp/messages/template
```

```bash
curl -X POST http://localhost:3000/v1/whatsapp/messages/template \
  -H "Content-Type: application/json" \
  -d '{
    "recipientPhoneNumber": "08123456789",
    "recipientName": "John Doe",
    "templateId": "9f1c2d34-otp1-4e5f-8a9b-1c2d3e4f5a6b",
    "languageCode": "id",
    "bodyParameters": [
      { "key": "1", "value": "John Doe", "valueText": "John Doe" },
      { "key": "2", "value": "774521", "valueText": "774521" }
    ]
  }'
```

Response:

```json
{ "providerMessageId": "3EB0...", "providerStatus": "success" }
```

Errors follow the shared contract: `400` for validation/template errors, `503` when the WhatsApp session is not connected — always shaped as `{ "message": "...", "requestId": "..." }`.

### Helpers

| Endpoint | Purpose |
|---|---|
| `GET /v1/health` | Service + WhatsApp connection status |
| `GET /v1/whatsapp/session/status` | `connecting` / `connected` / `disconnected` |
| `GET /v1/whatsapp/session/qr` | Latest pairing QR (if awaiting scan) |

### Templates

Stored in [`src/store/templates.json`](src/store/templates.json). Seeded templates:

| Template | Category | Variables |
|---|---|---|
| `otp_verification` | AUTHENTICATION | `1` = name, `2` = OTP code |
| `order_notification` | MARKETING | `1` = name, `2` = order number |

Phone numbers in Indonesian format (`0812...`) are normalized to WhatsApp JIDs automatically.

## Project structure

```
src/
├── index.ts                  # Entrypoint: Bun.serve + DI wiring
├── types.ts                  # DTOs mirroring the API contract
├── routes/
│   └── whatsapp.routes.ts    # /v1/whatsapp endpoints
├── services/
│   └── whatsapp-client.ts    # Baileys wrapper (connect, QR, send)
└── store/
    ├── template-store.ts     # Typed template store + renderer
    └── templates.json        # Template data (incl. OTP)
```

## Deploy notes

ZapNotif needs a long-running process with persistent storage (WebSocket + session files), so avoid serverless. Free-friendly options:

- **Own machine + Cloudflare Tunnel** — session persists, zero cost
- **Koyeb / Hugging Face Spaces (Docker)** — free 24/7, but ephemeral disk means re-scanning the QR after each deploy

## Disclaimer

ZapNotif uses an **unofficial** WhatsApp protocol. WhatsApp may ban numbers that send bulk or automated traffic. Use a spare number and keep volume reasonable. Not affiliated with Meta.
