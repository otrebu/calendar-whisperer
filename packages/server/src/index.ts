import { startServer } from "./server.js";

/**
 * CLI entry point for server
 * Can be run standalone: node dist/index.js --port 3001
 */

const port = Number(process.env.PORT ?? "3001");
const cacheDirectory = process.env.CACHE_DIRECTORY ?? ".auth-cache";

const config = {
  allowedOrigins: ["http://localhost:3000", "http://localhost:3001"],
  cacheDirectory,
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
