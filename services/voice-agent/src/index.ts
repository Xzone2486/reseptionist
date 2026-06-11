import { Worker } from "bullmq";
import pino from "pino";
import { config } from "./config.js";
import { createCallingProvider } from "./providers/calling-provider.js";
import { runMockSession } from "./agent/mock-session.js";
import { toolsClient } from "./agent/tools-client.js";

const log = pino({ name: "voice-agent" });
const provider = createCallingProvider();

new Worker(
  "outbound-calls",
  async (job) => {
    const { leadId, campaignId, attemptId, phone, email } = job.data as { leadId: string; campaignId?: string; attemptId: string; phone?: string; email?: string };
    log.info({ leadId, campaignId, attemptId }, "starting outbound call job");
    const providerCall = await provider.startOutboundCall({ leadId, campaignId, attemptId, phone, email });
    await toolsClient.saveProviderCall(attemptId, providerCall);

    if (config.MOCK_CALL_MODE || config.CALLING_PROVIDER === "mock") {
      await runMockSession({ leadId, attemptId });
      return { mock: true };
    }

    // Real mode: LiveKit dispatch starts the room and this service should also run the room agent.
    // TODO: join the room, stream Deepgram STT, call Groq with tool calls, stream Cartesia TTS, and post outcomes.
    return { mock: false, callingProvider: config.CALLING_PROVIDER };
  },
  { connection: { url: config.REDIS_URL } }
);

log.info({ callingProvider: config.CALLING_PROVIDER, mockCallMode: config.MOCK_CALL_MODE }, "voice agent worker ready");
