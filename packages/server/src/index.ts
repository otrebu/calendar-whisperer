import { loadConfig } from "@calendar-whisperer/core";

import { startServer } from "./server.js";

/**
 * CLI entry point for server
 * Can be run standalone: node dist/index.js --port 3001
 */

// Load config to get resolved cache directory (absolute path from monorepo root)
const coreConfig = loadConfig();

const port = Number(process.env.PORT ?? "3001");

const config = {
  allowedOrigins: ["http://localhost:3000", "http://localhost:3001"],
  cacheDirectory: coreConfig.cacheDirectory,
  port,
};

try {
  const result = await startServer(config);
  process.stdout.write(`Server running at ${result.url}\n`);
} catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : "Unknown error";
  process.stderr.write(`Failed to start server: ${errorMessage}\n`);
  process.exit(1);
}
