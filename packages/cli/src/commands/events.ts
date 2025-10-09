import {
  createDeviceCodeCredential,
  createGraphClient,
  fetchEventsForDate,
  getAccessToken,
  loadCachedAuthResult,
  loadConfig,
  storeAuthResult,
} from "@calendar-whisperer/core";
import { Command } from "@commander-js/extra-typings";
import { parseISO } from "date-fns";

import { showDeviceCode } from "../ui/device-code.js";
import { showEvents } from "../ui/events.js";
import { createSpinner } from "../ui/spinner.js";

/* eslint-disable no-console */
const eventsCommand = new Command("events")
  .description("Fetch calendar events for a specific date")
  .argument("[date]", "Date in YYYY-MM-DD format (defaults to today)")
  .option("-tz, --timezone <timezone>", "Timezone for events", "UTC")
  .action(async (dateArgument, options) => {
    try {
      const config = loadConfig();

      const targetDate =
        dateArgument !== undefined && dateArgument !== ""
          ? parseISO(dateArgument)
          : new Date();

      if (Number.isNaN(targetDate.getTime())) {
        console.error("\nError: Invalid date format. Use YYYY-MM-DD");
        process.exit(1);
      }

      const cachedAuth = await loadCachedAuthResult(config.cacheDirectory);
      let accessToken = "";

      if (cachedAuth === null) {
        console.log(
          "No valid cached token found. Starting authentication...\n",
        );

        const credential = createDeviceCodeCredential(
          config,
          (deviceCodeInfo) => {
            showDeviceCode(deviceCodeInfo);
          },
        );

        const spinner = createSpinner("Waiting for authentication...");
        spinner.start();

        try {
          const { accessToken: token } = await getAccessToken(
            credential,
            config.graphScopes,
          );
          accessToken = token;

          const authResult = { accessToken, expiresOnTimestamp: 0 };
          await storeAuthResult(authResult, config.cacheDirectory);
          spinner.succeed("Authentication successful!");
        } catch (error) {
          spinner.fail("Authentication failed");
          throw error;
        }
      } else {
        console.log("Using cached authentication...");
        const { accessToken: token } = cachedAuth;
        accessToken = token;
      }

      const spinner = createSpinner("Fetching calendar events...");
      spinner.start();

      const client = createGraphClient(accessToken);
      const events = await fetchEventsForDate(
        client,
        targetDate,
        options.timezone,
      );

      spinner.succeed(`Found ${events.length} events`);

      showEvents(events, targetDate);
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
