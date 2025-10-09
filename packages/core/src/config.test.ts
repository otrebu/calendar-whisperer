import { afterEach, beforeEach, describe, expect, test } from "vitest";

import { configSchema, loadConfig } from "./config.js";

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("configSchema", () => {
    test.each([
      {
        case: "with defaults",
        expected: {
          azureClientId: "test-client-id",
          azureTenantId: "test-tenant-id",
          cacheDirectory: ".auth-cache",
          graphScopes: ["https://graph.microsoft.com/.default"],
        },
        input: {
          azureClientId: "test-client-id",
          azureTenantId: "test-tenant-id",
        },
      },
      {
        case: "with custom values",
        expected: {
          azureClientId: "test-client-id",
          azureTenantId: "test-tenant-id",
          cacheDirectory: "/custom/path",
          graphScopes: ["scope1", "scope2"],
        },
        input: {
          azureClientId: "test-client-id",
          azureTenantId: "test-tenant-id",
          cacheDirectory: "/custom/path",
          graphScopes: "scope1,scope2",
        },
      },
    ])("parses valid config: $case", ({ expected, input }) => {
      const result = configSchema.parse(input);
      expect(result).toEqual(expected);
    });

    test.each([
      {
        case: "missing client ID",
        input: { azureTenantId: "test-tenant-id" },
      },
      {
        case: "missing tenant ID",
        input: { azureClientId: "test-client-id" },
      },
      {
        case: "empty client ID",
        input: { azureClientId: "", azureTenantId: "test-tenant-id" },
      },
    ])("rejects invalid config: $case", ({ input }) => {
      expect(() => configSchema.parse(input)).toThrow();
    });
  });

  describe("loadConfig", () => {
    test("loads config from environment variables", () => {
      process.env.AZURE_CLIENT_ID = "env-client-id";
      process.env.AZURE_TENANT_ID = "env-tenant-id";

      const config = loadConfig();

      expect(config.azureClientId).toBe("env-client-id");
      expect(config.azureTenantId).toBe("env-tenant-id");
    });

    test("throws error when required env vars are missing", () => {
      delete process.env.AZURE_CLIENT_ID;
      delete process.env.AZURE_TENANT_ID;

      expect(() => loadConfig()).toThrow();
    });
  });
});
