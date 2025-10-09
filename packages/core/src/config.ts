import { z } from "zod";

export const configSchema = z.object({
  azureClientId: z.string().min(1, "Azure Client ID is required"),
  azureTenantId: z.string().min(1, "Azure Tenant ID is required"),
  cacheDirectory: z.string().default(".auth-cache"),
  graphScopes: z
    .string()
    .default("https://graph.microsoft.com/.default")
    .transform((s) => s.split(",")),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Load and validate configuration from environment variables.
 * Throws ZodError if validation fails with detailed error messages.
 */
export function loadConfig(): Config {
  return configSchema.parse({
    azureClientId: process.env.AZURE_CLIENT_ID,
    azureTenantId: process.env.AZURE_TENANT_ID,
    cacheDirectory: process.env.CACHE_DIRECTORY,
    graphScopes: process.env.GRAPH_SCOPES,
  });
}
