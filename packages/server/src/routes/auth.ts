import type { FastifyInstance } from "fastify";

import { loadCachedAuthResult } from "@calendar-whisperer/core";

import type { TokenResponse } from "../types.js";

/**
 * Create auth route handler factory
 * Returns token from CLI's filesystem cache
 */
export default function registerAuthRoutes(
  fastify: FastifyInstance,
  cacheDirectory: string,
): void {
  fastify.get<{
    Reply: { error: string } | TokenResponse;
  }>("/api/auth/token", async (request, reply) => {
    try {
      const authResult = await loadCachedAuthResult(cacheDirectory);

      if (!authResult) {
        return reply.status(401).send({
          error: "Not authenticated. Run CLI first: calendar-whisperer events",
        });
      }

      return {
        accessToken: authResult.accessToken,
        expiresOnTimestamp: authResult.expiresOnTimestamp,
      };
    } catch (error) {
      request.log.error(error, "Failed to load cached auth");
      return reply.status(500).send({
        error: "Failed to load authentication token",
      });
    }
  });
}
