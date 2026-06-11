import crypto from "node:crypto";

export function normalizeVobizStatus(input: string | undefined) {
  const status = String(input || "").toLowerCase().replace(/[-\s]/g, "_");
  if (["queued", "created", "initiated"].includes(status)) return "queued";
  if (["started", "ringing", "dialing", "in_progress"].includes(status)) return "dialing";
  if (["answered", "connected"].includes(status)) return "answered";
  if (["completed", "ended"].includes(status)) return "completed";
  if (["no_answer", "noanswer", "not_answered"].includes(status)) return "no_answer";
  if (["failed", "rejected", "cancelled", "canceled"].includes(status)) return "failed";
  return "failed";
}

export function stableWebhookEventId(payload: any) {
  return String(
    payload.event_id ||
      payload.eventId ||
      payload.webhook_id ||
      payload.webhookId ||
      payload.request_id ||
      payload.requestId ||
      crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex")
  );
}

export function verifyVobizWebhookSignature(headers: Record<string, unknown>, payload: unknown, configuredSecret?: string) {
  const secret = process.env.VOBIZ_WEBHOOK_SECRET || configuredSecret;
  if (!secret) return true;
  const signature = String(headers["x-vobiz-signature"] || headers["x-webhook-signature"] || "");
  const sharedSecret = String(headers["x-webhook-secret"] || "");
  if (
    sharedSecret.length === secret.length &&
    crypto.timingSafeEqual(Buffer.from(sharedSecret), Buffer.from(secret))
  ) {
    return true;
  }
  if (!signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(JSON.stringify(payload)).digest("hex");
  const normalized = signature.replace(/^sha256=/, "");
  return normalized.length === expected.length && crypto.timingSafeEqual(Buffer.from(normalized), Buffer.from(expected));
}
