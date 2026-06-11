import { describe, expect, it } from "vitest";
import { MockCallingProvider, VobizSipCallingProvider } from "../src/providers/calling-provider.js";

describe("calling providers", () => {
  it("starts a mock call without external credentials", async () => {
    const provider = new MockCallingProvider();
    const result = await provider.startOutboundCall({ leadId: "lead-1", attemptId: "attempt-1" });
    expect(result.callingProvider).toBe("mock");
    expect(result.providerCallId).toContain("mock-");
  });

  it("does not allow Vobiz SIP mode without LiveKit and Vobiz trunk config", async () => {
    const provider = new VobizSipCallingProvider();
    await expect(provider.startOutboundCall({ leadId: "lead-1", attemptId: "attempt-1" })).rejects.toThrow("Vobiz SIP mode requires");
  });
});
