# Adding Web Interface to CLI Monorepo: Architecture Guide

## Executive Summary

This document outlines a comprehensive strategy for adding a web interface to the calendar-whisperer CLI tool while maintaining DRY principles through shared code in the existing monorepo structure. The recommended approach involves creating a new `packages/web` package that reuses the existing `@calendar-whisperer/core` package for authentication and Microsoft Graph integration, while implementing a web-appropriate OAuth flow.

The architecture leverages modern tooling including React, Vite, Tailwind CSS, and pnpm workspaces. The core package provides reusable business logic (Graph API client, types, configuration), while the web package implements a browser-based authentication flow using Azure MSAL for SPAs. This approach keeps the codebase DRY while respecting the different runtime environments and user experiences of CLI vs web applications.

Key considerations include switching from device code flow (CLI-optimized) to authorization code flow with PKCE (web-optimized), using browser storage instead of filesystem caching, and implementing proper security measures for token management. The architecture supports independent development and deployment of CLI and web packages while sharing core functionality.

## Real-World Examples

### 1. Prisma Studio
**Repository:** https://github.com/prisma/prisma

**Architecture:**
- CLI tool (`prisma`) for database migrations and schema management
- Web GUI (`prisma studio`) served locally at http://localhost:5555
- Shared packages for Prisma Client, schema parsing, and database interactions
- Studio runs as a separate server process launched via CLI command

**Key Takeaways:**
- Local web server approach for non-cloud web interfaces
- CLI can launch and manage web server process
- Shared TypeScript types and database client across CLI and web
- Monorepo structure with multiple packages under `/packages`

### 2. Turborepo + tRPC Examples
**Repository:** https://github.com/vercel/turborepo/tree/main/examples/with-trpc

**Architecture:**
- Monorepo with `apps/` and `packages/` directories
- Shared API layer using tRPC provides type-safe communication
- Web apps (Next.js) and CLI tools share business logic packages
- pnpm workspaces with `workspace:*` protocol for internal dependencies

**Key Takeaways:**
- Clear separation between apps (CLI, web) and packages (shared logic)
- Type safety across boundaries using tRPC or direct TypeScript imports
- Vite for fast web development, tsx/ts-node for CLI
- Independent deployment strategies for different app types

### 3. Nx CLI + Nx Cloud Console
**Repository:** https://github.com/nrwl/nx

**Architecture:**
- CLI tool for monorepo management and task orchestration
- Web dashboard (Nx Cloud) for visualizing build performance and caching
- Shared packages for computation, graph analysis, and project configuration
- CLI can send telemetry/data to web dashboard

**Key Takeaways:**
- CLI and web can operate independently or communicate via APIs
- Web interface provides enhanced visualization of CLI data
- Shared TypeScript packages for core business logic
- Different user experiences optimized for each platform

### 4. Vercel CLI + Vercel Dashboard
**Project:** https://vercel.com (closed source, but documented patterns)

**Architecture:**
- CLI for deployments, environment management, and local development
- Web dashboard for project management, analytics, and team collaboration
- Shared authentication tokens between CLI and web
- REST/GraphQL APIs bridge CLI and web functionality

**Key Takeaways:**
- Single authentication system works across CLI and web
- CLI writes config files that web can read and vice versa
- Web provides richer UX for complex operations, CLI for automation
- APIs provide shared business logic layer

### 5. GitHub CLI + GitHub Web
**Repository:** https://github.com/cli/cli (Go-based, but patterns apply)

**Architecture:**
- CLI for terminal-based workflows and automation
- Web interface for graphical interactions
- Shared GraphQL API layer accessed by both
- OAuth device flow for CLI, redirect flow for web

**Key Takeaways:**
- Different OAuth flows optimized for each platform
- Shared API contracts ensure consistency
- CLI optimized for scriptability, web for discoverability
- Both can accomplish same tasks through different interfaces

## Recommended Architecture

### Folder Structure

```
calendar-whisperer/
├── packages/
│   ├── core/                    # Shared: auth, MS Graph client, types
│   │   ├── src/
│   │   │   ├── auth.ts          # Device code credential (CLI-focused)
│   │   │   ├── graph-client.ts  # MS Graph API wrapper (reusable)
│   │   │   ├── types.ts         # Shared types and schemas (reusable)
│   │   │   ├── config.ts        # Environment config (reusable)
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                     # CLI interface
│   │   ├── src/
│   │   │   ├── commands/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                     # Web interface (NEW)
│       ├── src/
│       │   ├── auth/            # Web-specific MSAL auth
│       │   │   ├── msalConfig.ts
│       │   │   ├── authContext.tsx
│       │   │   └── useAuth.ts
│       │   ├── components/
│       │   │   ├── Calendar.tsx
│       │   │   ├── EventList.tsx
│       │   │   └── Header.tsx
│       │   ├── lib/
│       │   │   └── graphClient.ts    # Web adapter for core
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   └── index.html
│       ├── public/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── tailwind.config.ts
│
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json (root - project references)
├── package.json (root)
├── .env
└── .env.example
```

### Package.json Setup

#### Root package.json additions

```json
{
  "scripts": {
    "dev": "pnpm --filter cli dev",
    "dev:web": "pnpm --filter web dev",
    "dev:all": "pnpm --parallel --filter \"cli\" --filter \"web\" dev",
    "build": "pnpm -r build",
    "build:web": "pnpm --filter web build",
    "preview:web": "pnpm --filter web preview"
  }
}
```

#### packages/web/package.json

```json
{
  "name": "@calendar-whisperer/web",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --build && vite build",
    "preview": "vite preview",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@calendar-whisperer/core": "workspace:*",
    "@azure/msal-browser": "^3.30.0",
    "@azure/msal-react": "^2.2.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "date-fns": "^4.1.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.2",
    "vite": "^6.0.3"
  }
}
```

### Vite Configuration

#### packages/web/vite.config.ts

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
```

### TypeScript Configuration

#### packages/web/tsconfig.json

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "target": "ES2020",
    "noEmit": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*", "vite.config.ts"],
  "references": [{ "path": "../core" }]
}
```

Update root tsconfig.json to include web package:

```json
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/cli" },
    { "path": "./packages/web" }
  ]
}
```

### Tailwind Setup

#### packages/web/src/style.css

```css
@import "tailwindcss";
```

Import this in your main.tsx:

```typescript
import "./style.css";
```

Tailwind v4 requires minimal configuration - it works out of the box with the Vite plugin.

## Code Sharing Strategy

### What to Import from Core

The `@calendar-whisperer/core` package provides these reusable exports:

1. **Graph Client Functions** - FULLY REUSABLE
   - `createGraphClient(accessToken)` - Works in browser
   - `fetchCalendarEvents(client, options)` - Pure function
   - `fetchEventsForDate(client, date, timeZone)` - Pure function

2. **Types and Schemas** - FULLY REUSABLE
   - `CalendarEvent` type
   - `calendarEventSchema` (Zod schema)
   - `AuthResult` type (structure)
   - `authResultSchema` (Zod schema)

3. **Configuration Schema** - PARTIALLY REUSABLE
   - `configSchema` - Can validate web config
   - `Config` type - Structure is useful
   - `loadConfig()` - NOT for web (uses process.env from Node.js)

### What Needs to be Web-Specific

1. **Authentication Flow**
   - CLI uses `DeviceCodeCredential` from `@azure/identity`
   - Web uses `@azure/msal-browser` with authorization code flow + PKCE
   - Reason: Different OAuth flows optimized for each platform

2. **Token Storage**
   - CLI uses filesystem (`fs.promises`, `token.json`)
   - Web uses browser storage (sessionStorage/localStorage) managed by MSAL
   - Reason: Different runtime environments

3. **Configuration Loading**
   - CLI uses `dotenv` and `process.env`
   - Web uses environment variables injected at build time (Vite's `import.meta.env`)
   - Reason: Different build/runtime models

4. **UI Components**
   - CLI uses terminal UI (chalk, boxen, ora)
   - Web uses React components with Tailwind CSS
   - Reason: Completely different display environments

### Example: Using Shared Graph Client in Web

#### packages/web/src/lib/graphClient.ts

```typescript
import { createGraphClient, fetchEventsForDate } from "@calendar-whisperer/core";
import type { CalendarEvent } from "@calendar-whisperer/core";
import { useMsal } from "@azure/msal-react";

/**
 * Hook to get authenticated Graph client for React components.
 */
export function useGraphClient() {
  const { instance, accounts } = useMsal();

  async function getClient() {
    if (accounts.length === 0) {
      throw new Error("No active account. Please sign in.");
    }

    const response = await instance.acquireTokenSilent({
      scopes: ["https://graph.microsoft.com/.default"],
      account: accounts[0],
    });

    // Reuse core package's createGraphClient
    return createGraphClient(response.accessToken);
  }

  return { getClient };
}

/**
 * Fetch events for a date using shared core logic.
 */
export async function fetchWebEventsForDate(
  accessToken: string,
  date: Date,
  timeZone = "UTC",
): Promise<Array<CalendarEvent>> {
  const client = createGraphClient(accessToken);
  // Reuse core package's fetchEventsForDate
  return fetchEventsForDate(client, date, timeZone);
}
```

### DRY Principle in Action

**GOOD - Shared business logic:**
```typescript
// Both CLI and web import from core
import { fetchEventsForDate, createGraphClient } from "@calendar-whisperer/core";
```

**GOOD - Shared types:**
```typescript
// Both CLI and web use the same types
import type { CalendarEvent } from "@calendar-whisperer/core";
```

**BAD - Duplicating Graph API logic:**
```typescript
// DON'T do this in web package - use core instead
async function fetchEvents() {
  const response = await fetch("/me/calendar/calendarView?...");
  // This duplicates logic in core!
}
```

**GOOD - Platform-specific auth wrappers:**
```typescript
// Web-specific auth wraps core Graph client
export function useGraphClient() {
  const { getAccessToken } = useMsal();
  return () => createGraphClient(getAccessToken()); // Reuses core
}
```

## Authentication Strategy

### Comparison: Device Code Flow vs Authorization Code Flow

| Aspect | Device Code Flow (CLI) | Authorization Code + PKCE (Web) |
|--------|----------------------|--------------------------------|
| **User Experience** | Copy code, visit URL in browser | Click login, redirect to Azure, redirect back |
| **Best For** | Headless devices, CLIs, smart TVs | Web apps, SPAs, mobile apps |
| **Security** | Good for CLI, user verifies code | Excellent for web with PKCE extension |
| **Token Storage** | Filesystem with file permissions | Browser storage (sessionStorage recommended) |
| **Azure Endpoint** | Device code authorization endpoint | Standard OAuth2 authorization endpoint |
| **Refresh Tokens** | Supported, cached to file | Supported, managed by MSAL |
| **Library** | `@azure/identity` | `@azure/msal-browser`, `@azure/msal-react` |

### Recommended Approach for Web: Authorization Code + PKCE

**Why PKCE?**
- Industry standard for SPAs as of 2025
- No client secret needed (secure for public clients)
- Protection against authorization code interception
- Recommended by Azure for SPAs

**Why NOT device code flow for web?**
- Poor UX: user has to manually copy/paste code
- Designed for input-constrained devices
- Unnecessary complexity in web environment

### Implementation: Web Authentication

#### 1. Azure App Registration Configuration

Add these redirect URIs to your Azure app:

```
http://localhost:3000
http://localhost:3000/auth/callback
https://yourdomain.com
https://yourdomain.com/auth/callback
```

Enable:
- Authorization code flow with PKCE
- Access tokens and ID tokens for implicit flow (optional for hybrid scenarios)

#### 2. MSAL Configuration

**packages/web/src/auth/msalConfig.ts**

```typescript
import { Configuration, LogLevel } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage", // More secure, but no SSO across tabs
    storeAuthStateInCookie: false, // Set to true for IE11/Edge legacy
  },
  system: {
    loggerOptions: {
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        switch (level) {
          case LogLevel.Error:
            console.error(message);
            return;
          case LogLevel.Info:
            console.info(message);
            return;
          case LogLevel.Verbose:
            console.debug(message);
            return;
          case LogLevel.Warning:
            console.warn(message);
            return;
        }
      },
    },
  },
};

export const loginRequest = {
  scopes: ["https://graph.microsoft.com/.default"],
};
```

**Environment Variables (.env for web)**

Create `packages/web/.env`:

```env
VITE_AZURE_CLIENT_ID=your-client-id-here
VITE_AZURE_TENANT_ID=your-tenant-id-here
```

Note: Vite uses `VITE_` prefix for environment variables exposed to the browser.

#### 3. MSAL React Integration

**packages/web/src/main.tsx**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "./auth/msalConfig";
import App from "./App";
import "./style.css";

const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL
await msalInstance.initialize();

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <MsalProvider instance={msalInstance}>
      <App />
    </MsalProvider>
  </React.StrictMode>,
);
```

#### 4. Authentication Hook

**packages/web/src/auth/useAuth.ts**

```typescript
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { loginRequest } from "./msalConfig";

export function useAuth() {
  const { instance, accounts, inProgress } = useMsal();

  const isAuthenticated = accounts.length > 0;
  const isLoading = inProgress !== InteractionStatus.None;
  const account = accounts[0] ?? null;

  async function login() {
    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  async function logout() {
    try {
      await instance.logoutPopup();
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }

  async function getAccessToken(): Promise<string> {
    if (accounts.length === 0) {
      throw new Error("No active account");
    }

    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });

    return response.accessToken;
  }

  return {
    isAuthenticated,
    isLoading,
    account,
    login,
    logout,
    getAccessToken,
  };
}
```

#### 5. Protected Component Example

**packages/web/src/App.tsx**

```typescript
import { useAuth } from "./auth/useAuth";
import { Calendar } from "./components/Calendar";

export default function App() {
  const { isAuthenticated, isLoading, login, logout, account } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Calendar Whisperer</h1>
          <button
            onClick={login}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Sign in with Microsoft
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Calendar Whisperer</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{account?.name}</span>
            <button
              onClick={logout}
              className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Calendar />
      </main>
    </div>
  );
}
```

### Token Management

#### CLI Token Storage (Current)

```typescript
// packages/core/src/auth.ts (existing)
export async function storeAuthResult(
  authResult: AuthResult,
  cacheDirectory: string,
): Promise<void> {
  await fs.mkdir(cacheDirectory, { recursive: true });
  const cachePath = path.join(cacheDirectory, "token.json");
  await fs.writeFile(cachePath, JSON.stringify(authResult, null, 2), "utf8");
}
```

**Location:** `.auth-cache/token.json` in project root
**Permissions:** File system permissions protect token
**Persistence:** Survives CLI restarts

#### Web Token Storage (MSAL Managed)

```typescript
// MSAL handles storage automatically based on config
cache: {
  cacheLocation: "sessionStorage", // or "localStorage"
}
```

**Location:** Browser sessionStorage or localStorage
**Permissions:** Same-origin policy protects token
**Persistence:**
  - sessionStorage: Only within browser tab, cleared on tab close
  - localStorage: Persists across browser restarts, enables SSO across tabs

**Security Best Practices:**
1. **Use sessionStorage by default** - More secure, no cross-tab SSO needed for most web apps
2. **Switch to localStorage** only if SSO across tabs is critical requirement
3. **Never use localStorage for highly sensitive apps** - Use sessionStorage or memory
4. **Implement CSP headers** - Prevent XSS attacks
5. **HTTPS only in production** - Tokens should never be sent over HTTP

### Comparison: CLI vs Web Authentication

| Aspect | CLI | Web |
|--------|-----|-----|
| **Flow** | Device code | Authorization code + PKCE |
| **Storage** | Filesystem (`token.json`) | Browser storage (sessionStorage) |
| **Library** | `@azure/identity` | `@azure/msal-browser`, `@azure/msal-react` |
| **User Action** | Copy code to browser | Click login, auto-redirect |
| **Token Refresh** | Azure SDK auto-refreshes | MSAL auto-refreshes silently |
| **Shared Code** | `createGraphClient`, `fetchEventsForDate` from core | Same shared code |
| **Platform-Specific** | `DeviceCodeCredential`, filesystem | `PublicClientApplication`, browser storage |

## Development Workflow

### Running Both CLI and Web in Dev Mode

#### Option 1: Separate Terminals (Recommended for Active Development)

```bash
# Terminal 1 - CLI
pnpm dev

# Terminal 2 - Web
pnpm dev:web
```

This allows you to see CLI and web logs separately.

#### Option 2: Parallel (Recommended for Testing)

```bash
# Run both at once
pnpm dev:all
```

Uses pnpm's `--parallel` flag to run both dev servers simultaneously.

### Scripts to Add to Root package.json

```json
{
  "scripts": {
    "dev": "pnpm --filter cli dev",
    "dev:web": "pnpm --filter web dev",
    "dev:all": "pnpm --parallel --filter cli --filter web dev",
    "build": "pnpm -r build",
    "build:web": "pnpm --filter web build",
    "build:cli": "pnpm --filter cli build",
    "preview:web": "pnpm --filter web preview",
    "test": "vitest",
    "test:web": "pnpm --filter web test",
    "type-check": "tsc --build --force",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

### Development Workflow

1. **Start Core Development**
   ```bash
   # Terminal 1: Watch core for changes
   pnpm --filter core dev
   ```

2. **Start Web Development**
   ```bash
   # Terminal 2: Run web dev server
   pnpm dev:web
   ```

3. **Make Changes**
   - Edit files in `packages/core/src/` - both CLI and web will pick up changes
   - Edit files in `packages/web/src/` - hot reload in browser
   - Edit files in `packages/cli/src/` - restart CLI to test

4. **Type Check**
   ```bash
   # Check all packages for type errors
   pnpm type-check
   ```

5. **Test**
   ```bash
   # Run all tests
   pnpm test

   # Run only web tests
   pnpm test:web
   ```

### Project References and Incremental Builds

TypeScript project references enable:
- Faster incremental builds
- Better type checking across packages
- Clear dependency boundaries

When you build web package:
```bash
pnpm --filter web build
```

TypeScript will:
1. Check if core package is built
2. Build core if needed (or if changed)
3. Build web package with type safety from core

### Hot Module Replacement (HMR)

Vite provides instant HMR for web development:

- **React components** - Changes reflect immediately without full reload
- **CSS/Tailwind** - Styles update without refresh
- **TypeScript** - Type errors shown in browser overlay
- **Core package changes** - May require manual refresh (depends on Vite's optimization)

To ensure core changes are picked up by web dev server, use:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    watch: {
      // Also watch core package for changes
      ignored: ["!**/node_modules/@calendar-whisperer/core/**"],
    },
  },
});
```

### Environment Variables

**CLI (.env in root):**
```env
AZURE_CLIENT_ID=xxx
AZURE_TENANT_ID=xxx
GRAPH_SCOPES=https://graph.microsoft.com/.default
CACHE_DIRECTORY=.auth-cache
```

**Web (packages/web/.env):**
```env
VITE_AZURE_CLIENT_ID=xxx
VITE_AZURE_TENANT_ID=xxx
```

Note: Only variables prefixed with `VITE_` are exposed to browser code.

### Debugging

**CLI:**
```bash
# Use Node.js debugger
node --inspect packages/cli/dist/index.js events

# Or use tsx with debugging
tsx --inspect packages/cli/src/index.ts events
```

**Web:**
- Use browser DevTools (Chrome, Firefox, Edge)
- React DevTools extension for component inspection
- Redux DevTools for state management (if using)
- Network tab for Graph API requests
- Console for MSAL authentication logs

## Implementation Checklist

### Phase 1: Setup Web Package Structure

- [ ] Create `packages/web/` directory
- [ ] Initialize package.json with dependencies
- [ ] Create tsconfig.json extending base config
- [ ] Add Vite configuration with React and Tailwind plugins
- [ ] Create basic HTML entry point (index.html)
- [ ] Create main.tsx with React root
- [ ] Add web package reference to root tsconfig.json
- [ ] Update pnpm-workspace.yaml if needed (should auto-detect)
- [ ] Install dependencies: `pnpm install`

### Phase 2: Configure MSAL Authentication

- [ ] Install MSAL packages: `@azure/msal-browser`, `@azure/msal-react`
- [ ] Create msalConfig.ts with app configuration
- [ ] Add redirect URI to Azure App Registration (http://localhost:3000)
- [ ] Create .env file in packages/web/ with VITE_ prefixed variables
- [ ] Add .env to .gitignore (should already be there)
- [ ] Wrap App with MsalProvider in main.tsx
- [ ] Create useAuth hook for authentication logic
- [ ] Test login/logout flow

### Phase 3: Integrate Core Package

- [ ] Import types from core: `CalendarEvent`, `AuthResult`
- [ ] Import Graph client from core: `createGraphClient`
- [ ] Import Graph functions from core: `fetchEventsForDate`
- [ ] Create web adapter functions that bridge MSAL auth with core Graph client
- [ ] Create custom hooks: `useGraphClient`, `useCalendarEvents`
- [ ] Test Graph API calls with authenticated user
- [ ] Verify core package types work in web context

### Phase 4: Build UI Components

- [ ] Create App.tsx with auth routing (signed in/out states)
- [ ] Create Header component with user info and sign out
- [ ] Create Calendar/EventList component showing events
- [ ] Style components with Tailwind CSS
- [ ] Add loading states and error handling
- [ ] Add date picker for selecting different dates
- [ ] Display event details (subject, time, organizer)
- [ ] Test responsive design (mobile, tablet, desktop)

### Phase 5: State Management (Optional - XState)

- [ ] Install XState: `pnpm add xstate @xstate/react`
- [ ] Create calendar state machine (loading, error, success states)
- [ ] Create auth state machine if needed (beyond MSAL's built-in state)
- [ ] Integrate state machines with React components using useActor
- [ ] Test state transitions (loading → success, loading → error)
- [ ] Consider using React Context if state needs to be global

### Phase 6: Testing

- [ ] Add Vitest configuration for web package
- [ ] Write tests for useAuth hook
- [ ] Write tests for Graph client integration
- [ ] Write component tests (React Testing Library)
- [ ] Test authentication flows (mock MSAL)
- [ ] Test error handling (network errors, auth errors)
- [ ] Add test script to package.json
- [ ] Update root test script to run web tests

### Phase 7: Documentation

- [ ] Update README with web interface section
- [ ] Document web-specific scripts (dev:web, build:web)
- [ ] Add web authentication setup instructions
- [ ] Document Azure App Registration configuration for web
- [ ] Add web architecture diagram if helpful
- [ ] Document environment variables for web
- [ ] Add troubleshooting section for web-specific issues

### Phase 8: Build and Deploy

- [ ] Test production build: `pnpm build:web`
- [ ] Test preview: `pnpm preview:web`
- [ ] Configure build output directory (dist/)
- [ ] Add deployment documentation (Vercel, Netlify, Azure Static Web Apps)
- [ ] Update redirect URIs in Azure for production domain
- [ ] Configure environment variables in deployment platform
- [ ] Test authentication in production environment
- [ ] Set up CI/CD for web package (GitHub Actions)

### Phase 9: Optional Enhancements

- [ ] Add analytics/insights calculations (meeting time, focus time)
- [ ] Add weekly/monthly views
- [ ] Add export functionality (CSV, JSON)
- [ ] Add multi-calendar support
- [ ] Add dark mode toggle
- [ ] Add filtering by organizer, subject
- [ ] Add search functionality
- [ ] Add accessibility improvements (ARIA labels, keyboard navigation)

## Open Questions

### 1. Authentication Flow Decision

**Question:** Should the web interface support device code flow in addition to standard redirect flow?

**Context:** CLI uses device code flow. Web would normally use redirect flow (better UX). But if users want a unified experience or to test device flow in browser, we could support both.

**Options:**
- A) Web uses redirect flow only (recommended, best UX)
- B) Web supports both flows with a toggle (adds complexity)
- C) Web uses device code flow only (poor UX, but consistent with CLI)

**Recommendation:** Option A - Use redirect flow for web. Device code flow is optimized for input-constrained devices and provides poor UX in web browsers.

### 2. Token Sharing Between CLI and Web

**Question:** Should CLI and web share the same cached tokens, or maintain separate auth sessions?

**Context:** CLI stores tokens in `.auth-cache/token.json`. Web stores tokens in browser storage. They could potentially share tokens through a local server or file-based communication.

**Options:**
- A) Separate auth sessions (recommended, cleaner separation)
- B) Shared tokens via file system (CLI writes, web reads)
- C) Shared tokens via local API (CLI runs server, web connects)

**Recommendation:** Option A - Keep auth sessions separate. Different OAuth flows, different storage mechanisms, simpler security model. Users can authenticate separately in CLI and web.

### 3. Local vs Cloud Deployment

**Question:** Should the web interface run locally (like Prisma Studio) or be deployed to the cloud?

**Context:** Prisma Studio runs locally. Most web dashboards deploy to cloud. Local has privacy benefits; cloud has accessibility benefits.

**Options:**
- A) Cloud deployment only (e.g., Vercel, Netlify)
- B) Local development server only
- C) Both: local for development, cloud for production
- D) Both: CLI command launches local web server (like `prisma studio`)

**Recommendation:** Option C for now, consider D as enhancement. Start with cloud deployment (easier for non-technical users), support local dev server. Later, could add `calendar-whisperer web` CLI command to launch local server.

### 4. State Management Complexity

**Question:** Do we need XState for state management, or is React state + hooks sufficient?

**Context:** Your coding style preferences mention XState. Web interface will have: auth state (handled by MSAL), calendar data fetching, UI state (date selection, filters).

**Options:**
- A) React state + hooks only (simpler, less setup)
- B) XState for complex async flows (calendar data fetching)
- C) XState + React Context for global state
- D) TanStack Query for data fetching + React state for UI

**Recommendation:** Start with Option A (React state + hooks). Add XState later if state management becomes complex (e.g., multi-step wizards, complex async flows). For calendar data fetching, consider TanStack Query as simpler alternative to XState for this use case.

### 5. Analytics Calculation Location

**Question:** Where should analytics calculations (meeting time, focus time) happen - client or server?

**Context:** Current architecture is client-side only (CLI and web both fetch raw events, calculate locally). Could add backend API for calculations.

**Options:**
- A) Client-side calculations only (current approach)
- B) Add backend API for calculations (more scalable, but adds complexity)
- C) Edge functions for calculations (serverless, scales automatically)

**Recommendation:** Option A for MVP - Keep calculations client-side. Raw event data from Graph API is not large for a single user. Calculations are simple (date math). Move to backend later if performance becomes an issue.

### 6. Multi-User Support

**Question:** Should the web interface support multiple users, or single-user only like CLI?

**Context:** CLI is single-user (local tool). Web could support multiple users with accounts, or remain single-user (each user authenticates with their own Microsoft account).

**Options:**
- A) Single-user only (each user logs in with their own Microsoft account)
- B) Multi-tenant with application database (users, settings, preferences)
- C) Hybrid: Single-user but support multiple Azure accounts per user

**Recommendation:** Option A for MVP - Single-user model. Each user authenticates with their Microsoft account via MSAL. No application database needed. Settings stored in browser localStorage. Move to multi-tenant later if needed (requires backend, database).

### 7. Offline Support

**Question:** Should the web interface work offline, or require internet connection?

**Context:** CLI requires internet to fetch events. Web could cache events for offline viewing.

**Options:**
- A) Online only (requires internet connection)
- B) Offline support with Service Workers and IndexedDB caching
- C) PWA with offline capabilities

**Recommendation:** Option A for MVP - Online only. Graph API requires internet. Offline support adds significant complexity (caching, sync, stale data). Consider as future enhancement if users request it.

### 8. Timezone Handling

**Question:** How should timezones be handled in web interface?

**Context:** CLI accepts `--timezone` flag. Graph API supports timezone headers. Users may be in different timezones than their calendar.

**Options:**
- A) Use browser's local timezone automatically
- B) Allow user to select timezone (dropdown or input)
- C) Detect from user's Graph profile
- D) All of the above with browser timezone as default

**Recommendation:** Option D - Start with browser's local timezone (best default for most users), add timezone selector for edge cases (traveling, managing calendars in other timezones). Store preference in localStorage.

## Sources Consulted

### Web Search Results

1. **Monorepo + pnpm + TypeScript Setup**
   - "Complete Monorepo Guide: pnpm + Workspace + Changesets (2025)" - https://jsdev.space/complete-monorepo-guide/
   - "Setting up a monorepo with pnpm and TypeScript" - https://brockherion.dev/blog/posts/setting-up-a-monorepo-with-pnpm-and-typescript/
   - "How to Bootstrap a Monorepo with PNPM" - https://www.wisp.blog/blog/how-to-bootstrap-a-monorepo-with-pnpm-a-complete-guide

2. **React + Vite + Monorepo**
   - "React Monorepo Setup Tutorial with pnpm and Vite" - https://dev.to/lico/react-monorepo-setup-tutorial-with-pnpm-and-vite-react-project-ui-utils-5705
   - "Setting Up a Monorepo with Vite, TypeScript, and PNPM Workspaces" - https://www.rickyspears.com/technology/setting-up-a-monorepo-with-vite-typescript-and-pnpm-workspaces-a-comprehensive-guide/

3. **Azure Authentication**
   - "OAuth 2.0 device authorization grant" - https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-device-code
   - "Microsoft identity platform and OAuth 2.0 authorization code flow" - https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
   - "How Device Code Flow works in Azure AD" - https://joonasw.net/view/device-code-flow

4. **MSAL Browser + React**
   - "Configure authentication in a sample React SPA by using Azure AD B2C" - https://learn.microsoft.com/en-us/azure/active-directory-b2c/configure-authentication-sample-react-spa-app
   - "MSAL Browser Caching Documentation" - https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/caching.md
   - "Token Storage Best Practices" - GitHub Issue #2384 on microsoft-authentication-library-for-js

5. **Tailwind v4 + Vite**
   - "Configure Tailwind 4 with Vite in an NPM Workspace" - https://nx.dev/blog/setup-tailwind-4-npm-workspace
   - "Sharing your Tailwind Configuration between Monorepo Packages" - https://dev.to/bdbchgg/sharing-your-tailwind-configuration-between-monorepo-packages-4o5k

6. **Real-World Examples**
   - Prisma Studio architecture and monorepo patterns - https://www.prisma.io/docs/guides/use-prisma-in-pnpm-workspaces
   - tRPC examples - https://github.com/trpc/examples-next-prisma-todomvc
   - RealWorld implementation - https://github.com/gutentag2012/realworld-nextjs-trpc-prisma

7. **XState + React**
   - "Global state with XState and React" - https://stately.ai/blog/2024-02-12-xstate-react-global-state
   - "React State Management in 2025" - https://www.developerway.com/posts/react-state-management-2025
   - XState React documentation - https://stately.ai/docs/xstate-react

### Codebase Analysis

- `packages/core/src/auth.ts` - Device code credential implementation, token caching
- `packages/core/src/graph-client.ts` - MS Graph client wrapper, event fetching functions
- `packages/core/src/types.ts` - Shared Zod schemas and TypeScript types
- `packages/core/src/config.ts` - Configuration schema and loading logic
- `packages/core/package.json` - Core dependencies and exports
- `packages/cli/package.json` - CLI dependencies and structure
- Root `tsconfig.base.json` - Base TypeScript configuration
- Root `pnpm-workspace.yaml` - Workspace configuration

## Conclusion

Adding a web interface to the calendar-whisperer CLI tool is straightforward with the existing monorepo structure. The key to success is maintaining clear boundaries between shared business logic (core package) and platform-specific implementations (CLI and web packages).

The core package provides excellent reusability - Graph client functions, types, and schemas work identically in both CLI and web environments. Only authentication flow and storage mechanisms need platform-specific implementations, which is expected and correct.

Following this architecture guide will result in a maintainable, DRY codebase where changes to business logic automatically benefit both CLI and web interfaces, while each interface can optimize its user experience for its platform.

Next steps: Follow the implementation checklist, starting with Phase 1 (setup) and Phase 2 (authentication). Once MSAL authentication works, integrating the core package's Graph client will be trivial, and you can focus on building a great React UI.
