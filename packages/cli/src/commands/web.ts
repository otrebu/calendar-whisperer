import { loadCachedAuthResult, loadConfig } from "@calendar-whisperer/core";
import { Command } from "@commander-js/extra-typings";
import chalk from "chalk";
import open from "open";

import startWebServer from "../lib/server-lifecycle.js";

/* eslint-disable no-console */

export const webCommand = new Command("web")
  .description("Launch local web interface (requires internet connection)")
  .option("-p, --port <number>", "Server port", "3001")
  .option("--no-open", "Don't open browser automatically")
  .action(async (options) => {
    try {
      const config = loadConfig();
      const port = Number.parseInt(options.port, 10);

      // Check for cached auth
      console.log("Checking authentication...");
      const cachedAuth = await loadCachedAuthResult(config.cacheDirectory);

      if (!cachedAuth) {
        console.error(
          chalk.red(
            "\n✖ Not authenticated. Run this command first to authenticate:",
          ),
        );
        console.error(chalk.cyan("  calendar-whisperer events\n"));
        process.exit(1);
      }

      console.log(chalk.green("✔ Authentication found\n"));

      // Start web server
      const { cleanup, url } = await startWebServer(
        port,
        config.cacheDirectory,
      );

      // Open browser
      if (options.open) {
        console.log(`\n${chalk.blue("Opening browser...")}`);
        await open(url);
        console.log(chalk.green(`✔ Browser opened at ${url}\n`));
      } else {
        console.log(chalk.blue(`\n→ Visit: ${url}\n`));
      }

      console.log(chalk.dim("Press Ctrl+C to stop the server\n"));

      // Handle shutdown signals
      let isShuttingDown = false;
      async function handleShutdown(signal: string): Promise<void> {
        if (isShuttingDown) return;
        isShuttingDown = true;

        console.log(`\n\nReceived ${signal}, shutting down...`);
        try {
          await cleanup();
          process.exit(0);
        } catch (cleanupError) {
          const errorMessage =
            cleanupError instanceof Error
              ? cleanupError.message
              : "Unknown error";
          console.error("Error during cleanup:", errorMessage);
          process.exit(1);
        }
      }

      process.on("SIGINT", () => {
        void handleShutdown("SIGINT");
      });
      process.on("SIGTERM", () => {
        void handleShutdown("SIGTERM");
      });

      // Keep process alive indefinitely
      // The interval keeps the Node.js event loop active
      // Signal handlers will catch shutdown requests
      setInterval(() => {
        // Empty interval to keep event loop active
      }, 2_147_483_647);
    } catch (error) {
      if (error instanceof Error) {
        console.error(chalk.red("\n✖ Error:"), error.message);
      } else {
        console.error(chalk.red("\n✖ An unexpected error occurred"));
      }
      process.exit(1);
    }
  });

export default webCommand;
