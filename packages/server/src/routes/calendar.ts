import type { FastifyInstance } from "fastify";

import {
  type CalendarEvent,
  createGraphClient,
  fetchEventsForDate,
  loadCachedAuthResult,
} from "@calendar-whisperer/core";
import { z } from "zod";

/**
 * Query schema for calendar events endpoint
 */
const eventsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  timeZone: z.string().default("UTC"),
});

interface EventsQuerystring {
  date: string;
  timeZone?: string;
}

/**
 * Register calendar routes
 * Proxies requests to Microsoft Graph API
 */
export default function registerCalendarRoutes(
  fastify: FastifyInstance,
  cacheDirectory: string,
): void {
  fastify.get<{
    Querystring: EventsQuerystring;
    Reply: { details?: string; error: string } | Array<CalendarEvent>;
  }>("/api/calendar/events", async (request, reply) => {
    try {
      // Validate query parameters
      const parseResult = eventsQuerySchema.safeParse(request.query);

      if (!parseResult.success) {
        return reply.status(400).send({
          details: parseResult.error.message,
          error: "Invalid query parameters",
        });
      }

      const { date, timeZone } = parseResult.data;

      // Load cached token
      const authResult = await loadCachedAuthResult(cacheDirectory);

      if (!authResult) {
        return reply.status(401).send({
          error: "Not authenticated",
        });
      }

      // Fetch from Graph API (always live, no caching)
      const client = createGraphClient(authResult.accessToken);
      const targetDate = new Date(date);
      const events = await fetchEventsForDate(client, targetDate, timeZone);

      return events;
    } catch (error) {
      // Network errors (check BEFORE instanceof Error)
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error.code === "ENOTFOUND" || error.code === "ETIMEDOUT")
      ) {
        return reply.status(503).send({
          error: "Cannot reach Microsoft Graph API. Check internet connection.",
        });
      }

      // Graph API errors
      if (error instanceof Error) {
        request.log.error(error, "Failed to fetch calendar events");
        return reply.status(500).send({
          details: error.message,
          error: "Failed to fetch calendar events",
        });
      }

      // Unknown errors
      request.log.error({ error }, "Unknown error occurred");
      return reply.status(500).send({
        error: "Unknown error occurred",
      });
    }
  });
}
