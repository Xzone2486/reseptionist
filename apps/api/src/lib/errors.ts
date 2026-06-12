import type { FastifyInstance } from "fastify";
import { ZodError } from "zod";
import { databaseErrorResponse, isDatabaseConnectionError, maskDatabaseUrl } from "./database.js";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      reply.status(400).send({ error: "validation_error", details: error.flatten() });
      return;
    }
    if (error instanceof AppError) {
      reply.status(error.statusCode).send({ error: error.message });
      return;
    }
    request.log.error({ err: error, databaseUrl: maskDatabaseUrl() }, "request failed");
    if (isDatabaseConnectionError(error)) {
      reply.status(503).send(databaseErrorResponse(error));
      return;
    }
    reply.status(500).send({ error: "internal_server_error" });
  });
}
