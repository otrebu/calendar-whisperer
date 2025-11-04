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
          work: {
            daysPerWeek: 5,
            endHour: 17,
            hoursPerWeek: 40,
            startHour: 9,
            workDays: [1, 2, 3, 4, 5],
          },
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
          work: {
            daysPerWeek: 5,
            endHour: 17,
            hoursPerWeek: 40,
            startHour: 9,
            workDays: [1, 2, 3, 4, 5],
          },
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

  describe("work schedule configuration", () => {
    test("parses work config with defaults", () => {
      const input = {
        azureClientId: "test-client-id",
        azureTenantId: "test-tenant-id",
      };

      const result = configSchema.parse(input);

      expect(result.work).toEqual({
        daysPerWeek: 5,
        endHour: 17,
        hoursPerWeek: 40,
        startHour: 9,
        workDays: [1, 2, 3, 4, 5],
      });
    });

    test("parses work config with custom values", () => {
      const input = {
        azureClientId: "test-client-id",
        azureTenantId: "test-tenant-id",
        workDays: "0,6",
        workDaysPerWeek: 2,
        workEndHour: 20,
        workHoursPerWeek: 20,
        workStartHour: 10,
      };

      const result = configSchema.parse(input);

      expect(result.work).toEqual({
        daysPerWeek: 2,
        endHour: 20,
        hoursPerWeek: 20,
        startHour: 10,
        workDays: [0, 6],
      });
    });

    test("parses comma-separated WORK_DAYS string", () => {
      const input = {
        azureClientId: "test-client-id",
        azureTenantId: "test-tenant-id",
        workDays: "2,3,4",
      };

      const result = configSchema.parse(input);

      expect(result.work).toBeDefined();
      expect(result.work.workDays).toEqual([2, 3, 4]);
    });

    test("rejects invalid work days (out of range)", () => {
      const input = {
        azureClientId: "test-client-id",
        azureTenantId: "test-tenant-id",
        workDays: "1,2,7",
      };

      expect(() => configSchema.parse(input)).toThrow();
    });

    test("rejects invalid work days (negative)", () => {
      const input = {
        azureClientId: "test-client-id",
        azureTenantId: "test-tenant-id",
        workDays: "-1,0,1",
      };

      expect(() => configSchema.parse(input)).toThrow();
    });

    test("rejects invalid hour range (start > end)", () => {
      const input = {
        azureClientId: "test-client-id",
        azureTenantId: "test-tenant-id",
        workEndHour: 8,
        workStartHour: 18,
      };

      expect(() => configSchema.parse(input)).toThrow();
    });

    test("rejects hours outside 0-24 range", () => {
      const input = {
        azureClientId: "test-client-id",
        azureTenantId: "test-tenant-id",
        workStartHour: 25,
      };

      expect(() => configSchema.parse(input)).toThrow();
    });

    test("loads work config from environment variables", () => {
      process.env.AZURE_CLIENT_ID = "env-client-id";
      process.env.AZURE_TENANT_ID = "env-tenant-id";
      process.env.WORK_HOURS_PER_WEEK = "37.5";
      process.env.WORK_DAYS_PER_WEEK = "4";
      process.env.WORK_DAYS = "1,2,3,4";
      process.env.WORK_START_HOUR = "8";
      process.env.WORK_END_HOUR = "16";

      const config = loadConfig();

      expect(config.work).toEqual({
        daysPerWeek: 4,
        endHour: 16,
        hoursPerWeek: 37.5,
        startHour: 8,
        workDays: [1, 2, 3, 4],
      });
    });
  });
});
