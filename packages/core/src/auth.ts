import {
  type AuthenticationRecord,
  deserializeAuthenticationRecord,
  DeviceCodeCredential,
  serializeAuthenticationRecord,
  useIdentityPlugin,
} from "@azure/identity";
import { cachePersistencePlugin } from "@azure/identity-cache-persistence";
import fs from "node:fs/promises";
import path from "node:path";

import type { Config } from "./config.js";
import type { AuthenticationRecordData, AuthResult } from "./types.js";

import { authenticationRecordSchema } from "./types.js";

// Register cache persistence plugin once on module load
useIdentityPlugin(cachePersistencePlugin);

export type DeviceCodeCallback = (deviceCodeInfo: {
  message: string;
  userCode: string;
  verificationUri: string;
}) => void;

/**
 * Authenticate using device code flow and return authentication record
 * for future silent authentication.
 *
 * @returns Authentication record that should be persisted to disk, or undefined if auth fails
 */
export async function authenticateWithDeviceCode(
  credential: DeviceCodeCredential,
  scopes: Array<string>,
): Promise<AuthenticationRecord | undefined> {
  return await credential.authenticate(scopes);
}

/**
 * Clear the authentication cache including token and authentication record.
 */
export async function clearAuthCache(cacheDirectory: string): Promise<void> {
  try {
    const tokenPath = path.join(cacheDirectory, "token.json");
    const authRecordPath = path.join(cacheDirectory, "auth-record.json");
    await Promise.allSettled([fs.unlink(tokenPath), fs.unlink(authRecordPath)]);
  } catch {
    // Ignore if files don't exist
  }
}

/**
 * Create a device code credential with filesystem token caching.
 * The credential automatically handles token refresh via the Azure SDK cache.
 *
 * @param config Azure configuration
 * @param onDeviceCode Callback invoked when device code flow starts
 * @param authenticationRecord Optional cached authentication record for silent auth
 */
export function createDeviceCodeCredential(
  config: Config,
  onDeviceCode?: DeviceCodeCallback,
  authenticationRecord?: AuthenticationRecord,
): DeviceCodeCredential {
  return new DeviceCodeCredential({
    authenticationRecord,
    clientId: config.azureClientId,
    // Disable automatic device code prompt when authenticationRecord is provided
    // Forces silent auth first, only prompts if token refresh fails
    disableAutomaticAuthentication: Boolean(authenticationRecord),
    tenantId: config.azureTenantId,
    tokenCachePersistenceOptions: {
      enabled: true,
      name: "calendar-whisperer",
      // Required for headless/CLI environments without OS secure storage
      // WARNING: Tokens stored in plaintext. Acceptable for dev/single-user CLIs
      unsafeAllowUnencryptedStorage: true,
    },
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
 * If credential has authenticationRecord and disableAutomaticAuthentication,
 * this will attempt silent auth first.
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
 * Load cached authentication record from filesystem.
 * Returns null if cache doesn't exist or is invalid.
 *
 * Note: Authentication record contains no sensitive data (no tokens).
 * It only identifies which account to use for silent token refresh.
 */
export async function loadAuthenticationRecord(
  cacheDirectory: string,
): Promise<AuthenticationRecord | null> {
  try {
    const authRecordPath = path.join(cacheDirectory, "auth-record.json");
    const buffer = await fs.readFile(authRecordPath);
    const parsed: unknown = JSON.parse(buffer.toString());
    const validated: AuthenticationRecordData =
      authenticationRecordSchema.parse(parsed);

    // Deserialize back to AuthenticationRecord object
    return deserializeAuthenticationRecord(JSON.stringify(validated));
  } catch {
    return null;
  }
}

/**
 * Store authentication record to filesystem for reuse across sessions.
 * The authentication record contains no sensitive data and can be stored unencrypted.
 */
export async function storeAuthenticationRecord(
  authRecord: AuthenticationRecord,
  cacheDirectory: string,
): Promise<void> {
  await fs.mkdir(cacheDirectory, { recursive: true });
  const authRecordPath = path.join(cacheDirectory, "auth-record.json");

  // Serialize authentication record
  const serialized = serializeAuthenticationRecord(authRecord);
  await fs.writeFile(authRecordPath, serialized, "utf8");
}
