import type {
  FastifyError,
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";

/**
 * Handle errors with consistent formatting
 */
async function handleError(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  request.log.error(error, "Request error");

  // Zod validation errors
  if (error.validation) {
    await reply.status(400).send({
      details: error.message,
      error: "Validation error",
    });
    return;
  }

  // Other errors
  await reply.status(error.statusCode ?? 500).send({
    error: error.message || "Internal server error",
  });
}

/**
 * Register error handler
 * Formats errors consistently
 */
function registerErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler(handleError);
}

export default registerErrorHandler;
