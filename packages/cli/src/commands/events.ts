import {
  authenticateWithDeviceCode,
  createDeviceCodeCredential,
  createGraphClient,
  fetchEventsForDate,
  getAccessToken,
  loadAuthenticationRecord,
  loadConfig,
  storeAuthenticationRecord,
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

      // Try to load cached authentication record
      const cachedAuthRecord = await loadAuthenticationRecord(
        config.cacheDirectory,
      );
      let accessToken = "";

      if (cachedAuthRecord === null) {
        // No cached auth record - need to authenticate with device code
        console.log(
          "No valid cached authentication found. Starting authentication...\n",
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
          // Authenticate and get the authentication record
          const authRecord = await authenticateWithDeviceCode(
            credential,
            config.graphScopes,
          );

          if (authRecord === undefined) {
            throw new Error("Authentication failed to return a record");
          }

          // Store authentication record for future use
          await storeAuthenticationRecord(authRecord, config.cacheDirectory);

          // Get access token
          const authResult = await getAccessToken(
            credential,
            config.graphScopes,
          );
          const { accessToken: token } = authResult;
          accessToken = token;

          spinner.succeed("Authentication successful!");
        } catch (error) {
          spinner.fail("Authentication failed");
          throw error;
        }
      } else {
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
          const authResult = await getAccessToken(
            credential,
            config.graphScopes,
          );
          const { accessToken: token } = authResult;
          accessToken = token;
        } catch {
          // Silent auth failed - may need to re-authenticate
          console.log(
            "\nCached authentication expired. Re-authenticating...\n",
          );

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

          const authResult = await getAccessToken(
            newCredential,
            config.graphScopes,
          );
          const { accessToken: token } = authResult;
          accessToken = token;

          spinner.succeed("Authentication successful!");
        }
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
