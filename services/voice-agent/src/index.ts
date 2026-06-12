import { Worker } from "bullmq";
import pino from "pino";
import { config } from "./config.js";
import { createCallingProvider } from "./providers/calling-provider.js";
import { runMockSession } from "./agent/mock-session.js";
import { toolsClient } from "./agent/tools-client.js";

const log = pino({ name: "voice-agent" });
const provider = createCallingProvider();
const isMockMode = config.MOCK_CALL_MODE || config.CALLING_PROVIDER === "mock";

new Worker(
  "outbound-calls",
  async (job) => {
    const { leadId, campaignId, phone, email } = job.data as { leadId: string; campaignId?: string; phone?: string; email?: string };
    const attemptId = String((job.data as any).attemptId || (job.data as any).callAttemptId || "");
    if (!attemptId) throw new Error("Outbound call job missing attemptId/callAttemptId.");

    log.info({ leadId, campaignId, attemptId, callingProvider: config.CALLING_PROVIDER, mockCallMode: config.MOCK_CALL_MODE }, "starting outbound call job");
    let providerCall;
    try {
      providerCall = await provider.startOutboundCall({ leadId, campaignId, attemptId, phone, email });
      await toolsClient.saveProviderCall(attemptId, providerCall);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown provider error";
      log.error({ err: error, leadId, attemptId, callingProvider: config.CALLING_PROVIDER }, "outbound call provider failed");
      await toolsClient.saveOutcome(attemptId, { status: "failed", reason: message });
      return { failed: true, reason: message };
    }

    if (isMockMode) {
      await runMockSession({ leadId, attemptId });
      return { mock: true };
    }

    // Real mode: LiveKit dispatch starts the room and this service should also run the room agent.
    // TODO: join the room, stream Deepgram STT, call Groq with tool calls, stream Cartesia TTS, and post outcomes.
    return { mock: false, callingProvider: providerCall.callingProvider, providerCallId: providerCall.providerCallId };
  },
  { connection: { url: config.REDIS_URL } }
);

log.info(
  { callingProvider: config.CALLING_PROVIDER, mockCallMode: config.MOCK_CALL_MODE, realVobizMode: !isMockMode },
  isMockMode ? "voice agent worker ready in mock mode" : "voice agent worker ready in Vobiz mode"
);
