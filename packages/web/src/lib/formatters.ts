import { format as formatDate, parseISO } from "date-fns";

/**
 * Format ISO datetime string to date (EEEE, MMMM d, yyyy)
 */
export function formatFullDate(isoString: string): string {
  return formatDate(parseISO(isoString), "EEEE, MMMM d, yyyy");
}

/**
 * Format Date to YYYY-MM-DD for input value
 */
export function formatInputDate(date: Date): string {
  return formatDate(date, "yyyy-MM-dd");
}

/**
 * Format ISO datetime string to time (HH:mm)
 */
export function formatTime(isoString: string): string {
  return formatDate(parseISO(isoString), "HH:mm");
}
