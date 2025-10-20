import { type ChildProcess, spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";
import { setTimeout as setTimeoutPromise } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { createSpinner } from "../ui/spinner.js";

/**
 * Server state (discriminated union)
 */
type ServerState =
  | { error: Error; status: "failed" }
  | {
      port: number;
      process: ChildProcess;
      status: "running";
      url: string;
    }
  | { port: number; status: "starting" }
  | { status: "idle" };

/**
 * IO: Check if server is healthy
 */
async function checkHealth(url: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * IO: Kill server process
 */
async function killServerProcess(serverProcess: ChildProcess): Promise<void> {
  // Kill process
  serverProcess.kill("SIGTERM");

  // Wait for exit event or timeout
  const exitPromise = once(serverProcess, "exit");
  const timeoutPromise = killWithTimeout(serverProcess);

  await Promise.race([exitPromise, timeoutPromise]);
}

/**
 * IO: Kill server process with timeout fallback
 */
async function killWithTimeout(serverProcess: ChildProcess): Promise<void> {
  await setTimeoutPromise(5000);
  if (!serverProcess.killed) {
    serverProcess.kill("SIGKILL");
  }
}

/**
 * IO: Launch server process
 */
function launchServerProcess(
  port: number,
  cacheDirectory: string,
): ChildProcess {
  const dirname = fileURLToPath(new URL(".", import.meta.url));
  const serverPath = resolve(dirname, "../../../server/dist/index.js");

  const serverProcess = spawn("node", [serverPath], {
    detached: false,
    env: {
      ...process.env,
      CACHE_DIRECTORY: cacheDirectory,
      PORT: String(port),
    },
    stdio: ["ignore", "ignore", "ignore"],
  });

  return serverProcess;
}

/**
 * IO: Sleep for a given duration
 */
async function sleep(ms: number): Promise<void> {
  await setTimeoutPromise(ms);
}

/**
 * Pure: transition to starting state
 */
function startTransition(state: ServerState, port: number): ServerState {
  if (state.status !== "idle") {
    throw new Error(`Cannot start from ${state.status} state`);
  }
  return { port, status: "starting" };
}

/**
 * Main: compose pure + IO functions
 * Returns URL and cleanup function
 */
async function startWebServer(
  port: number,
  cacheDirectory: string,
): Promise<{
  cleanup: () => Promise<void>;
  url: string;
}> {
  let state: ServerState = { status: "idle" };

  // Transition to starting
  state = startTransition(state, port);

  const spinner = createSpinner(`Starting server on port ${port}...`);
  spinner.start();

  try {
    // Launch server process
    const serverProcess = launchServerProcess(port, cacheDirectory);

    // Transition to running (inline to avoid undefined error)
    if (state.status !== "starting") {
      throw new Error("Invalid transition to running");
    }
    state = {
      port: state.port,
      process: serverProcess,
      status: "running",
      url: `http://localhost:${state.port}`,
    };

    // Now TypeScript knows state is running
    const runningState = state;

    // Wait for health check
    await waitForHealth(runningState.url, {
      intervalMs: 500,
      timeoutMs: 10_000,
    });

    spinner.succeed(`Server running at ${runningState.url}`);

    // Return cleanup function
    return {
      cleanup: async () => {
        spinner.start("Stopping server...");
        await killServerProcess(runningState.process);
        spinner.succeed("Server stopped");
      },
      url: runningState.url,
    };
  } catch (error) {
    spinner.fail("Failed to start server");
    // Transition to failed (inline to avoid undefined error)
    state = {
      error: error as Error,
      status: "failed",
    };
    throw error;
  }
}

/**
 * IO: Wait for server health check with retries
 */
async function waitForHealth(
  url: string,
  options: { intervalMs: number; timeoutMs: number },
): Promise<void> {
  const startTime = Date.now();
  const endTime = startTime + options.timeoutMs;

  // Poll health check until success or timeout
  async function pollHealth(): Promise<boolean> {
    if (Date.now() >= endTime) {
      return false;
    }

    const isHealthy = await checkHealth(url);
    if (isHealthy) {
      return true;
    }

    await sleep(options.intervalMs);
    return pollHealth();
  }

  const isSuccessful = await pollHealth();

  if (!isSuccessful) {
    throw new Error("Server health check timeout");
  }
}

export default startWebServer;
