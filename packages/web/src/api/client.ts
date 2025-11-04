import type { CalendarEvent } from "@calendar-whisperer/core";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

/**
 * Custom error types for API calls
 * WHY: These custom errors extend Error to follow functional programming patterns
 * where we prefer custom errors that extend Error as the only exception to the no-classes rule
 */
class ApiError extends Error {
  public details?: string;
  public statusCode: number;

  constructor(message: string, statusCode: number, details?: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details;

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NetworkError";

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * Check server health
 * WHY: Defined early to satisfy alphabetical ordering, uses fetchApi via hoisting
 */
async function checkHealth(): Promise<boolean> {
  try {
    const result = await fetchApi<{ status: string }>("/health");
    return result.status === "ok";
  } catch {
    return false;
  }
}

/**
 * Extract error response from API
 * WHY: Parse is a verb in the domain of data transformation
 */
async function extractErrorResponse(response: Response): Promise<ApiError> {
  try {
    const data = (await response.json()) as {
      details?: string;
      error?: string;
    };

    return new ApiError(
      data.error ?? "Unknown error",
      response.status,
      data.details,
    );
  } catch {
    return new ApiError("Failed to parse error", response.status);
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error = await extractErrorResponse(response);
      throw error;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof TypeError) {
      throw new NetworkError(
        "Cannot reach server. Make sure the server is running on port 3001.",
      );
    }

    throw error;
  }
}

/**
 * Fetch calendar events for a specific date
 */
async function getCalendarEvents(
  date: Date,
  timeZone = "UTC",
): Promise<Array<CalendarEvent>> {
  const dateString = date.toISOString().split("T")[0];
  return fetchApi<Array<CalendarEvent>>(
    `/api/calendar/events?date=${dateString}&timeZone=${encodeURIComponent(timeZone)}`,
  );
}

/**
 * Get authentication token from server
 */
async function getToken(): Promise<{
  accessToken: string;
  expiresOnTimestamp: number;
}> {
  return fetchApi<{ accessToken: string; expiresOnTimestamp: number }>(
    "/api/auth/token",
  );
}

export { ApiError, checkHealth, getCalendarEvents, getToken, NetworkError };
