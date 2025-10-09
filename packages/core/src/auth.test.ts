import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  clearAuthCache,
  loadCachedAuthResult,
  storeAuthResult,
} from "./auth.js";
import { type AuthResult } from "./types.js";

describe("auth caching", () => {
  let testCacheDirectory = "";

  beforeEach(async () => {
    testCacheDirectory = path.join(os.tmpdir(), `auth-test-${Date.now()}`);
    await fs.mkdir(testCacheDirectory, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.rm(testCacheDirectory, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  test("storeAuthResult creates cache file", async () => {
    const authResult: AuthResult = {
      accessToken: "test-token",
      expiresOnTimestamp: Date.now() + 3_600_000,
    };

    await storeAuthResult(authResult, testCacheDirectory);

    const cachePath = path.join(testCacheDirectory, "token.json");
    const isCacheFilePresent = await fs
      .access(cachePath)
      .then(() => true)
      .catch(() => false);

    expect(isCacheFilePresent).toBe(true);
  });

  test("loadCachedAuthResult returns cached token", async () => {
    const authResult: AuthResult = {
      accessToken: "test-token",
      expiresOnTimestamp: Date.now() + 3_600_000,
    };

    await storeAuthResult(authResult, testCacheDirectory);
    const loaded = await loadCachedAuthResult(testCacheDirectory);

    expect(loaded).toEqual(authResult);
  });

  test("loadCachedAuthResult returns null for expired token", async () => {
    const authResult: AuthResult = {
      accessToken: "test-token",
      expiresOnTimestamp: Date.now() - 1000,
    };

    await storeAuthResult(authResult, testCacheDirectory);
    const loaded = await loadCachedAuthResult(testCacheDirectory);

    expect(loaded).toBeNull();
  });

  test("loadCachedAuthResult returns null when cache doesn't exist", async () => {
    const loaded = await loadCachedAuthResult(testCacheDirectory);
    expect(loaded).toBeNull();
  });

  test("clearAuthCache removes cache file", async () => {
    const authResult: AuthResult = {
      accessToken: "test-token",
      expiresOnTimestamp: Date.now() + 3_600_000,
    };

    await storeAuthResult(authResult, testCacheDirectory);
    await clearAuthCache(testCacheDirectory);

    const loaded = await loadCachedAuthResult(testCacheDirectory);
    expect(loaded).toBeNull();
  });

  test("clearAuthCache doesn't throw when cache doesn't exist", async () => {
    await expect(clearAuthCache(testCacheDirectory)).resolves.not.toThrow();
  });
});
