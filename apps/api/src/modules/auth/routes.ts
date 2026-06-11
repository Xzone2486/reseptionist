import bcrypt from "bcryptjs";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth } from "../../lib/auth.js";
import { AppError } from "../../lib/errors.js";
import { prisma } from "../../lib/prisma.js";

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      throw new AppError(401, "invalid_credentials");
    }
    const token = app.jwt.sign({ sub: user.id, email: user.email, role: user.role });
    reply.setCookie("token", token, { httpOnly: true, sameSite: "lax", path: "/" });
    return { token, user: { id: user.id, email: user.email, role: user.role } };
  });

  app.post("/auth/logout", async (_request, reply) => {
    reply.clearCookie("token", { path: "/" });
    return { ok: true };
  });

  app.get("/auth/me", { preHandler: requireAuth }, async (request) => request.user);
}

