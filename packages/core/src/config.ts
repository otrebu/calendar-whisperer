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
    workDays: process.env.WORK_DAYS,
    workDaysPerWeek: process.env.WORK_DAYS_PER_WEEK,
    workEndHour: process.env.WORK_END_HOUR,
    workHoursPerWeek: process.env.WORK_HOURS_PER_WEEK,
    workStartHour: process.env.WORK_START_HOUR,
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

const workDaysSchema = z
  .string()
  .default("1,2,3,4,5")
  .transform((s) =>
    s.split(",").map((day) => {
      const parsed = Number.parseInt(day.trim(), 10);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 6) {
        throw new Error(
          `Invalid work day: ${day}. Must be between 0 (Sunday) and 6 (Saturday)`,
        );
      }
      return parsed;
    }),
  );

const workHourSchema = z.coerce
  .number()
  .min(0, "Hour must be >= 0")
  .max(24, "Hour must be <= 24");

export const configSchema = z
  .object({
    azureClientId: z.string().min(1, "Azure Client ID is required"),
    azureTenantId: z.string().min(1, "Azure Tenant ID is required"),
    cacheDirectory: z.string().default(".auth-cache"),
    graphScopes: z
      .string()
      .default("https://graph.microsoft.com/.default")
      .transform((s) => s.split(",")),
    workDays: workDaysSchema,
    workDaysPerWeek: z.coerce.number().default(5),
    workEndHour: workHourSchema.default(17),
    workHoursPerWeek: z.coerce.number().default(40),
    workStartHour: workHourSchema.default(9),
  })
  .transform((data) => ({
    azureClientId: data.azureClientId,
    azureTenantId: data.azureTenantId,
    cacheDirectory: data.cacheDirectory,
    graphScopes: data.graphScopes,
    work: {
      daysPerWeek: data.workDaysPerWeek,
      endHour: data.workEndHour,
      hoursPerWeek: data.workHoursPerWeek,
      startHour: data.workStartHour,
      workDays: data.workDays,
    },
  }))
  .refine((data) => data.work.startHour < data.work.endHour, {
    message: "Work start hour must be less than end hour",
    path: ["workStartHour"],
  });

export type Config = z.infer<typeof configSchema>;

export { loadConfig };
