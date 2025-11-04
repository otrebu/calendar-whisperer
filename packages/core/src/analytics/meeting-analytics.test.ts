import { describe, expect, it } from "vitest";

import type { CalendarEvent } from "../types.js";

import {
  analyzeMeetings,
  calculateMeetingDuration,
  generateDailyBreakdown,
} from "./meeting-analytics.js";

describe("calculateMeetingDuration", () => {
  it("should calculate duration for 1-hour meeting", () => {
    const event: CalendarEvent = {
      end: {
        dateTime: "2025-04-07T10:00:00.000Z",
        timeZone: "UTC",
      },
      id: "1",
      start: {
        dateTime: "2025-04-07T09:00:00.000Z",
        timeZone: "UTC",
      },
      subject: "Daily Standup",
    };

    expect(calculateMeetingDuration(event)).toBe(60);
  });

  it("should calculate duration for 30-minute meeting", () => {
    const event: CalendarEvent = {
      end: {
        dateTime: "2025-04-07T09:30:00.000Z",
        timeZone: "UTC",
      },
      id: "2",
      start: {
        dateTime: "2025-04-07T09:00:00.000Z",
        timeZone: "UTC",
      },
      subject: "Quick Sync",
    };

    expect(calculateMeetingDuration(event)).toBe(30);
  });

  it("should handle all-day event", () => {
    const event: CalendarEvent = {
      end: {
        dateTime: "2025-04-08T00:00:00.000Z",
        timeZone: "UTC",
      },
      id: "3",
      isAllDay: true,
      start: {
        dateTime: "2025-04-07T00:00:00.000Z",
        timeZone: "UTC",
      },
      subject: "Company Holiday",
    };

    // 24 hours
    expect(calculateMeetingDuration(event)).toBe(1440);
  });
});

describe("generateDailyBreakdown", () => {
  it("should generate breakdown for single day with meetings", () => {
    const events: Array<CalendarEvent> = [
      {
        end: {
          dateTime: "2025-04-07T10:00:00.000Z",
          timeZone: "UTC",
        },
        id: "1",
        start: {
          dateTime: "2025-04-07T09:00:00.000Z",
          timeZone: "UTC",
        },
        subject: "Meeting 1",
      },
      {
        end: {
          dateTime: "2025-04-07T15:00:00.000Z",
          timeZone: "UTC",
        },
        id: "2",
        start: {
          dateTime: "2025-04-07T14:00:00.000Z",
          timeZone: "UTC",
        },
        subject: "Meeting 2",
      },
    ];

    const startDate = new Date("2025-04-07T00:00:00.000Z");
    const endDate = new Date("2025-04-07T23:59:59.999Z");
    const workHoursPerDay = 8;

    const breakdown = generateDailyBreakdown({
      endDate,
      events,
      startDate,
      workHoursPerDay,
    });

    expect(breakdown).toHaveLength(1);
    expect(breakdown[0]).toMatchObject({
      date: "2025-04-07",
      // 6 hours
      focusMinutes: 360,
      meetingCount: 2,
      // 2 hours
      meetingMinutes: 120,
      // 8 hours
      workMinutes: 480,
    });
  });

  it("should generate breakdown for multiple days", () => {
    const events: Array<CalendarEvent> = [
      {
        end: {
          dateTime: "2025-04-07T10:00:00.000Z",
          timeZone: "UTC",
        },
        id: "1",
        start: {
          dateTime: "2025-04-07T09:00:00.000Z",
          timeZone: "UTC",
        },
        subject: "Day 1 Meeting",
      },
      {
        end: {
          dateTime: "2025-04-08T11:00:00.000Z",
          timeZone: "UTC",
        },
        id: "2",
        start: {
          dateTime: "2025-04-08T10:00:00.000Z",
          timeZone: "UTC",
        },
        subject: "Day 2 Meeting",
      },
    ];

    const startDate = new Date("2025-04-07T00:00:00.000Z");
    const endDate = new Date("2025-04-08T23:59:59.999Z");
    const workHoursPerDay = 8;

    const breakdown = generateDailyBreakdown({
      endDate,
      events,
      startDate,
      workHoursPerDay,
    });

    expect(breakdown).toHaveLength(2);
    expect(breakdown[0]?.date).toBe("2025-04-07");
    expect(breakdown[0]?.meetingCount).toBe(1);
    expect(breakdown[1]?.date).toBe("2025-04-08");
    expect(breakdown[1]?.meetingCount).toBe(1);
  });

  it("should handle days with no meetings", () => {
    const events: Array<CalendarEvent> = [];
    const startDate = new Date("2025-04-07T00:00:00.000Z");
    const endDate = new Date("2025-04-07T23:59:59.999Z");
    const workHoursPerDay = 8;

    const breakdown = generateDailyBreakdown({
      endDate,
      events,
      startDate,
      workHoursPerDay,
    });

    expect(breakdown).toHaveLength(1);
    expect(breakdown[0]).toMatchObject({
      date: "2025-04-07",
      // 8 hours
      focusMinutes: 480,
      meetingCount: 0,
      meetingMinutes: 0,
      workMinutes: 480,
    });
  });
});

describe("analyzeMeetings", () => {
  it("should calculate analytics for typical work week", () => {
    const events: Array<CalendarEvent> = [
      {
        end: {
          dateTime: "2025-04-07T10:00:00.000Z",
          timeZone: "UTC",
        },
        id: "1",
        start: {
          dateTime: "2025-04-07T09:00:00.000Z",
          timeZone: "UTC",
        },
        subject: "Standup",
      },
      {
        end: {
          dateTime: "2025-04-07T15:00:00.000Z",
          timeZone: "UTC",
        },
        id: "2",
        start: {
          dateTime: "2025-04-07T13:00:00.000Z",
          timeZone: "UTC",
        },
        subject: "Planning",
      },
    ];

    const startDate = new Date("2025-04-07T00:00:00.000Z");
    const endDate = new Date("2025-04-07T23:59:59.999Z");
    // 8 hours
    const totalWorkMinutes = 480;

    const analytics = analyzeMeetings({
      endDate,
      events,
      startDate,
      totalWorkMinutes,
    });

    // 3 hours
    expect(analytics.totalMeetingMinutes).toBe(180);
    // 5 hours
    expect(analytics.totalFocusMinutes).toBe(300);
    // 3/8 = 37.5%
    expect(analytics.meetingPercentage).toBe(37.5);
    expect(analytics.focusPercentage).toBe(62.5);
    expect(analytics.totalMeetings).toBe(2);
    expect(analytics.dailyBreakdown).toHaveLength(1);
  });

  it("should handle no meetings scenario", () => {
    const events: Array<CalendarEvent> = [];
    const startDate = new Date("2025-04-07T00:00:00.000Z");
    const endDate = new Date("2025-04-07T23:59:59.999Z");
    const totalWorkMinutes = 480;

    const analytics = analyzeMeetings({
      endDate,
      events,
      startDate,
      totalWorkMinutes,
    });

    expect(analytics.totalMeetingMinutes).toBe(0);
    expect(analytics.totalFocusMinutes).toBe(480);
    expect(analytics.meetingPercentage).toBe(0);
    expect(analytics.focusPercentage).toBe(100);
    expect(analytics.totalMeetings).toBe(0);
  });

  it("should handle meetings exceeding work hours (overtime)", () => {
    const events: Array<CalendarEvent> = [
      {
        end: {
          dateTime: "2025-04-07T18:00:00.000Z",
          timeZone: "UTC",
        },
        id: "1",
        start: {
          dateTime: "2025-04-07T09:00:00.000Z",
          timeZone: "UTC",
        },
        subject: "All Day Meetings",
      },
    ];

    const startDate = new Date("2025-04-07T00:00:00.000Z");
    const endDate = new Date("2025-04-07T23:59:59.999Z");
    // 8 hours
    const totalWorkMinutes = 480;

    const analytics = analyzeMeetings({
      endDate,
      events,
      startDate,
      totalWorkMinutes,
    });

    // 9 hours
    expect(analytics.totalMeetingMinutes).toBe(540);
    // No focus time left
    expect(analytics.totalFocusMinutes).toBe(0);
    // 9/8 = 112.5% (overtime)
    expect(analytics.meetingPercentage).toBe(112.5);
    expect(analytics.focusPercentage).toBe(0);
  });

  it("should calculate correct percentages for multi-day range", () => {
    const events: Array<CalendarEvent> = [
      {
        end: {
          dateTime: "2025-04-07T10:00:00.000Z",
          timeZone: "UTC",
        },
        id: "1",
        start: {
          dateTime: "2025-04-07T09:00:00.000Z",
          timeZone: "UTC",
        },
        subject: "Day 1",
      },
      {
        end: {
          dateTime: "2025-04-08T10:00:00.000Z",
          timeZone: "UTC",
        },
        id: "2",
        start: {
          dateTime: "2025-04-08T09:00:00.000Z",
          timeZone: "UTC",
        },
        subject: "Day 2",
      },
    ];

    const startDate = new Date("2025-04-07T00:00:00.000Z");
    const endDate = new Date("2025-04-08T23:59:59.999Z");
    // 16 hours (2 days × 8 hours)
    const totalWorkMinutes = 960;

    const analytics = analyzeMeetings({
      endDate,
      events,
      startDate,
      totalWorkMinutes,
    });

    // 2 hours total
    expect(analytics.totalMeetingMinutes).toBe(120);
    // 14 hours
    expect(analytics.totalFocusMinutes).toBe(840);
    // 2/16 = 12.5%
    expect(analytics.meetingPercentage).toBe(12.5);
    expect(analytics.focusPercentage).toBe(87.5);
    expect(analytics.totalMeetings).toBe(2);
    expect(analytics.dailyBreakdown).toHaveLength(2);
  });

  it("should filter out cancelled meetings", () => {
    const events: Array<CalendarEvent> = [
      {
        end: {
          dateTime: "2025-04-07T10:00:00.000Z",
          timeZone: "UTC",
        },
        id: "1",
        isCancelled: false,
        start: {
          dateTime: "2025-04-07T09:00:00.000Z",
          timeZone: "UTC",
        },
        subject: "Active Meeting",
      },
      {
        end: {
          dateTime: "2025-04-07T11:00:00.000Z",
          timeZone: "UTC",
        },
        id: "2",
        isCancelled: true,
        start: {
          dateTime: "2025-04-07T10:00:00.000Z",
          timeZone: "UTC",
        },
        subject: "Cancelled Meeting",
      },
    ];

    const startDate = new Date("2025-04-07T00:00:00.000Z");
    const endDate = new Date("2025-04-07T23:59:59.999Z");
    const totalWorkMinutes = 480;

    const analytics = analyzeMeetings({
      endDate,
      events,
      startDate,
      totalWorkMinutes,
    });

    expect(analytics.totalMeetings).toBe(1);
    expect(analytics.totalMeetingMinutes).toBe(60);
  });
});
