import { describe, expect, it } from "vitest";

import {
  calculateTotalWorkHours,
  calculateWorkWeekEnd,
  countWorkDays,
  resolveDateRange,
} from "./date-range.js";

describe("calculateWorkWeekEnd", () => {
  it("should calculate Friday end for Monday start (Mon-Fri schedule)", () => {
    const monday = new Date("2025-04-07T00:00:00.000Z");
    const workDays = [1, 2, 3, 4, 5];
    const result = calculateWorkWeekEnd(monday, workDays);

    expect(result.getUTCDay()).toBe(5);
    expect(result.getUTCDate()).toBe(11);
  });

  it("should calculate Thursday end for Monday start (Mon-Thu schedule)", () => {
    const monday = new Date("2025-04-07T00:00:00.000Z");
    const workDays = [1, 2, 3, 4];
    const result = calculateWorkWeekEnd(monday, workDays);

    expect(result.getUTCDay()).toBe(4);
    expect(result.getUTCDate()).toBe(10);
  });

  it("should handle weekend start (Saturday)", () => {
    const saturday = new Date("2025-04-12T00:00:00.000Z");
    const workDays = [0, 6];
    const result = calculateWorkWeekEnd(saturday, workDays);

    expect(result.getUTCDay()).toBe(0);
    expect(result.getUTCDate()).toBe(13);
  });

  it("should handle custom schedule (Tue-Thu, Sat)", () => {
    const tuesday = new Date("2025-04-08T00:00:00.000Z");
    const workDays = [2, 3, 4, 6];
    const result = calculateWorkWeekEnd(tuesday, workDays);

    expect(result.getUTCDay()).toBe(6);
    expect(result.getUTCDate()).toBe(12);
  });

  it("should handle single work day", () => {
    const monday = new Date("2025-04-07T00:00:00.000Z");
    const workDays = [1];
    const result = calculateWorkWeekEnd(monday, workDays);

    expect(result.getUTCDay()).toBe(1);
    expect(result.getUTCDate()).toBe(7);
  });
});

describe("resolveDateRange", () => {
  it("should use explicit end date when provided", () => {
    const startDate = new Date("2025-04-07T00:00:00.000Z");
    const endDate = new Date("2025-04-30T23:59:59.999Z");
    const workDays = [1, 2, 3, 4, 5];

    const result = resolveDateRange(startDate, endDate, workDays);

    expect(result.startDate).toEqual(startDate);
    expect(result.endDate).toEqual(endDate);
  });

  it("should calculate work week end when endDate is null", () => {
    const monday = new Date("2025-04-07T00:00:00.000Z");
    const workDays = [1, 2, 3, 4, 5];

    const result = resolveDateRange(monday, null, workDays);

    expect(result.startDate).toEqual(monday);
    expect(result.endDate.getUTCDay()).toBe(5);
    expect(result.endDate.getUTCDate()).toBe(11);
  });

  it("should set end of day (23:59:59.999) for calculated end date", () => {
    const monday = new Date("2025-04-07T00:00:00.000Z");
    const workDays = [1, 2, 3, 4, 5];

    const result = resolveDateRange(monday, null, workDays);

    expect(result.endDate.getUTCHours()).toBe(23);
    expect(result.endDate.getUTCMinutes()).toBe(59);
    expect(result.endDate.getUTCSeconds()).toBe(59);
    expect(result.endDate.getUTCMilliseconds()).toBe(999);
  });

  it("should handle DST transition (spring forward)", () => {
    const beforeDST = new Date("2025-03-10T00:00:00.000Z");
    const workDays = [1, 2, 3, 4, 5];

    const result = resolveDateRange(beforeDST, null, workDays);

    expect(result.endDate.getUTCDay()).toBe(5);
  });

  it("should handle DST transition (fall back)", () => {
    const beforeDST = new Date("2025-11-03T00:00:00.000Z");
    const workDays = [1, 2, 3, 4, 5];

    const result = resolveDateRange(beforeDST, null, workDays);

    expect(result.endDate.getUTCDay()).toBe(5);
  });
});

describe("countWorkDays", () => {
  it("should count 5 days for Mon-Fri week", () => {
    const startDate = new Date("2025-04-07T00:00:00.000Z");
    const endDate = new Date("2025-04-11T23:59:59.999Z");
    const workDays = [1, 2, 3, 4, 5];

    const count = countWorkDays(startDate, endDate, workDays);

    expect(count).toBe(5);
  });

  it("should count 4 days for Mon-Thu week", () => {
    const startDate = new Date("2025-04-07T00:00:00.000Z");
    const endDate = new Date("2025-04-10T23:59:59.999Z");
    const workDays = [1, 2, 3, 4];

    const count = countWorkDays(startDate, endDate, workDays);

    expect(count).toBe(4);
  });

  it("should count 0 days when range only includes non-work days", () => {
    const startDate = new Date("2025-04-12T00:00:00.000Z");
    const endDate = new Date("2025-04-13T23:59:59.999Z");
    const workDays = [1, 2, 3, 4, 5];

    const count = countWorkDays(startDate, endDate, workDays);

    expect(count).toBe(0);
  });

  it("should count 1 day for single work day", () => {
    const startDate = new Date("2025-04-07T00:00:00.000Z");
    const endDate = new Date("2025-04-07T23:59:59.999Z");
    const workDays = [1, 2, 3, 4, 5];

    const count = countWorkDays(startDate, endDate, workDays);

    expect(count).toBe(1);
  });

  it("should count work days across multiple weeks", () => {
    const startDate = new Date("2025-04-07T00:00:00.000Z");
    const endDate = new Date("2025-04-18T23:59:59.999Z");
    const workDays = [1, 2, 3, 4, 5];

    const count = countWorkDays(startDate, endDate, workDays);

    expect(count).toBe(10);
  });

  it("should handle custom schedule across weeks", () => {
    const startDate = new Date("2025-04-08T00:00:00.000Z");
    const endDate = new Date("2025-04-17T23:59:59.999Z");
    const workDays = [2, 4];

    const count = countWorkDays(startDate, endDate, workDays);

    expect(count).toBe(4);
  });
});

describe("calculateTotalWorkHours", () => {
  it("should calculate 40 hours for standard work week (5 days, 8h/day)", () => {
    const workDayCount = 5;
    const hoursPerWeek = 40;
    const daysPerWeek = 5;

    const hours = calculateTotalWorkHours(
      workDayCount,
      hoursPerWeek,
      daysPerWeek,
    );

    expect(hours).toBe(40);
  });

  it("should calculate 32 hours for 4-day work week (4 days, 8h/day)", () => {
    const workDayCount = 4;
    const hoursPerWeek = 32;
    const daysPerWeek = 4;

    const hours = calculateTotalWorkHours(
      workDayCount,
      hoursPerWeek,
      daysPerWeek,
    );

    expect(hours).toBe(32);
  });

  it("should calculate proportional hours for partial weeks", () => {
    const workDayCount = 3;
    const hoursPerWeek = 40;
    const daysPerWeek = 5;

    const hours = calculateTotalWorkHours(
      workDayCount,
      hoursPerWeek,
      daysPerWeek,
    );

    expect(hours).toBe(24);
  });

  it("should calculate 0 hours for 0 work days", () => {
    const workDayCount = 0;
    const hoursPerWeek = 40;
    const daysPerWeek = 5;

    const hours = calculateTotalWorkHours(
      workDayCount,
      hoursPerWeek,
      daysPerWeek,
    );

    expect(hours).toBe(0);
  });

  it("should handle multiple weeks (10 days = 2 weeks)", () => {
    const workDayCount = 10;
    const hoursPerWeek = 40;
    const daysPerWeek = 5;

    const hours = calculateTotalWorkHours(
      workDayCount,
      hoursPerWeek,
      daysPerWeek,
    );

    expect(hours).toBe(80);
  });

  it("should handle fractional results with floating point precision", () => {
    const workDayCount = 7;
    const hoursPerWeek = 37.5;
    const daysPerWeek = 5;

    const hours = calculateTotalWorkHours(
      workDayCount,
      hoursPerWeek,
      daysPerWeek,
    );

    expect(hours).toBeCloseTo(52.5);
  });
});

describe("edge cases", () => {
  it("should handle empty work days array gracefully", () => {
    const startDate = new Date("2025-04-07T00:00:00.000Z");
    const endDate = new Date("2025-04-11T23:59:59.999Z");
    const workDays: Array<number> = [];

    const count = countWorkDays(startDate, endDate, workDays);

    expect(count).toBe(0);
  });

  it("should handle leap year correctly (Feb 29, 2024)", () => {
    const startDate = new Date("2024-02-26T00:00:00.000Z");
    const endDate = new Date("2024-03-01T23:59:59.999Z");
    const workDays = [1, 2, 3, 4, 5];

    const count = countWorkDays(startDate, endDate, workDays);

    expect(count).toBe(5);
  });

  it("should handle year boundary correctly", () => {
    const startDate = new Date("2024-12-30T00:00:00.000Z");
    const endDate = new Date("2025-01-03T23:59:59.999Z");
    const workDays = [1, 2, 3, 4, 5];

    const count = countWorkDays(startDate, endDate, workDays);

    expect(count).toBe(5);
  });

  it("should handle same start and end date", () => {
    const date = new Date("2025-04-07T00:00:00.000Z");
    const workDays = [1, 2, 3, 4, 5];

    const count = countWorkDays(date, date, workDays);

    expect(count).toBe(1);
  });

  it("should handle time zones consistently (UTC)", () => {
    const startDate = new Date("2025-04-07T23:00:00.000Z");
    const endDate = new Date("2025-04-11T01:00:00.000Z");
    const workDays = [1, 2, 3, 4, 5];

    const count = countWorkDays(startDate, endDate, workDays);

    expect(count).toBe(5);
  });
});
