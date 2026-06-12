import { Queue } from "bullmq";
import { config } from "../config.js";

export const outboundCallQueue = new Queue("outbound-calls", {
  connection: { url: config.REDIS_URL }
});

export async function enqueueOutboundCall(data: { leadId: string; campaignId?: string; attemptId?: string; callAttemptId?: string; phone?: string; email?: string }, delay = 0) {
  const attemptId = data.attemptId || data.callAttemptId;
  await outboundCallQueue.add("place-call", { ...data, attemptId, callAttemptId: data.callAttemptId || attemptId }, {
    delay,
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 100
  });
}
