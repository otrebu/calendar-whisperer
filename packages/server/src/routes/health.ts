import type { FastifyInstance } from "fastify";

/**
 * Health check route
 */
export default function registerHealthRoute(fastify: FastifyInstance): void {
  fastify.get("/health", () => {
    return { status: "ok" };
  });
}
