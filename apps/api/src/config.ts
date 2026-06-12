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
const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z.string().default("postgresql://receptionist:receptionist123@localhost:5432/receptionist?schema=public"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  JWT_SECRET: z.string().default("dev-secret-change-me"),
  API_PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  CLINIC_NAME: z.string().default("Demo Care Clinic"),
  CLINIC_ADDRESS: z.string().default("Clinic address not configured"),
  MOCK_MODE: z.coerce.boolean().default(true),
  CALLING_PROVIDER: z.enum(["mock", "vobiz_sip"]).default("mock"),
  MOCK_CALL_MODE: z.coerce.boolean().default(true),
  LIVEKIT_AGENT_NAME: z.string().default("doctor-receptionist-outbound"),
  VOBIZ_SIP_DOMAIN: z.string().optional(),
  VOBIZ_USERNAME: z.string().optional(),
  VOBIZ_PASSWORD: z.string().optional(),
  VOBIZ_OUTBOUND_NUMBER: z.string().optional(),
  OUTBOUND_TRUNK_ID: z.string().optional(),
  VOBIZ_WEBHOOK_SECRET: z.string().optional(),
  VOICE_AGENT_SERVICE_TOKEN: z.string().default("dev-voice-agent-token"),
  GMAIL_CREDENTIALS_FILE: z.string().optional(),
  GMAIL_TOKEN_FILE: z.string().optional()
});

export const config = envSchema.parse(process.env);
