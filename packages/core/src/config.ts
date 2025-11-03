import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

/**
 * Package.json structure for workspace detection
 */
interface PackageJson {
  private?: boolean;
  workspaces?: { packages: Array<string> } | Array<string>;
}

/**
 * Find the monorepo root directory by looking for package.json with workspaces
 */
function findMonorepoRoot(): string {
  let currentDirectory = process.cwd();
  const { root } = path.parse(currentDirectory);

  while (currentDirectory !== root) {
    const packageJsonPath = path.join(currentDirectory, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJsonBuffer = fs.readFileSync(packageJsonPath);
        const packageJson = JSON.parse(
          packageJsonBuffer.toString("utf8"),
        ) as PackageJson;
        // Found workspace root
        if (
          packageJson.workspaces !== undefined ||
          packageJson.private === true
        ) {
          return currentDirectory;
        }
      } catch {
        // Ignore invalid package.json
      }
    }
    currentDirectory = path.dirname(currentDirectory);
  }

  // Fallback to current directory if no monorepo root found
  return process.cwd();
}

/**
 * Load and validate configuration from environment variables.
 * Throws ZodError if validation fails with detailed error messages.
 */
function loadConfig(): Config {
  const rawConfig = configSchema.parse({
    azureClientId: process.env.AZURE_CLIENT_ID,
    azureTenantId: process.env.AZURE_TENANT_ID,
    cacheDirectory: process.env.CACHE_DIRECTORY,
    graphScopes: process.env.GRAPH_SCOPES,
  });

  // Resolve cache directory to absolute path
  return {
    ...rawConfig,
    cacheDirectory: resolveCacheDirectory(rawConfig.cacheDirectory),
  };
}

/**
 * Resolve cache directory to absolute path relative to monorepo root
 */
function resolveCacheDirectory(cacheDirectory: string): string {
  if (path.isAbsolute(cacheDirectory)) {
    return cacheDirectory;
  }

  const monorepoRoot = findMonorepoRoot();
  return path.resolve(monorepoRoot, cacheDirectory);
}

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

export { loadConfig };
