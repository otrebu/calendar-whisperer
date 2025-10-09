import { DeviceCodeCredential } from "@azure/identity";
import fs from "node:fs/promises";
import path from "node:path";

import type { Config } from "./config.js";
import type { AuthResult } from "./types.js";

import { authResultSchema } from "./types.js";

export type DeviceCodeCallback = (deviceCodeInfo: {
  message: string;
  userCode: string;
  verificationUri: string;
}) => void;

/**
 * Clear the authentication cache.
 */
export async function clearAuthCache(cacheDirectory: string): Promise<void> {
  try {
    const cachePath = path.join(cacheDirectory, "token.json");
    await fs.unlink(cachePath);
  } catch {
    // Ignore if file doesn't exist
  }
}

/**
 * Create a device code credential with filesystem token caching.
 * The credential automatically handles token refresh.
 */
export function createDeviceCodeCredential(
  config: Config,
  onDeviceCode?: DeviceCodeCallback,
): DeviceCodeCredential {
  return new DeviceCodeCredential({
    clientId: config.azureClientId,
    tenantId: config.azureTenantId,
    userPromptCallback: (deviceCodeInfo) => {
      if (onDeviceCode) {
        onDeviceCode({
          message: deviceCodeInfo.message,
          userCode: deviceCodeInfo.userCode,
          verificationUri: deviceCodeInfo.verificationUri,
        });
      }
    },
  });
}

/**
 * Get an access token using the device code flow.
 * Token is automatically cached by Azure SDK.
 */
export async function getAccessToken(
  credential: DeviceCodeCredential,
  scopes: Array<string>,
): Promise<AuthResult> {
  const tokenResponse = await credential.getToken(scopes);

  return {
    accessToken: tokenResponse.token,
    expiresOnTimestamp: tokenResponse.expiresOnTimestamp,
  };
}

/**
 * Load cached authentication result from filesystem.
 * Returns null if cache doesn't exist or is invalid.
 */
export async function loadCachedAuthResult(
  cacheDirectory: string,
): Promise<AuthResult | null> {
  try {
    const cachePath = path.join(cacheDirectory, "token.json");
    const buffer = await fs.readFile(cachePath);
    const parsed: unknown = JSON.parse(buffer.toString());
    const validated = authResultSchema.parse(parsed);

    const now = Date.now();
    const bufferMs = 5 * 60 * 1000;
    if (validated.expiresOnTimestamp < now + bufferMs) {
      return null;
    }

    return validated;
  } catch {
    return null;
  }
}

/**
 * Store authentication result to filesystem for reuse across sessions.
 * Note: Azure SDK handles its own token cache, but this provides
 * additional application-level caching if needed.
 */
export async function storeAuthResult(
  authResult: AuthResult,
  cacheDirectory: string,
): Promise<void> {
  await fs.mkdir(cacheDirectory, { recursive: true });
  const cachePath = path.join(cacheDirectory, "token.json");
  await fs.writeFile(cachePath, JSON.stringify(authResult, null, 2), "utf8");
}
