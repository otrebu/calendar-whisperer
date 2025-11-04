import {
  analyzeMeetings,
  authenticateWithDeviceCode,
  calculateTotalWorkHours,
  calculateWorkWeekEnd,
  countWorkDays,
  createDeviceCodeCredential,
  createGraphClient,
  fetchCalendarEventsInRange,
  fetchEventsForDate,
  getAccessToken,
  loadAuthenticationRecord,
  loadConfig,
  storeAuthenticationRecord,
} from "@calendar-whisperer/core";
import { Command } from "@commander-js/extra-typings";
import { parseISO } from "date-fns";

import { showAnalytics } from "../ui/analytics.js";
import { showDeviceCode } from "../ui/device-code.js";
import { showEvents } from "../ui/events.js";
import { createSpinner } from "../ui/spinner.js";

/* eslint-disable no-console */

/**
 * Handles authentication flow with device code
 */
async function authenticate(
  config: ReturnType<typeof loadConfig>,
): Promise<string> {
  const cachedAuthRecord = await loadAuthenticationRecord(
    config.cacheDirectory,
  );

  if (cachedAuthRecord === null) {
    // No cached auth record - need to authenticate with device code
    console.log(
      "No valid cached authentication found. Starting authentication...\n",
    );

    const credential = createDeviceCodeCredential(config, (deviceCodeInfo) => {
      showDeviceCode(deviceCodeInfo);
    });

    const spinner = createSpinner("Waiting for authentication...");
    spinner.start();

    const authRecord = await authenticateWithDeviceCode(
      credential,
      config.graphScopes,
    );

    if (authRecord === undefined) {
      spinner.fail("Authentication failed");
      throw new Error("Authentication failed to return a record");
    }

    await storeAuthenticationRecord(authRecord, config.cacheDirectory);
    const authResult = await getAccessToken(credential, config.graphScopes);
    spinner.succeed("Authentication successful!");
    return authResult.accessToken;
  }

  // Have cached auth record - try silent authentication
  console.log("Using cached authentication...");

  const credential = createDeviceCodeCredential(
    config,
    (deviceCodeInfo) => {
      showDeviceCode(deviceCodeInfo);
    },
    cachedAuthRecord,
  );

  try {
    const authResult = await getAccessToken(credential, config.graphScopes);
    return authResult.accessToken;
  } catch {
    // Silent auth failed - re-authenticate
    console.log("\nCached authentication expired. Re-authenticating...\n");

    const newCredential = createDeviceCodeCredential(
      config,
      (deviceCodeInfo) => {
        showDeviceCode(deviceCodeInfo);
      },
    );

    const spinner = createSpinner("Waiting for authentication...");
    spinner.start();

    const authRecord = await authenticateWithDeviceCode(
      newCredential,
      config.graphScopes,
    );

    if (authRecord === undefined) {
      spinner.fail("Authentication failed");
      throw new Error("Authentication failed to return a record");
    }

    await storeAuthenticationRecord(authRecord, config.cacheDirectory);
    const authResult = await getAccessToken(newCredential, config.graphScopes);
    spinner.succeed("Authentication successful!");
    return authResult.accessToken;
  }
}

/**
 * Parse date range from options
 */
function parseDateRange(
  dateArgument: string | undefined,
  options: {
    endDate?: string;
    startDate?: string;
  },
  workDays: Array<number>,
): {
  dateRangeEnd: Date | null;
  dateRangeStart: Date | null;
  singleDate: Date | null;
} {
  const isDateRangeMode = options.startDate !== undefined;

  if (
    isDateRangeMode &&
    options.startDate !== undefined &&
    options.startDate !== ""
  ) {
    // Date range mode
    const parsedStart = parseISO(options.startDate);
    if (Number.isNaN(parsedStart.getTime())) {
      console.error("\nError: Invalid start date format. Use YYYY-MM-DD");
      process.exit(1);
    }

    const parsedEnd =
      options.endDate !== undefined && options.endDate !== ""
        ? (() => {
            const end = parseISO(options.endDate);
            if (Number.isNaN(end.getTime())) {
              console.error("\nError: Invalid end date format. Use YYYY-MM-DD");
              process.exit(1);
            }
            return end;
          })()
        : calculateWorkWeekEnd(parsedStart, workDays);

    return {
      dateRangeEnd: parsedEnd,
      dateRangeStart: parsedStart,
      singleDate: null,
    };
  }

  // Single date mode
  const parsedDate =
    dateArgument !== undefined && dateArgument !== ""
      ? parseISO(dateArgument)
      : new Date();

  if (Number.isNaN(parsedDate.getTime())) {
    console.error("\nError: Invalid date format. Use YYYY-MM-DD");
    process.exit(1);
  }

  return {
    dateRangeEnd: null,
    dateRangeStart: null,
    singleDate: parsedDate,
  };
}

const eventsCommand = new Command("events")
  .description("Fetch calendar events for a specific date or date range")
  .argument(
    "[date]",
    "Date in YYYY-MM-DD format (defaults to today, ignored if --start-date is provided)",
  )
  .option("-tz, --timezone <timezone>", "Timezone for events", "UTC")
  .option(
    "-s, --start-date <date>",
    "Start date in YYYY-MM-DD format (for date range queries)",
  )
  .option(
    "-e, --end-date <date>",
    "End date in YYYY-MM-DD format (defaults to end of work week from start date)",
  )
  .option(
    "--hours-per-week <hours>",
    "Override hours per week (default from config)",
  )
  .option(
    "--days-per-week <days>",
    "Override days per week (default from config)",
  )
  .option("--no-analytics", "Disable analytics summary display")
  .action(async (dateArgument, options) => {
    try {
      const config = loadConfig();

      // Apply CLI overrides to work schedule config
      const workConfig = {
        ...config.work,
        ...(options.hoursPerWeek !== undefined && options.hoursPerWeek !== ""
          ? { hoursPerWeek: Number.parseInt(options.hoursPerWeek, 10) }
          : {}),
        ...(options.daysPerWeek !== undefined && options.daysPerWeek !== ""
          ? { daysPerWeek: Number.parseInt(options.daysPerWeek, 10) }
          : {}),
      };

      // Parse date range or single date
      const { dateRangeEnd, dateRangeStart, singleDate } = parseDateRange(
        dateArgument,
        options,
        workConfig.workDays,
      );

      const isDateRangeMode = options.startDate !== undefined;

      // Authenticate
      const accessToken = await authenticate(config);

      const spinner = createSpinner("Fetching calendar events...");
      spinner.start();

      const client = createGraphClient(accessToken);

      const events =
        isDateRangeMode && dateRangeStart && dateRangeEnd
          ? await fetchCalendarEventsInRange(client, {
              endDate: dateRangeEnd,
              startDate: dateRangeStart,
              timeZone: options.timezone,
            })
          : await fetchEventsForDate(
              client,
              singleDate ?? new Date(),
              options.timezone,
            );

      spinner.succeed(`Found ${events.length} events`);

      const displayDate = singleDate ?? dateRangeStart ?? new Date();
      showEvents(events, displayDate);

      // Show analytics if in date range mode (unless explicitly disabled)
      if (dateRangeStart && dateRangeEnd && options.analytics) {
        const workDayCount = countWorkDays(
          dateRangeStart,
          dateRangeEnd,
          workConfig.workDays,
        );
        const totalWorkHours = calculateTotalWorkHours(
          workDayCount,
          workConfig.hoursPerWeek,
          workConfig.daysPerWeek,
        );
        const analytics = analyzeMeetings({
          endDate: dateRangeEnd,
          events,
          startDate: dateRangeStart,
          totalWorkMinutes: totalWorkHours * 60,
        });
        showAnalytics(analytics);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\nError: ${error.message}`);
      } else {
        console.error("\nAn unexpected error occurred");
      }
      process.exit(1);
    }
  });

export default eventsCommand;
export { eventsCommand };
