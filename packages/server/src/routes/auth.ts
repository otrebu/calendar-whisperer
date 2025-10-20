import type { FastifyInstance } from "fastify";

import {
  createDeviceCodeCredential,
  getAccessToken,
  loadAuthenticationRecord,
  loadConfig,
} from "@calendar-whisperer/core";

import type { TokenResponse } from "../types.js";

/**
 * Create auth route handler factory
 * Returns token using the new authentication mechanism
 */
export default function registerAuthRoutes(
  fastify: FastifyInstance,
  cacheDirectory: string,
): void {
  fastify.get<{
    Reply: { error: string } | TokenResponse;
  }>("/api/auth/token", async (request, reply) => {
    try {
      // Load cached authentication record
      const authRecord = await loadAuthenticationRecord(cacheDirectory);

      if (!authRecord) {
        return reply.status(401).send({
          error: "Not authenticated. Run CLI first: calendar-whisperer events",
        });
      }

      // Get fresh token using the authentication record
      const config = loadConfig();
      const credential = createDeviceCodeCredential(
        config,
        undefined,
        authRecord,
      );

      const authResult = await getAccessToken(credential, config.graphScopes);

      return {
        accessToken: authResult.accessToken,
        expiresOnTimestamp: authResult.expiresOnTimestamp,
      };
    } catch (error) {
      request.log.error(error, "Failed to get access token");
      return reply.status(500).send({
        error: "Failed to load authentication token",
      });
    }
  });
}
