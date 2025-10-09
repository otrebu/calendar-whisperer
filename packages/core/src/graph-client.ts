import { Client } from "@microsoft/microsoft-graph-client";
import { z } from "zod";

import type { CalendarEvent } from "./types.js";

import { calendarEventSchema } from "./types.js";

/**
 * Create a Microsoft Graph client with the provided access token.
 */
export function createGraphClient(accessToken: string): Client {
  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

/**
 * Fetch calendar events for a specific date range.
 * Returns validated CalendarEvent objects.
 */
export async function fetchCalendarEvents(
  client: Client,
  options: {
    endDateTime: string;
    startDateTime: string;
    timeZone?: string;
  },
): Promise<Array<CalendarEvent>> {
  const { endDateTime, startDateTime, timeZone = "UTC" } = options;

  const response: unknown = await client
    .api("/me/calendar/calendarView")
    .query({
      endDateTime,
      startDateTime,
    })
    .header("Prefer", `outlook.timezone="${timeZone}"`)
    .select([
      "id",
      "subject",
      "start",
      "end",
      "organizer",
      "isAllDay",
      "isCancelled",
    ])
    .orderby("start/dateTime")
    .get();

  const responseData = response as { value: unknown };
  const eventsArray = z.array(calendarEventSchema).parse(responseData.value);

  return eventsArray;
}

/**
 * Fetch events for a specific date (00:00 to 23:59 in the given timezone).
 */
export async function fetchEventsForDate(
  client: Client,
  date: Date,
  timeZone = "UTC",
): Promise<Array<CalendarEvent>> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return fetchCalendarEvents(client, {
    endDateTime: endOfDay.toISOString(),
    startDateTime: startOfDay.toISOString(),
    timeZone,
  });
}
