import { z } from "zod";

// Zod schema for calendar events from MS Graph
export const calendarEventSchema = z.object({
  end: z.object({
    dateTime: z.string(),
    timeZone: z.string(),
  }),
  id: z.string(),
  isAllDay: z.boolean().optional(),
  isCancelled: z.boolean().optional(),
  organizer: z
    .object({
      emailAddress: z.object({
        address: z.string().optional(),
        name: z.string().optional(),
      }),
    })
    .optional(),
  start: z.object({
    dateTime: z.string(),
    timeZone: z.string(),
  }),
  subject: z.string(),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

// Authentication result with cached token info
export const authResultSchema = z.object({
  accessToken: z.string(),
  account: z
    .object({
      name: z.string().optional(),
      username: z.string(),
    })
    .optional(),
  expiresOnTimestamp: z.number(),
});

export type AuthResult = z.infer<typeof authResultSchema>;

// Authentication record for persisting identity across sessions
// Contains no sensitive data, can be stored unencrypted
export const authenticationRecordSchema = z.object({
  authority: z.string(),
  clientId: z.string(),
  homeAccountId: z.string(),
  tenantId: z.string(),
  username: z.string(),
});

export type AuthenticationRecordData = z.infer<
  typeof authenticationRecordSchema
>;

// Analytics types
export interface DailyBreakdown {
  // ISO date string (YYYY-MM-DD)
  date: string;
  focusMinutes: number;
  meetingCount: number;
  meetingMinutes: number;
  workMinutes: number;
}

export interface MeetingAnalytics {
  dailyBreakdown: Array<DailyBreakdown>;
  focusPercentage: number;
  meetingPercentage: number;
  totalFocusMinutes: number;
  totalMeetingMinutes: number;
  totalMeetings: number;
}
