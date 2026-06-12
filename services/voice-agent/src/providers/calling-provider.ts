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
  callingProvider: "mock" | "vobiz_sip";
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
    const participant = await sipClient.createSipParticipant(
      config.OUTBOUND_TRUNK_ID,
      phone,
      roomName,
      {
        participantIdentity,
        participantName: "Patient",
        participantMetadata: JSON.stringify({
          lead_id: input.leadId,
          campaign_id: input.campaignId,
          call_attempt_id: input.attemptId
        }),
        waitUntilAnswered: false,
        timeout: 10,
        ringingTimeout: 45,
        playDialtone: true
      }
    );

    return {
      callingProvider: "vobiz_sip" as const,
      roomName,
      providerCallId: participant.sipCallId || participant.participantId || participantIdentity,
      dispatchId: dispatch.id,
      startedAt: new Date().toISOString()
    };
  }
}

export function createCallingProvider(): CallingProvider {
  if (config.MOCK_CALL_MODE || config.CALLING_PROVIDER === "mock") return new MockCallingProvider();
  return new VobizSipCallingProvider();
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
