import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { normalizeVobizStatus, verifyVobizWebhookSignature } from "../src/modules/calls/lifecycle.js";

describe("call lifecycle helpers", () => {
  it("normalizes failed and no-answer Vobiz statuses", () => {
    expect(normalizeVobizStatus("not-answered")).toBe("no_answer");
    expect(normalizeVobizStatus("rejected")).toBe("failed");
    expect(normalizeVobizStatus("answered")).toBe("answered");
    expect(normalizeVobizStatus("ringing")).toBe("dialing");
  });

  it("verifies HMAC webhook signatures when a secret is configured", () => {
    process.env.VOBIZ_WEBHOOK_SECRET = "test-secret";
    const payload = { event_id: "evt-1", status: "completed" };
    const signature = crypto.createHmac("sha256", "test-secret").update(JSON.stringify(payload)).digest("hex");

    expect(verifyVobizWebhookSignature({ "x-vobiz-signature": `sha256=${signature}` }, payload)).toBe(true);
    expect(verifyVobizWebhookSignature({ "x-vobiz-signature": "bad" }, payload)).toBe(false);
  });
});
