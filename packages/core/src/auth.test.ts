import type { AuthenticationRecord } from "@azure/identity";

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  clearAuthCache,
  loadAuthenticationRecord,
  storeAuthenticationRecord,
} from "./auth.js";

describe("authentication record caching", () => {
  let testCacheDirectory = "";

  beforeEach(async () => {
    testCacheDirectory = path.join(
      os.tmpdir(),
      `auth-record-test-${Date.now()}`,
    );
    await fs.mkdir(testCacheDirectory, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testCacheDirectory, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test("storeAuthenticationRecord creates cache file", async () => {
    const mockAuthRecord: AuthenticationRecord = {
      authority: "https://login.microsoftonline.com/common",
      clientId: "test-client-id",
      homeAccountId: "test-home-account-id",
      tenantId: "test-tenant-id",
      username: "test@example.com",
    };

    await storeAuthenticationRecord(mockAuthRecord, testCacheDirectory);

    const cachePath = path.join(testCacheDirectory, "auth-record.json");
    const isCacheFilePresent = await fs
      .access(cachePath)
      .then(() => true)
      .catch(() => false);

    expect(isCacheFilePresent).toBe(true);
  });

  test("loadAuthenticationRecord returns cached record", async () => {
    const mockAuthRecord: AuthenticationRecord = {
      authority: "https://login.microsoftonline.com/common",
      clientId: "test-client-id",
      homeAccountId: "test-home-account-id",
      tenantId: "test-tenant-id",
      username: "test@example.com",
    };

    await storeAuthenticationRecord(mockAuthRecord, testCacheDirectory);
    const loaded = await loadAuthenticationRecord(testCacheDirectory);

    expect(loaded).toBeTruthy();
    expect(loaded?.username).toBe("test@example.com");
    expect(loaded?.clientId).toBe("test-client-id");
  });

  test("loadAuthenticationRecord returns null when cache doesn't exist", async () => {
    const loaded = await loadAuthenticationRecord(testCacheDirectory);
    expect(loaded).toBeNull();
  });

  test("loadAuthenticationRecord returns null for invalid JSON", async () => {
    const cachePath = path.join(testCacheDirectory, "auth-record.json");
    await fs.writeFile(cachePath, "invalid json", "utf8");

    const loaded = await loadAuthenticationRecord(testCacheDirectory);
    expect(loaded).toBeNull();
  });

  test("clearAuthCache removes auth record file", async () => {
    const mockAuthRecord: AuthenticationRecord = {
      authority: "https://login.microsoftonline.com/common",
      clientId: "test-client-id",
      homeAccountId: "test-home-account-id",
      tenantId: "test-tenant-id",
      username: "test@example.com",
    };

    await storeAuthenticationRecord(mockAuthRecord, testCacheDirectory);
    await clearAuthCache(testCacheDirectory);

    const loadedRecord = await loadAuthenticationRecord(testCacheDirectory);

    expect(loadedRecord).toBeNull();
  });

  test("clearAuthCache doesn't throw when cache doesn't exist", async () => {
    await expect(clearAuthCache(testCacheDirectory)).resolves.not.toThrow();
  });

  test("serialized auth record is valid JSON", async () => {
    const mockAuthRecord: AuthenticationRecord = {
      authority: "https://login.microsoftonline.com/common",
      clientId: "test-client-id",
      homeAccountId: "test-home-account-id",
      tenantId: "test-tenant-id",
      username: "test@example.com",
    };

    await storeAuthenticationRecord(mockAuthRecord, testCacheDirectory);

    const cachePath = path.join(testCacheDirectory, "auth-record.json");
    const buffer = await fs.readFile(cachePath);
    const parsed: unknown = JSON.parse(buffer.toString());

    expect(parsed).toHaveProperty("username", "test@example.com");
    expect(parsed).toHaveProperty("clientId", "test-client-id");
  });
});
