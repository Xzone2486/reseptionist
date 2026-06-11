import { config } from "../config.js";
import { AgentDispatchClient, SipClient } from "livekit-server-sdk";

export interface VoiceSessionInput {
  leadId: string;
  attemptId: string;
  campaignId?: string;
  phone?: string;
  email?: string;
}

export interface CallStartResult {
  callingProvider: "mock" | "vobiz_sip" | "vobiz_api";
  roomName?: string;
  providerCallId?: string;
  dispatchId?: string;
  startedAt: string;
}

export interface CallingProvider {
  startOutboundCall(input: VoiceSessionInput): Promise<CallStartResult>;
}

export class MockCallingProvider implements CallingProvider {
  async startOutboundCall(input: VoiceSessionInput) {
    return {
      callingProvider: "mock" as const,
      roomName: `mock-doctor-${input.attemptId}`,
      providerCallId: `mock-${Date.now()}`,
      startedAt: new Date().toISOString()
    };
  }
}

export class VobizSipCallingProvider implements CallingProvider {
  async startOutboundCall(input: VoiceSessionInput) {
    if (!config.LIVEKIT_URL || !config.LIVEKIT_API_KEY || !config.LIVEKIT_API_SECRET || !config.OUTBOUND_TRUNK_ID) {
      throw new Error("Vobiz SIP mode requires LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and OUTBOUND_TRUNK_ID.");
    }
    if (!input.phone) {
      throw new Error("Vobiz SIP mode requires a lead phone number.");
    }

    const phone = normalizePhone(input.phone);
    const roomName = `doctor-${phone.replace("+", "")}-${randomSuffix()}`;
    const participantIdentity = `sip_${phone}`;
    const metadata = {
      phone_number: phone,
      email: input.email || "",
      lead_id: input.leadId,
      campaign_id: input.campaignId,
      call_attempt_id: input.attemptId
    };

    const dispatchClient = liveKitDispatchClient();
    const sipClient = liveKitSipClient();
    const dispatch = await dispatchClient.createDispatch(roomName, config.LIVEKIT_AGENT_NAME, {
      metadata: JSON.stringify(metadata)
    });
    const participant = await sipClient.createSipParticipant(config.OUTBOUND_TRUNK_ID, phone, roomName, {
      participantIdentity,
      participantMetadata: JSON.stringify(metadata),
      waitUntilAnswered: true,
      timeout: 60
    });

    return {
      callingProvider: "vobiz_sip" as const,
      roomName,
      providerCallId: participant.sipCallId || participant.participantId || participantIdentity,
      dispatchId: dispatch.id,
      startedAt: new Date().toISOString()
    };
  }
}

export class VobizApiCallingProvider implements CallingProvider {
  async startOutboundCall(input: VoiceSessionInput) {
    if (!config.VOBIZ_AUTH_ID || !config.VOBIZ_AUTH_TOKEN || !config.VOBIZ_CALLER_ID) {
      throw new Error("Vobiz API mode requires VOBIZ_AUTH_ID, VOBIZ_AUTH_TOKEN, and VOBIZ_CALLER_ID.");
    }
    if (!input.phone) {
      throw new Error("Vobiz API mode requires a lead phone number.");
    }

    // Vobiz public API details vary by account/product. Keep the call shape isolated here.
    // Replace VOBIZ_API_BASE_URL or this path if Vobiz supplies a different endpoint.
    const baseUrl = process.env.VOBIZ_API_BASE_URL || "https://api.vobiz.com";
    const response = await fetch(`${baseUrl}/v1/calls`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Basic ${Buffer.from(`${config.VOBIZ_AUTH_ID}:${config.VOBIZ_AUTH_TOKEN}`).toString("base64")}`
      },
      body: JSON.stringify({
        from: config.VOBIZ_CALLER_ID,
        to: input.phone,
        webhook_url: `${config.API_BASE_URL}/api/webhooks/vobiz/calls`,
        machine_detection: true,
        metadata: {
          leadId: input.leadId,
          attemptId: input.attemptId,
          campaignId: input.campaignId
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Vobiz outbound call failed: ${response.status} ${await response.text()}`);
    }

    const data = await response.json() as Record<string, any>;
    return {
      callingProvider: "vobiz_api" as const,
      providerCallId: String(data.call_id || data.callId || data.id),
      startedAt: new Date().toISOString()
    };
  }
}

export function createCallingProvider(): CallingProvider {
  if (config.MOCK_CALL_MODE || config.CALLING_PROVIDER === "mock") return new MockCallingProvider();
  if (config.CALLING_PROVIDER === "vobiz_sip") return new VobizSipCallingProvider();
  return new VobizApiCallingProvider();
}

export async function createVobizOutboundTrunk() {
  if (!config.LIVEKIT_URL || !config.LIVEKIT_API_KEY || !config.LIVEKIT_API_SECRET) {
    throw new Error("LiveKit credentials are required to create the Vobiz outbound trunk.");
  }
  if (!config.VOBIZ_SIP_DOMAIN || !config.VOBIZ_USERNAME || !config.VOBIZ_PASSWORD || !config.VOBIZ_OUTBOUND_NUMBER) {
    throw new Error("VOBIZ_SIP_DOMAIN, VOBIZ_USERNAME, VOBIZ_PASSWORD, and VOBIZ_OUTBOUND_NUMBER are required.");
  }

  const sipClient = liveKitSipClient();
  const trunk = await sipClient.createSipOutboundTrunk(
    "DoctorReceptionist-Vobiz-Trunk",
    config.VOBIZ_SIP_DOMAIN,
    [config.VOBIZ_OUTBOUND_NUMBER],
    {
      transport: 0,
      authUsername: config.VOBIZ_USERNAME,
      authPassword: config.VOBIZ_PASSWORD,
      metadata: JSON.stringify({ provider: "vobiz", app: "doctor-receptionist" })
    }
  );
  return trunk.sipTrunkId;
}

function liveKitDispatchClient() {
  return new AgentDispatchClient(config.LIVEKIT_URL!, config.LIVEKIT_API_KEY, config.LIVEKIT_API_SECRET);
}

function liveKitSipClient() {
  return new SipClient(config.LIVEKIT_URL!, config.LIVEKIT_API_KEY, config.LIVEKIT_API_SECRET);
}

function normalizePhone(phone: string) {
  const cleaned = phone.trim().replace(/[^\d+]/g, "");
  if (!cleaned.startsWith("+")) {
    throw new Error("Phone number must include country code and start with '+'.");
  }
  return cleaned;
}

function randomSuffix() {
  return Math.floor(1000 + Math.random() * 9000);
}
