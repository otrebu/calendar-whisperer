import cors from "@fastify/cors";
import Fastify from "fastify";

import type { ServerConfig, ServerResult } from "./types.js";

import registerAuthRoutes from "./routes/auth.js";
import registerCalendarRoutes from "./routes/calendar.js";
import registerHealthRoute from "./routes/health.js";

/**
 * Create Fastify app with routes and middleware
 * Pure function: no side effects
 */
export function createApp(config: ServerConfig) {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
    },
  });

  void app.register(cors, {
    credentials: true,
    origin: config.allowedOrigins,
  });

  registerHealthRoute(app);
  registerAuthRoutes(app, config.cacheDirectory);
  registerCalendarRoutes(app, config.cacheDirectory);

  return app;
}

/**
 * Start server
 * IO function: performs side effect
 */
export async function startServer(config: ServerConfig): Promise<ServerResult> {
  const app = createApp(config);

  try {
    await app.listen({
      host: "127.0.0.1",
      port: config.port,
    });

    return {
      port: config.port,
      url: `http://localhost:${config.port}`,
    };
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "EADDRINUSE"
    ) {
      const message = `Port ${config.port} is already in use. Try a different port with --port flag.`;
      app.log.error(message);
      throw new Error(message);
    }

    app.log.error(error, "Failed to start server");
    throw error;
  }
}

/**
 * Stop server gracefully
 * IO function: performs side effect
 */
export async function stopServer(app: ReturnType<typeof createApp>) {
  await app.close();
}
