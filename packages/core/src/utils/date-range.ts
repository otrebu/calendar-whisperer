/**
 * Date range utilities for work schedule calculations
 */

/**
 * Calculate total work hours based on work day count
 * @param workDayCount - Number of work days
 * @param hoursPerWeek - Total hours per week
 * @param daysPerWeek - Number of work days per week
 * @returns Total work hours
 */
export function calculateTotalWorkHours(
  workDayCount: number,
  hoursPerWeek: number,
  daysPerWeek: number,
): number {
  return (workDayCount / daysPerWeek) * hoursPerWeek;
}

/**
 * Calculate the end date of a work week starting from a given date
 * @param startDate - Start date of the work week
 * @param workDays - Array of work day numbers (0=Sunday, 6=Saturday)
 * @returns End date of the work week
 */
export function calculateWorkWeekEnd(
  startDate: Date,
  workDays: Array<number>,
): Date {
  if (workDays.length === 0) {
    return new Date(startDate);
  }

  const sortedWorkDays = [...workDays].sort((a, b) => a - b);
  const startDay = startDate.getUTCDay();

  let lastWorkDay: null | number = null;

  for (let index = sortedWorkDays.length - 1; index >= 0; index -= 1) {
    const workDay = sortedWorkDays[index];
    if (workDay !== undefined && workDay > startDay) {
      lastWorkDay = workDay;
      break;
    }
  }

  if (lastWorkDay === null) {
    const firstWorkDay = sortedWorkDays[0];
    if (firstWorkDay === undefined) {
      return new Date(startDate);
    }

    if (firstWorkDay === startDay) {
      return new Date(startDate);
    }

    lastWorkDay = firstWorkDay + 7;
  }

  const daysToAdd = lastWorkDay - startDay;
  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + daysToAdd);

  return endDate;
}

/**
 * Count work days in a date range
 * @param startDate - Start date of range (inclusive)
 * @param endDate - End date of range (inclusive)
 * @param workDays - Array of work day numbers (0=Sunday, 6=Saturday)
 * @returns Number of work days in the range
 */
export function countWorkDays(
  startDate: Date,
  endDate: Date,
  workDays: Array<number>,
): number {
  if (workDays.length === 0) {
    return 0;
  }

  const workDaySet = new Set(workDays);
  let count = 0;

  const start = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
    ),
  );
  const end = new Date(
    Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate(),
    ),
  );

  const startTime = start.getTime();
  const endTime = end.getTime();
  const oneDayMs = 1000 * 60 * 60 * 24;

  for (let time = startTime; time <= endTime; time += oneDayMs) {
    const current = new Date(time);
    if (workDaySet.has(current.getUTCDay())) {
      count += 1;
    }
  }

  return count;
}

/**
 * Resolve date range, calculating end date if not provided
 * @param startDate - Start date
 * @param endDate - End date (null to auto-calculate)
 * @param workDays - Array of work day numbers (0=Sunday, 6=Saturday)
 * @returns Resolved date range with both start and end dates
 */
export function resolveDateRange(
  startDate: Date,
  endDate: Date | null,
  workDays: Array<number>,
): { endDate: Date; startDate: Date } {
  if (endDate !== null) {
    return { endDate, startDate };
  }

  const calculatedEnd = calculateWorkWeekEnd(startDate, workDays);

  calculatedEnd.setUTCHours(23, 59, 59, 999);

  return {
    endDate: calculatedEnd,
    startDate,
  };
}
