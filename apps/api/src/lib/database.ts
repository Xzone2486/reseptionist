import { Prisma } from "@prisma/client";
import { config } from "../config.js";
import { prisma } from "./prisma.js";

const DATABASE_ERROR_MESSAGE = "Could not connect to database. Check DATABASE_URL and Postgres container.";
const DATABASE_AUTH_MESSAGE = "Database authentication failed. Check DATABASE_URL and Docker Postgres credentials.";

export function maskDatabaseUrl(databaseUrl = config.DATABASE_URL) {
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.password) parsed.password = "****";
    return parsed.toString();
  } catch {
    return databaseUrl.replace(/:\/\/([^:\s]+):([^@\s]+)@/, "://$1:****@");
  }
}

export function isDatabaseConnectionError(error: unknown) {
  const err = error as { name?: string; message?: string; code?: string; errorCode?: string };
  const code = err.code || err.errorCode;
  const message = err.message || "";

  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    code === "P1000" ||
    code === "P1001" ||
    code === "P1002" ||
    code === "P1017" ||
    message.includes("Authentication failed against database server") ||
    message.includes("Can't reach database server")
  );
}

export function databaseErrorResponse(error: unknown) {
  const err = error as { message?: string; code?: string; errorCode?: string };
  const code = err.code || err.errorCode;
  const message = err.message || "";
  const isAuthError = code === "P1000" || message.includes("Authentication failed against database server");
  const safeMessage = isAuthError ? DATABASE_AUTH_MESSAGE : DATABASE_ERROR_MESSAGE;

  return {
    error: "database_connection_error",
    message: process.env.NODE_ENV === "production" ? "Database connection failed." : safeMessage
  };
}

export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true as const, databaseUrl: maskDatabaseUrl() };
  } catch (error) {
    if (!isDatabaseConnectionError(error)) throw error;
    return { ok: false as const, databaseUrl: maskDatabaseUrl(), ...databaseErrorResponse(error) };
  }
}
