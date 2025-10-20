# Option 2: Local Web Server (Prisma Studio Pattern)

**Approach:** CLI command launches local web server, browser-based UI connects to local API

**Diversity Constraint:** Minimal dependencies - Use existing tools/libraries in the codebase

---

## Summary

Build a local web server that runs on the user's machine, launched via a CLI command like `calendar-whisperer web`. The web interface connects to this local server via HTTP API. Authentication tokens can be shared between CLI and web through the server. This pattern is inspired by Prisma Studio and provides privacy-first, local-only operation with optional cloud deployment later.

---

## Key Architectural Decisions

### 1. Package Structure

```
packages/
├── core/              # Existing - shared logic
│   └── src/
│       ├── auth.ts           # Device code auth (reused)
│       ├── graph-client.ts   # Graph API wrapper (reused)
│       └── types.ts          # Shared types (reused)
│
├── cli/               # Enhanced - adds 'web' command
│   └── src/
│       ├── commands/
│       │   ├── events.ts     # Existing
│       │   └── web.ts        # NEW - launches server
│       └── index.ts
│
├── server/            # NEW - Local web server
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts       # Token endpoint
│   │   │   ├── calendar.ts   # Calendar API
│   │   │   └── health.ts     # Health check
│   │   ├── services/
│   │   │   └── graphService.ts
│   │   ├── middleware/
│   │   │   └── errorHandler.ts
│   │   ├── config.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
└── web/               # NEW - React frontend
    ├── src/
    │   ├── api/              # Client for local server
    │   │   └── client.ts
    │   ├── components/
    │   │   ├── Calendar.tsx
    │   │   └── EventList.tsx
    │   ├── hooks/
    │   │   └── useCalendarEvents.ts
    │   ├── App.tsx
    │   └── main.tsx
    ├── package.json
    └── vite.config.ts
```

### 2. Authentication Flow

**Hybrid Approach: Device Code (CLI) + MSAL Popup (Web Fallback)**

```typescript
// Flow 1: CLI already authenticated
// 1. User runs: calendar-whisperer web
// 2. CLI checks for cached token (.auth-cache/token.json)
// 3. If found, server starts with token available
// 4. Web requests token from: GET /api/auth/token
// 5. Server returns cached token
// 6. Web uses token for Graph API calls

// Flow 2: CLI not authenticated
// 1. User runs: calendar-whisperer web
// 2. CLI detects no cached token
// 3. CLI prompts device code authentication
// 4. User completes authentication
// 5. Token cached, server starts
// 6. Web connects and gets token

// Flow 3: Web-only authentication (optional)
// 1. Server has no token
// 2. Web detects missing token from server
// 3. Web falls back to MSAL popup authentication
// 4. Web uses its own token (not shared with CLI)
```

**Token Sharing Mechanism:**

```typescript
// packages/server/src/routes/auth.ts
import { loadAuthResult } from "@calendar-whisperer/core";

export function createAuthRouter(cacheDirectory: string) {
  const router = express.Router();

  router.get("/token", async (req, res) => {
    try {
      const authResult = await loadAuthResult(cacheDirectory);
      if (!authResult) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      // Return token (secure over localhost only)
      res.json({ accessToken: authResult.accessToken });
    } catch (error) {
      res.status(500).json({ error: "Failed to load token" });
    }
  });

  return router;
}
```

### 3. Deployment Model

**Local Only (Initial):**

- Server runs on localhost (default port: 3001)
- Web UI served from localhost (dev: 3000, prod: bundled with server)
- Only accessible from user's machine
- CORS configured for localhost only

**Optional Cloud Deployment (Future):**

- Deploy server to cloud (Railway, Fly.io)
- Web UI served by server
- Requires adding authentication layer
- Database for user tokens

**CLI Command:**

```typescript
// packages/cli/src/commands/web.ts
import { Command } from "@commander-js/extra-typings";
import { spawn } from "child_process";
import open from "open";
import ora from "ora";

export const webCommand = new Command("web")
  .description("Launch web interface")
  .option("-p, --port <number>", "Server port", "3001")
  .option("--no-open", "Don't open browser automatically")
  .action(async (options) => {
    const spinner = ora("Starting web server...").start();

    try {
      // Start server process
      const serverProcess = spawn("node", [
        "packages/server/dist/index.js",
        "--port",
        options.port,
      ]);

      serverProcess.stdout.on("data", (data) => {
        spinner.text = data.toString().trim();
      });

      // Wait for server to be ready
      await waitForServer(`http://localhost:${options.port}/health`);

      spinner.succeed("Web server started");

      // Open browser
      if (options.open) {
        await open(`http://localhost:${options.port}`);
        console.log(`Web interface opened at http://localhost:${options.port}`);
      } else {
        console.log(`Visit: http://localhost:${options.port}`);
      }

      // Keep process alive
      await new Promise(() => {}); // Intentionally never resolves
    } catch (error) {
      spinner.fail("Failed to start web server");
      console.error(error);
      process.exit(1);
    }
  });
```

### 4. State Management Approach

**Server State:** TanStack Query (for API calls to local server)
**UI State:** React hooks (useState, useReducer)
**Server Lifecycle:** XState (for managing server start/stop/error states)

**Why XState for Server Lifecycle?**

- Starting server is a complex async flow with multiple states
- Error recovery (port in use, authentication failure)
- User feedback during state transitions
- Natural fit for state machine modeling

```typescript
// packages/cli/src/machines/serverMachine.ts
import { setup, fromPromise } from "xstate";

export const serverMachine = setup({
  types: {
    context: {} as { port: number; serverUrl: string; error: string | null },
    events: {} as
      | { type: "START"; port: number }
      | { type: "STOP" }
      | { type: "RESTART" },
  },
  actors: {
    startServer: fromPromise(async ({ input }: { input: { port: number } }) => {
      // Start server logic
      return { port: input.port, url: `http://localhost:${input.port}` };
    }),
    stopServer: fromPromise(async () => {
      // Stop server logic
    }),
  },
}).createMachine({
  id: "server",
  initial: "idle",
  context: {
    port: 3001,
    serverUrl: "",
    error: null,
  },
  states: {
    idle: {
      on: { START: "starting" },
    },
    starting: {
      invoke: {
        src: "startServer",
        input: ({ context }) => ({ port: context.port }),
        onDone: {
          target: "running",
          actions: assign({
            serverUrl: ({ event }) => event.output.url,
          }),
        },
        onError: {
          target: "failed",
          actions: assign({
            error: ({ event }) => event.error.message,
          }),
        },
      },
    },
    running: {
      on: {
        STOP: "stopping",
        RESTART: "stopping",
      },
    },
    stopping: {
      invoke: {
        src: "stopServer",
        onDone: [
          {
            target: "starting",
            guard: ({ event }) => event.type === "RESTART",
          },
          { target: "idle" },
        ],
      },
    },
    failed: {
      on: {
        START: "starting",
      },
    },
  },
});
```

---

## Implementation Phases

### Phase 1: Server Package (5 days)

**Day 1-2: Server Setup**

- [ ] Create `packages/server/` directory
- [ ] Initialize package.json with dependencies (Express, CORS)
- [ ] Setup tsconfig.json
- [ ] Create basic Express server
- [ ] Add health check endpoint
- [ ] Add CORS configuration (localhost only)
- [ ] Test server starts and responds

**Day 3-4: Authentication API**

- [ ] Create auth router
- [ ] Implement token endpoint (reads from CLI cache)
- [ ] Add token validation
- [ ] Test with cached CLI token
- [ ] Add error handling (no token, expired token)

**Day 5: Calendar API**

- [ ] Create calendar router
- [ ] Implement events endpoint (uses core package)
- [ ] Add request validation
- [ ] Test with authenticated token
- [ ] Add error handling

**Deliverables:**

- ✅ Working local server
- ✅ Auth and calendar APIs functional
- ✅ Integration with core package

### Phase 2: CLI Integration (4 days)

**Day 6-7: Web Command**

- [ ] Add 'web' command to CLI
- [ ] Implement server process spawning
- [ ] Add port configuration
- [ ] Implement health check polling
- [ ] Add browser auto-open
- [ ] Handle process signals (SIGINT, SIGTERM)

**Day 8: Server Lifecycle Management**

- [ ] Create server state machine (XState)
- [ ] Implement state transitions
- [ ] Add error recovery
- [ ] Add user feedback (ora spinners)
- [ ] Test edge cases (port in use, authentication failure)

**Day 9: Testing**

- [ ] Write tests for web command
- [ ] Test server lifecycle
- [ ] Test authentication flow
- [ ] Test error scenarios
- [ ] Manual end-to-end testing

**Deliverables:**

- ✅ CLI web command functional
- ✅ Server lifecycle managed
- ✅ Robust error handling

### Phase 3: Web Frontend (5 days)

**Day 10-11: Web Package Setup**

- [ ] Create `packages/web/` directory
- [ ] Initialize package.json
- [ ] Setup Vite configuration
- [ ] Create API client for local server
- [ ] Setup TanStack Query
- [ ] Create auth context (checks server token)
- [ ] Test API connectivity

**Day 12-13: UI Components**

- [ ] Create Calendar component
- [ ] Create EventList component
- [ ] Create Header component
- [ ] Add loading states
- [ ] Add error handling
- [ ] Style with Tailwind

**Day 14: Integration**

- [ ] Integrate all components
- [ ] Test full flow (CLI → server → web)
- [ ] Fix bugs
- [ ] Polish UX

**Deliverables:**

- ✅ Functional web UI
- ✅ Connected to local server
- ✅ End-to-end flow working

### Phase 4: Testing and Documentation (3 days)

**Day 15: Testing**

- [ ] Server tests
- [ ] CLI command tests
- [ ] Frontend component tests
- [ ] Integration tests
- [ ] Manual testing

**Day 16-17: Documentation**

- [ ] Update README with web command
- [ ] Document server API
- [ ] Add troubleshooting guide
- [ ] Create architecture diagram
- [ ] Document token sharing mechanism

**Deliverables:**

- ✅ Comprehensive tests
- ✅ Complete documentation
- ✅ Ready for use

---

## Trade-offs

### Pros

✅ **Privacy-First:** All data stays on user's machine
✅ **Token Sharing:** CLI and web share authentication seamlessly
✅ **Minimal Cloud Deps:** No external dependencies for MSAL
✅ **Offline-Capable:** Works without internet (once authenticated)
✅ **Familiar Pattern:** Proven by Prisma Studio
✅ **Progressive Enhancement:** Can add cloud deployment later
✅ **Low Cost:** No hosting costs initially
✅ **Full Control:** User controls when/where server runs

### Cons

❌ **Complexity:** More moving parts than cloud SPA
❌ **Port Management:** Potential port conflicts
❌ **CLI Dependency:** Web requires CLI to be installed
❌ **Process Management:** Server lifecycle can be tricky
❌ **CORS Complexity:** Local development CORS issues
❌ **Limited Access:** Only accessible from local machine
❌ **No Native Mobile:** Can't access from phone (unless on same network)
❌ **Testing Burden:** More integration tests needed
❌ **Documentation:** More setup steps for users

---

## Best Suited For

### Team Profile

- **Size:** Small team or solo developer
- **Skill Level:** Comfortable with backend + frontend
- **Experience:** Familiar with Express, process management

### Timeline Constraints

- **Urgency:** Can wait 3-4 weeks for initial version
- **Iteration:** Prefer complete local solution before cloud

### User Requirements

- **Privacy:** Data privacy is critical concern
- **Access Pattern:** Users primarily work from single machine
- **Authentication:** Want seamless auth between CLI and web
- **Offline:** Need to work without internet connection

### Technical Context

- **Infrastructure:** Want to avoid cloud dependencies initially
- **Control:** Want full control over where code runs
- **Flexibility:** May add cloud deployment later

---

## Acceptance Criteria

### Must Have (MVP)

1. **CLI Command**
   - ✅ `calendar-whisperer web` starts server and opens browser
   - ✅ Server starts on configurable port
   - ✅ Graceful shutdown on Ctrl+C
   - ✅ Clear error messages for failures

2. **Token Sharing**
   - ✅ Web uses CLI's cached token
   - ✅ No re-authentication if CLI already authenticated
   - ✅ Clear error if no token available

3. **Calendar API**
   - ✅ Server exposes calendar events endpoint
   - ✅ Web can fetch and display events
   - ✅ API uses core package for Graph calls

4. **Web Interface**
   - ✅ Can view events for any date
   - ✅ Loading and error states
   - ✅ Responsive design

5. **Reliability**
   - ✅ Server handles port conflicts gracefully
   - ✅ Server restarts if crashes
   - ✅ Web reconnects if server restarts

### Should Have (Post-MVP)

- ⭕ Web-only authentication fallback (MSAL popup)
- ⭕ Multiple simultaneous web sessions
- ⭕ Server logs for debugging
- ⭕ Web UI for server status

### Could Have (Future)

- ⚪ Cloud deployment option
- ⚪ WebSocket for real-time updates
- ⚪ LAN access (access from other devices on network)
- ⚪ Server management UI

### Won't Have (Out of Scope)

- ⛔ Native authentication in server (requires OAuth redirect)
- ⛔ Multi-user support
- ⛔ Production-grade security for cloud deployment

---

## Dependencies

### Server Package

```json
{
  "name": "@calendar-whisperer/server",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {
    "@calendar-whisperer/core": "workspace:*",
    "express": "^4.21.2",
    "cors": "^2.8.5",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "supertest": "^7.0.0"
  }
}
```

### Web Package

```json
{
  "name": "@calendar-whisperer/web",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {
    "@calendar-whisperer/core": "workspace:*",
    "@tanstack/react-query": "^5.62.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "@tailwindcss/vite": "^4.0.0",
    "vite": "^6.0.3"
  }
}
```

### CLI Package (Additions)

```json
{
  "dependencies": {
    "xstate": "^5.20.0",
    "open": "^10.1.0"
  }
}
```

**Total New Dependencies:** 10+ across three packages

---

## Risk Mitigation

### Risk: Port Conflicts

**Mitigation:**

- Dynamic port selection if default in use
- Allow user to specify port via flag
- Clear error message with instructions
- Document port requirements

### Risk: Server Process Management

**Mitigation:**

- Use XState for robust state management
- Handle all process signals gracefully
- Auto-restart on crash
- Comprehensive error logging

### Risk: CORS Issues

**Mitigation:**

- Proper CORS configuration for localhost
- Development mode allows all local origins
- Document CORS troubleshooting
- Test with multiple browsers

### Risk: Token Security

**Mitigation:**

- Tokens only served over localhost
- No token persistence in web storage
- Token validation before use
- Document security model

### Risk: User Confusion

**Mitigation:**

- Clear CLI output during server start
- Browser opens automatically
- Visual feedback for all states
- Comprehensive documentation

---

## Success Metrics

### Technical Metrics

- ✅ Server starts in < 3 seconds
- ✅ Web connects to server in < 1 second
- ✅ API response time < 100ms
- ✅ Test coverage > 75%
- ✅ Zero memory leaks

### User Experience Metrics

- ✅ One command to launch (`calendar-whisperer web`)
- ✅ Browser opens automatically
- ✅ No re-authentication needed
- ✅ Graceful error handling

### Reliability Metrics

- ✅ Server uptime > 99%
- ✅ Automatic recovery from crashes
- ✅ No port conflicts
- ✅ Works on macOS, Linux, Windows

---

## Code Examples

### Server API

```typescript
// packages/server/src/index.ts
import express from "express";
import cors from "cors";
import { createAuthRouter } from "./routes/auth";
import { createCalendarRouter } from "./routes/calendar";
import { loadConfig } from "@calendar-whisperer/core";

export async function createServer() {
  const app = express();
  const config = loadConfig();

  // Middleware
  app.use(cors({ origin: "http://localhost:3000" }));
  app.use(express.json());

  // Routes
  app.get("/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", createAuthRouter(config.cacheDirectory));
  app.use("/api/calendar", createCalendarRouter(config.cacheDirectory));

  return app;
}

export async function startServer(port: number) {
  const app = await createServer();

  return new Promise<http.Server>((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      resolve(server);
    });

    server.on("error", reject);
  });
}
```

### Web API Client

```typescript
// packages/web/src/api/client.ts
import type { CalendarEvent } from "@calendar-whisperer/core";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function getToken(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/auth/token`);
  if (!response.ok) {
    throw new Error("Failed to get token from server");
  }
  const data = await response.json();
  return data.accessToken;
}

export async function getCalendarEvents(
  date: Date,
  timeZone = "UTC",
): Promise<Array<CalendarEvent>> {
  const token = await getToken();

  const response = await fetch(
    `${API_BASE_URL}/api/calendar/events?date=${date.toISOString()}&timeZone=${timeZone}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to fetch calendar events");
  }

  return response.json();
}
```

---

## Conclusion

Option 2 provides a privacy-first, local-only solution that seamlessly shares authentication between CLI and web. While more complex than a cloud SPA, it offers unique benefits for users who value data privacy and want a unified experience across CLI and web interfaces. The Prisma Studio pattern has proven successful in the developer tools ecosystem.

**Best for:** Privacy-conscious users, teams that want local-first tooling, gradual migration to web interface

**Not recommended if:** Need quick MVP (Option 1 is faster), want mobile access, prefer cloud deployment

---

**Generated:** 2025-10-14
**Status:** Ready for Implementation
**Estimated Effort:** 3-4 weeks (17 days)
**Risk Level:** Medium
**Recommended:** ⭐ Alternative approach for privacy-focused users
