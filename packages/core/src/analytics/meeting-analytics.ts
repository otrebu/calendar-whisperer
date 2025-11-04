/**
 * Meeting analytics calculation engine
 */

import type {
  CalendarEvent,
  DailyBreakdown,
  MeetingAnalytics,
} from "../types.js";

interface AnalyzeMeetingsOptions {
  endDate: Date;
  events: Array<CalendarEvent>;
  startDate: Date;
  totalWorkMinutes: number;
}

interface GenerateDailyBreakdownOptions {
  endDate: Date;
  events: Array<CalendarEvent>;
  startDate: Date;
  workHoursPerDay: number;
}

/**
 * Analyze meetings to calculate time distribution and percentages
 * @param options - Analysis options
 * @returns Meeting analytics with percentages and breakdown
 */
function analyzeMeetings(options: AnalyzeMeetingsOptions): MeetingAnalytics {
  const { endDate, events, startDate, totalWorkMinutes } = options;
  const activeMeetings = filterActiveMeetings(events);

  // Calculate totals
  const totalMeetingMinutes = activeMeetings.reduce(
    (sum, event) => sum + calculateMeetingDuration(event),
    0,
  );
  const totalFocusMinutes = Math.max(0, totalWorkMinutes - totalMeetingMinutes);

  // Calculate percentages
  const meetingPercentage =
    totalWorkMinutes > 0 ? (totalMeetingMinutes / totalWorkMinutes) * 100 : 0;
  const focusPercentage =
    totalWorkMinutes > 0 ? (totalFocusMinutes / totalWorkMinutes) * 100 : 0;

  // Generate daily breakdown
  const dateRangeLength = generateDateRange(startDate, endDate).length;
  const workHoursPerDay = totalWorkMinutes / 60 / dateRangeLength;
  const dailyBreakdown = generateDailyBreakdown({
    endDate,
    events,
    startDate,
    workHoursPerDay,
  });

  return {
    dailyBreakdown,
    focusPercentage: Math.round(focusPercentage * 10) / 10,
    meetingPercentage: Math.round(meetingPercentage * 10) / 10,
    totalFocusMinutes,
    totalMeetingMinutes,
    totalMeetings: activeMeetings.length,
  };
}

/**
 * Calculate meeting duration in minutes
 * @param event - Calendar event
 * @returns Duration in minutes
 */
function calculateMeetingDuration(event: CalendarEvent): number {
  const start = new Date(event.start.dateTime);
  const end = new Date(event.end.dateTime);
  const durationMs = end.getTime() - start.getTime();
  return Math.round(durationMs / (1000 * 60));
}

/**
 * Filter out cancelled meetings
 * @param events - Array of calendar events
 * @returns Filtered events (non-cancelled)
 */
function filterActiveMeetings(
  events: Array<CalendarEvent>,
): Array<CalendarEvent> {
  return events.filter((event) => event.isCancelled !== true);
}

/**
 * Generate daily breakdown of meetings vs work time
 * @param options - Breakdown options
 * @returns Array of daily breakdowns
 */
function generateDailyBreakdown(
  options: GenerateDailyBreakdownOptions,
): Array<DailyBreakdown> {
  const { endDate, events, startDate, workHoursPerDay } = options;
  const activeMeetings = filterActiveMeetings(events);
  const eventsByDate = groupEventsByDate(activeMeetings);
  const dateRange = generateDateRange(startDate, endDate);
  const workMinutesPerDay = workHoursPerDay * 60;

  return dateRange.map((date) => {
    const dayEvents = eventsByDate.get(date) ?? [];
    const meetingMinutes = dayEvents.reduce(
      (sum, event) => sum + calculateMeetingDuration(event),
      0,
    );
    const focusMinutes = Math.max(0, workMinutesPerDay - meetingMinutes);

    return {
      date,
      focusMinutes,
      meetingCount: dayEvents.length,
      meetingMinutes,
      workMinutes: workMinutesPerDay,
    };
  });
}

/**
 * Generate all dates in range
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Array of date strings
 */
function generateDateRange(startDate: Date, endDate: Date): Array<string> {
  const dates: Array<string> = [];
  const currentDate = new Date(startDate);
  const endDateCopy = new Date(endDate);

  // Normalize to UTC midnight
  currentDate.setUTCHours(0, 0, 0, 0);
  endDateCopy.setUTCHours(0, 0, 0, 0);

  const endTime = endDateCopy.getTime();

  while (currentDate.getTime() <= endTime) {
    dates.push(toISODateString(currentDate));
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  return dates;
}

/**
 * Group events by date
 * @param events - Array of calendar events
 * @returns Map of date string to events
 */
function groupEventsByDate(
  events: Array<CalendarEvent>,
): Map<string, Array<CalendarEvent>> {
  const grouped = new Map<string, Array<CalendarEvent>>();

  for (const event of events) {
    const startDate = new Date(event.start.dateTime);
    const dateKey = toISODateString(startDate);

    const existing = grouped.get(dateKey) ?? [];
    grouped.set(dateKey, [...existing, event]);
  }

  return grouped;
}

/**
 * Get ISO date string (YYYY-MM-DD) from Date
 * @param date - Date object
 * @returns ISO date string
 */
function toISODateString(date: Date): string {
  const parts = date.toISOString().split("T");
  return parts[0] ?? "";
}

export { analyzeMeetings, calculateMeetingDuration, generateDailyBreakdown };
