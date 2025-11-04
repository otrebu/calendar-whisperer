// Analytics
export {
  analyzeMeetings,
  calculateMeetingDuration,
  generateDailyBreakdown,
} from "./analytics/meeting-analytics.js";

// Authentication
export {
  authenticateWithDeviceCode,
  clearAuthCache,
  createDeviceCodeCredential,
  type DeviceCodeCallback,
  getAccessToken,
  loadAuthenticationRecord,
  storeAuthenticationRecord,
} from "./auth.js";

// Configuration
export { type Config, configSchema, loadConfig } from "./config.js";

// Microsoft Graph Client
export {
  createGraphClient,
  fetchCalendarEvents,
  fetchCalendarEventsInRange,
  fetchEventsForDate,
  type FetchEventsOptions,
} from "./graph-client.js";

// Types
export {
  type AuthResult,
  authResultSchema,
  type CalendarEvent,
  calendarEventSchema,
  type DailyBreakdown,
  type MeetingAnalytics,
} from "./types.js";

// Date Range Utilities
export {
  calculateTotalWorkHours,
  calculateWorkWeekEnd,
  countWorkDays,
  resolveDateRange,
} from "./utils/date-range.js";
