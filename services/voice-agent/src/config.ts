import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRootEnv = path.resolve(__dirname, "../../../.env");
const localEnv = path.resolve(__dirname, "../.env");

dotenv.config({ path: repoRootEnv });
dotenv.config({ path: localEnv });

if (process.env.MOCK_CALL_MODE === undefined && process.env.MOCK_CALLS !== undefined) {
  process.env.MOCK_CALL_MODE = process.env.MOCK_CALLS;
}

const envBoolean = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined) return false;

    return ["true", "1", "yes", "on"].includes(
      value.trim().toLowerCase()
    );
  });

export const config = z.object({
  REDIS_URL: z.string().default("redis://localhost:6379"),
  API_BASE_URL: z.string().default("http://localhost:4000"),

  MOCK_MODE: envBoolean.default(false),
  CALLING_PROVIDER: z.enum(["mock", "vobiz_sip"]).default("mock"),
  MOCK_CALL_MODE: envBoolean.default(false),

  LIVEKIT_AGENT_NAME: z.string().default("doctor-receptionist-outbound"),
  VOICE_AGENT_SERVICE_TOKEN: z.string().default("dev-voice-agent-token"),

  LIVEKIT_URL: z.string().optional(),
  LIVEKIT_API_KEY: z.string().optional(),
  LIVEKIT_API_SECRET: z.string().optional(),

  VOBIZ_SIP_DOMAIN: z.string().optional(),
  VOBIZ_USERNAME: z.string().optional(),
  VOBIZ_PASSWORD: z.string().optional(),
  VOBIZ_OUTBOUND_NUMBER: z.string().optional(),
  OUTBOUND_TRUNK_ID: z.string().optional(),

  DEEPGRAM_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  CARTESIA_API_KEY: z.string().optional()
}).parse(process.env);