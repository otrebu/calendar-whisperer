import type { FastifyReply, FastifyRequest } from "fastify";

/**
 * Error response
 */
export interface ErrorResponse {
  details?: string;
  error: string;
}

/**
 * Calendar events query parameters
 * Date format: YYYY-MM-DD
 */
export interface EventsQuery {
  date: string;
  timeZone?: string;
}

/**
 * Fastify route handler type
 */
export type RouteHandler = (
  request: FastifyRequest,
  reply: FastifyReply,
) => Promise<void>;

/**
 * Server configuration
 */
export interface ServerConfig {
  allowedOrigins: Array<string>;
  cacheDirectory: string;
  port: number;
}

/**
 * Server result after successful start
 */
export interface ServerResult {
  port: number;
  url: string;
}

/**
 * Token response from auth endpoint
 */
export interface TokenResponse {
  accessToken: string;
  expiresOnTimestamp: number;
}
