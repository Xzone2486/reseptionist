import { Queue } from "bullmq";
import { config } from "../config.js";

export const outboundCallQueue = new Queue("outbound-calls", {
  connection: { url: config.REDIS_URL }
});

export async function enqueueOutboundCall(data: { leadId: string; campaignId?: string; attemptId: string; phone?: string; email?: string }, delay = 0) {
  await outboundCallQueue.add("place-call", data, {
    delay,
    attempts: 1,
    removeOnComplete: 100,
    removeOnFail: 100
  });
}
