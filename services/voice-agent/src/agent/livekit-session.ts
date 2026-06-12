import {
  AudioFrame,
  AudioSource,
  AudioStream,
  dispose,
  LocalAudioTrack,
  RemoteAudioTrack,
  Room,
  RoomEvent,
  TrackPublishOptions,
  TrackSource
} from "@livekit/rtc-node";
import { AccessToken } from "livekit-server-sdk";
import pino from "pino";
import WebSocket from "ws";
import { config } from "../config.js";
import { receptionistSystemPrompt } from "./system-prompt.js";
import { toolsClient } from "./tools-client.js";

const log = pino({ name: "livekit-voice-session" });
const GREETING = "Hi, this is the appointment assistant from the clinic. You recently visited our website. Is this a good time to talk?";
const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const FRAME_SAMPLES = 320;
const DEFAULT_CARTESIA_VOICE_ID = "6ccbfb76-1fc6-48f7-b71d-91ac6298247b";

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
};

type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

type LiveKitVoiceSessionInput = {
  roomName: string;
  attemptId: string;
  leadId: string;
  campaignId?: string;
  phone?: string;
  email?: string;
};

type TranscriptTurn = {
  speaker: "assistant" | "user";
  text: string;
};

export async function runLiveKitVoiceSession(input: LiveKitVoiceSessionInput) {
  const room = new Room();
  const identity = `ai-receptionist-${input.attemptId}`;
  const turns: TranscriptTurn[] = [];
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${receptionistSystemPrompt}

Lead context:
- leadId: ${input.leadId}
- campaignId: ${input.campaignId || ""}
- phone: ${input.phone || ""}
- email: ${input.email || ""}

Use tool calls for booking actions. When a terminal outcome is reached, say a short final line.`
    }
  ];

  let source: AudioSource | undefined;
  let track: LocalAudioTrack | undefined;
  let finished = false;
  let lastAppointmentId: string | undefined;
  let lastHeldSlot: any;
  let extractedData: Record<string, unknown> = {
    phone: input.phone,
    email: input.email,
    confirmed: false
  };

  async function finish(status: string, reason: string) {
    if (finished) return;
    finished = true;
    log.info({ attemptId: input.attemptId, status, reason }, "final call outcome");
    await toolsClient.saveTranscript(input.attemptId, {
      turns,
      summary: reason,
      extractedData: { ...extractedData, raw: extractedData }
    });
    await toolsClient.saveOutcome(input.attemptId, { status, reason });
    await room.disconnect();
  }

  try {
    const token = await createLiveKitToken(input.roomName, identity, input);
    await room.connect(config.LIVEKIT_URL!, token, { autoSubscribe: true, dynacast: true });
    log.info({ roomName: input.roomName, identity }, "AI joined LiveKit room");

    source = new AudioSource(SAMPLE_RATE, CHANNELS, 1000);
    track = LocalAudioTrack.createAudioTrack("ai-receptionist-audio", source);
    const options = new TrackPublishOptions();
    options.source = TrackSource.SOURCE_MICROPHONE;
    await room.localParticipant?.publishTrack(track, options);
    log.info({ roomName: input.roomName }, "AI microphone track published");

    const deepgram = createDeepgramSocket(async (transcript) => {
      if (finished) return;
      log.info({ transcript }, "STT transcript");
      turns.push({ speaker: "user", text: transcript });
      messages.push({ role: "user", content: transcript });
      await respondWithGroq(messages, {
        input,
        turns,
        source: source!,
        finish,
        setAppointmentId: (id) => {
          lastAppointmentId = id;
        },
        getAppointmentId: () => lastAppointmentId,
        setHeldSlot: (slot) => {
          lastHeldSlot = slot;
        },
        getHeldSlot: () => lastHeldSlot,
        mergeExtractedData: (data) => {
          extractedData = { ...extractedData, ...data };
        }
      });
    });

    room.on(RoomEvent.TrackSubscribed, (remoteTrack, _publication, participant) => {
      if (!(remoteTrack instanceof RemoteAudioTrack)) return;
      log.info({ participantIdentity: participant.identity, trackSid: remoteTrack.sid }, "caller audio track subscribed");
      pipeCallerAudioToDeepgram(remoteTrack, deepgram).catch((error) => {
        log.error({ err: error, attemptId: input.attemptId }, "caller audio stream failed");
      });
    });

    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      log.info({ participantIdentity: participant.identity }, "participant disconnected");
      if (!finished && participant.identity.startsWith("sip_")) {
        finish("completed", "caller_disconnected").catch((error) => log.error({ err: error }, "failed to save disconnect outcome"));
      }
    });

    await speak(source, GREETING);
    turns.push({ speaker: "assistant", text: GREETING });
    messages.push({ role: "assistant", content: GREETING });
    log.info({ text: GREETING }, "AI response text");

    await waitUntilFinishedOrTimeout(() => finished, 12 * 60 * 1000);
    if (!finished) {
      await finish("follow_up_needed", "live_session_timeout");
    }
    deepgram.close();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "live_session_failed";
    log.error({ err: error, attemptId: input.attemptId }, "live voice session crashed");
    if (!finished) {
      await toolsClient.saveOutcome(input.attemptId, { status: "failed", reason });
    }
    throw error;
  } finally {
    await track?.close().catch(() => undefined);
    await source?.close().catch(() => undefined);
    await room.disconnect().catch(() => undefined);
    await dispose().catch(() => undefined);
  }
}

async function createLiveKitToken(roomName: string, identity: string, input: LiveKitVoiceSessionInput) {
  const token = new AccessToken(config.LIVEKIT_API_KEY, config.LIVEKIT_API_SECRET, {
    identity,
    name: "AI Receptionist",
    metadata: JSON.stringify({ attemptId: input.attemptId, leadId: input.leadId }),
    ttl: "2h"
  });
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });
  return token.toJwt();
}

function createDeepgramSocket(onTranscript: (transcript: string) => Promise<void>) {
  const params = new URLSearchParams({
    model: "nova-3",
    encoding: "linear16",
    sample_rate: String(SAMPLE_RATE),
    channels: String(CHANNELS),
    interim_results: "false",
    punctuate: "true",
    endpointing: "500",
    vad_events: "true"
  });
  const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?${params.toString()}`, {
    headers: { Authorization: `Token ${config.DEEPGRAM_API_KEY}` }
  });

  socket.on("message", (data) => {
    try {
      const event = JSON.parse(data.toString());
      const transcript = event.channel?.alternatives?.[0]?.transcript;
      if (event.is_final && transcript?.trim()) {
        void onTranscript(transcript.trim());
      }
    } catch (error) {
      log.warn({ err: error }, "failed to parse Deepgram event");
    }
  });
  socket.on("error", (error) => log.error({ err: error }, "Deepgram websocket error"));
  socket.on("open", () => log.info("Deepgram websocket opened"));
  socket.on("close", () => log.info("Deepgram websocket closed"));
  return socket;
}

async function pipeCallerAudioToDeepgram(track: RemoteAudioTrack, socket: WebSocket) {
  const stream = new AudioStream(track, { sampleRate: SAMPLE_RATE, numChannels: CHANNELS, frameSizeMs: 20 });
  const reader = stream.getReader();
  try {
    while (socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
      const { value, done } = await reader.read();
      if (done) break;
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(Buffer.from(value.data.buffer, value.data.byteOffset, value.data.byteLength));
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function respondWithGroq(
  messages: ChatMessage[],
  context: {
    input: LiveKitVoiceSessionInput;
    turns: TranscriptTurn[];
    source: AudioSource;
    finish: (status: string, reason: string) => Promise<void>;
    setAppointmentId: (id: string) => void;
    getAppointmentId: () => string | undefined;
    setHeldSlot: (slot: any) => void;
    getHeldSlot: () => any;
    mergeExtractedData: (data: Record<string, unknown>) => void;
  }
) {
  for (let i = 0; i < 4; i += 1) {
    const response = await groqChat(messages);
    const message = response.choices?.[0]?.message;
    if (!message) return;

    const toolCalls = message.tool_calls as ToolCall[] | undefined;
    if (toolCalls?.length) {
      messages.push({
        role: "assistant",
        content: message.content || null,
        tool_calls: toolCalls
      });
      for (const toolCall of toolCalls) {
        const result = await executeToolCall(toolCall, context);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        });
      }
      continue;
    }

    const text = String(message.content || "").trim();
    if (!text) return;
    log.info({ text }, "AI response text");
    context.turns.push({ speaker: "assistant", text });
    messages.push({ role: "assistant", content: text });
    await speak(context.source, text);

    const terminal = classifyTerminalText(text);
    if (terminal) await context.finish(terminal.status, terminal.reason);
    return;
  }
}

async function groqChat(messages: ChatMessage[]) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.GROQ_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: config.GROQ_MODEL,
      messages,
      tools: toolDefinitions,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 260
    })
  });
  if (!response.ok) {
    throw new Error(`Groq chat failed: ${response.status} ${await response.text()}`);
  }
  return response.json() as Promise<any>;
}

async function executeToolCall(
  toolCall: ToolCall,
  context: {
    input: LiveKitVoiceSessionInput;
    setAppointmentId: (id: string) => void;
    getAppointmentId: () => string | undefined;
    setHeldSlot: (slot: any) => void;
    getHeldSlot: () => any;
    mergeExtractedData: (data: Record<string, unknown>) => void;
  }
) {
  const args = parseToolArgs(toolCall.function.arguments);
  log.info({ tool: toolCall.function.name, args }, "executing AI tool call");
  switch (toolCall.function.name) {
    case "check_available_slots":
      return toolsClient.checkAvailableSlots(args);
    case "hold_slot": {
      const result = await toolsClient.holdSlot({
        lead_id: context.input.leadId,
        slot_id: String(args.slot_id || args.slotId),
        timeout_seconds: args.timeout_seconds
      });
      context.setHeldSlot(result);
      return result;
    }
    case "book_appointment": {
      const slot = context.getHeldSlot();
      const result = await toolsClient.bookAppointment({
        lead_id: context.input.leadId,
        slot_id: String(args.slot_id || slot?.externalId || slot?.id),
        patient_name: String(args.patient_name || args.patientName || "Patient"),
        phone: String(args.phone || context.input.phone || ""),
        email: args.email || context.input.email,
        reason: String(args.reason || "Appointment")
      });
      context.setAppointmentId(result.id);
      context.mergeExtractedData({
        patientName: args.patient_name || args.patientName,
        phone: args.phone || context.input.phone,
        email: args.email || context.input.email,
        department: args.department || slot?.department,
        reason: args.reason,
        confirmed: true
      });
      return result;
    }
    case "send_confirmation_email":
      return toolsClient.sendConfirmationEmail({
        appointment_id: String(args.appointment_id || context.getAppointmentId()),
        email: args.email || context.input.email,
        consent_confirmed: Boolean(args.consent_confirmed ?? args.consentConfirmed)
      });
    case "saveOutcome":
      return toolsClient.saveOutcome(context.input.attemptId, {
        status: args.status,
        reason: args.reason || args.status
      });
    case "transfer_to_human":
      return toolsClient.transferToHuman({
        lead_id: context.input.leadId,
        reason: String(args.reason || "live_agent_handoff")
      });
    default:
      return { error: "unknown_tool", tool: toolCall.function.name };
  }
}

function parseToolArgs(raw: string) {
  try {
    return JSON.parse(raw || "{}");
  } catch {
    return {};
  }
}

async function speak(source: AudioSource, text: string) {
  const pcm = await synthesizeCartesia(text);
  await publishPcm(source, pcm);
  log.info({ bytes: pcm.byteLength }, "TTS audio published");
}

async function synthesizeCartesia(text: string) {
  const response = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.CARTESIA_API_KEY}`,
      "x-api-key": config.CARTESIA_API_KEY!,
      "cartesia-version": "2026-03-01",
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model_id: "sonic-2",
      transcript: text,
      voice: { mode: "id", id: config.CARTESIA_VOICE_ID || DEFAULT_CARTESIA_VOICE_ID },
      output_format: {
        container: "raw",
        encoding: "pcm_s16le",
        sample_rate: SAMPLE_RATE
      },
      language: "en"
    })
  });
  if (!response.ok) {
    throw new Error(`Cartesia TTS failed: ${response.status} ${await response.text()}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  return new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
}

async function publishPcm(source: AudioSource, pcm: Int16Array) {
  for (let offset = 0; offset < pcm.length; offset += FRAME_SAMPLES) {
    const chunk = pcm.subarray(offset, Math.min(offset + FRAME_SAMPLES, pcm.length));
    const frameData = new Int16Array(chunk.length);
    frameData.set(chunk);
    await source.captureFrame(new AudioFrame(frameData, SAMPLE_RATE, CHANNELS, chunk.length));
  }
  await source.waitForPlayout();
}

function classifyTerminalText(text: string) {
  const lower = text.toLowerCase();
  if (/(appointment.*confirm|booked|confirm hai|confirmed)/.test(lower)) {
    return { status: "appointment_booked", reason: "appointment_confirmed" };
  }
  if (/(not interested|no problem|thank you for your time)/.test(lower)) {
    return { status: "declined", reason: "caller_declined" };
  }
  if (/(wrong number|will not call)/.test(lower)) {
    return { status: "wrong_number", reason: "wrong_number" };
  }
  if (/(do not call|not call again|remove)/.test(lower)) {
    return { status: "do_not_call", reason: "do_not_call" };
  }
  if (/(staff member|clinic staff|follow up|human)/.test(lower)) {
    return { status: "follow_up_needed", reason: "transfer_to_human" };
  }
  return null;
}

async function waitUntilFinishedOrTimeout(isFinished: () => boolean, timeoutMs: number) {
  const started = Date.now();
  while (!isFinished() && Date.now() - started < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "check_available_slots",
      description: "Check appointment slots before offering anything to the caller.",
      parameters: {
        type: "object",
        properties: {
          date: { type: "string" },
          department: { type: "string" },
          preferred_time: { type: "string" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "hold_slot",
      description: "Hold one exact slot returned by check_available_slots before offering it.",
      parameters: {
        type: "object",
        properties: {
          slot_id: { type: "string" },
          timeout_seconds: { type: "number" }
        },
        required: ["slot_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "book_appointment",
      description: "Book a confirmed appointment after the caller confirms the slot.",
      parameters: {
        type: "object",
        properties: {
          slot_id: { type: "string" },
          patient_name: { type: "string" },
          phone: { type: "string" },
          email: { type: "string" },
          department: { type: "string" },
          reason: { type: "string" }
        },
        required: ["patient_name", "reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_confirmation_email",
      description: "Send a confirmation email only after explicit consent.",
      parameters: {
        type: "object",
        properties: {
          appointment_id: { type: "string" },
          email: { type: "string" },
          consent_confirmed: { type: "boolean" }
        },
        required: ["consent_confirmed"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "transfer_to_human",
      description: "Transfer or mark for staff follow-up.",
      parameters: {
        type: "object",
        properties: {
          reason: { type: "string" }
        },
        required: ["reason"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "saveOutcome",
      description: "Save a terminal call outcome.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["appointment_booked", "declined", "retry_scheduled", "do_not_call", "wrong_number", "follow_up_needed", "failed", "completed"]
          },
          reason: { type: "string" }
        },
        required: ["status"]
      }
    }
  }
];
