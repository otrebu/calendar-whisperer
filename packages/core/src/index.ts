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
  fetchEventsForDate,
} from "./graph-client.js";

// Types
export {
  type AuthResult,
  authResultSchema,
  type CalendarEvent,
  calendarEventSchema,
} from "./types.js";
