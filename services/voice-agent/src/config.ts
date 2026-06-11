import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: "../../.env" });
dotenv.config();

export const config = z.object({
  REDIS_URL: z.string().default("redis://localhost:6379"),
  API_BASE_URL: z.string().default("http://localhost:4000"),
  MOCK_MODE: z.coerce.boolean().default(true),
  CALLING_PROVIDER: z.enum(["mock", "vobiz_sip", "vobiz_api"]).default("mock"),
  MOCK_CALL_MODE: z.coerce.boolean().default(true),
  LIVEKIT_AGENT_NAME: z.string().default("doctor-receptionist-outbound"),
  VOICE_AGENT_SERVICE_TOKEN: z.string().default("dev-voice-agent-token"),
  LIVEKIT_URL: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),
  VOBIZ_AUTH_ID: z.string().optional(),
  VOBIZ_AUTH_TOKEN: z.string().optional(),
  VOBIZ_CALLER_ID: z.string().optional(),
  VOBIZ_SIP_DOMAIN: z.string().optional(),
  VOBIZ_USERNAME: z.string().optional(),
  VOBIZ_PASSWORD: z.string().optional(),
  VOBIZ_OUTBOUND_NUMBER: z.string().optional(),
  OUTBOUND_TRUNK_ID: z.string().optional(),
  VOBIZ_WEBHOOK_SECRET: z.string().optional(),
  DEEPGRAM_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  CARTESIA_API_KEY: z.string().optional()
}).parse(process.env);
