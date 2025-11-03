# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Calendar Whisperer analyzes Microsoft Graph calendar data to provide insights on meeting time vs. focus work. Monorepo with CLI and web interfaces sharing core authentication and Graph API logic.

## Development Commands

```bash
# Development
pnpm dev                 # Run CLI in dev mode (uses tsx)
pnpm web                 # Run full web version (server + UI)
pnpm dev:server          # Run server only
pnpm dev:web             # Run web UI only

# Build & Test
pnpm build               # Build all packages (TypeScript compilation)
pnpm test                # Run Vitest tests
pnpm test:ui             # Run Vitest with UI
pnpm type-check          # TypeScript type checking across workspace

# Code Quality
pnpm lint                # ESLint (uba-eslint-config)
pnpm lint:fix            # Auto-fix ESLint issues
pnpm format              # Prettier formatting
pnpm format:check        # Check formatting without writing

# Package-specific (use --filter)
pnpm --filter @calendar-whisperer/core build
pnpm --filter @calendar-whisperer/cli dev
```

## Architecture

### Package Structure

**Monorepo with pnpm workspaces**. Four packages:

1. **`@calendar-whisperer/core`** - Shared foundation
   - Azure authentication (device code flow)
   - Token caching with `@azure/identity-cache-persistence`
   - MS Graph client wrapper
   - Zod schemas for validation
   - No UI dependencies

2. **`@calendar-whisperer/cli`** - Terminal interface
   - Commander.js for CLI commands
   - `events` command: fetch calendar events
   - `web` command: launch web UI
   - Uses core for all auth/Graph logic

3. **`@calendar-whisperer/server`** - Fastify API server
   - Local-only (privacy-first)
   - Serves web UI + API endpoints
   - Reuses core auth credential

4. **`@calendar-whisperer/web`** - React frontend
   - Vite + React + Tailwind v4
   - TanStack Query for data fetching
   - Consumes server API

### Authentication Flow

**Critical**: Uses Azure device code flow with persistent caching.

1. First run: `DeviceCodeCredential` shows device code prompt
2. User authenticates in browser
3. **Authentication record** (not token) saved to `.auth-cache/auth-record.json`
4. **Token** cached by Azure SDK (via `tokenCachePersistenceOptions`)
5. Subsequent runs: Silent auth using cached auth record + token
6. Token auto-refreshes via Azure SDK

**Implementation details**:

- `core/src/auth.ts`: `createDeviceCodeCredential()` with `disableAutomaticAuthentication: true` forces silent auth first
- `loadAuthenticationRecord()` / `storeAuthenticationRecord()` manage auth record persistence
- Token cache handled entirely by Azure SDK (not manually stored)
- Both CLI and web share same `.auth-cache` directory

### MS Graph Integration

**Core pattern** (`core/src/graph-client.ts`):

1. `createGraphClient(accessToken)` - creates authenticated Graph client
2. `fetchCalendarEvents()` - generic date range query
3. `fetchEventsForDate()` - convenience wrapper for single day

**Calendar API**:

- Uses `/me/calendar/calendarView` endpoint
- Requires `Calendars.Read` permission
- Returns events sorted by start time
- All responses validated with Zod schemas

### Shared vs. Package-Specific Code

**Keep core package UI-agnostic**:

- No CLI formatting (boxen, chalk, ora) in core
- No web framework dependencies in core
- Core exports: auth functions, Graph client, types/schemas
- UI packages (cli, web) import from core, never vice versa

**When adding features**:

1. Add business logic to `core`
2. Add CLI command to `cli/src/commands/`
3. Add API endpoint to `server/src/routes/`
4. Add React component to `web/src/components/`

## Testing

**Vitest** configuration at root (`vitest.config.ts`):

- Tests in `packages/**/*.test.ts`
- Environment: node
- Coverage: v8 provider

**Test patterns**:

- `core/src/auth.test.ts` - uses mocks for Azure SDK
- `core/src/config.test.ts` - validates Zod schemas
- Integration tests mock MS Graph responses

## Configuration

**Environment variables** (`.env`):

```env
AZURE_CLIENT_ID=<required>
AZURE_TENANT_ID=<required>
GRAPH_SCOPES=https://graph.microsoft.com/.default
CACHE_DIRECTORY=.auth-cache
```

Validated in `core/src/config.ts` with Zod.

## TypeScript Setup

- Root `tsconfig.base.json` - shared config
- Each package has own `tsconfig.json` extending base
- Strict mode enabled
- Composite project references for faster builds
- ES modules (`"type": "module"` in all package.json)

## Git Workflow

**Conventional Commits** enforced via Husky + Commitlint:

- `feat:` - new feature
- `fix:` - bug fix
- `docs:` - documentation
- `chore:` - maintenance

**Semantic Release** configured for automated versioning.

## Common Patterns

### Adding a new CLI command

1. Create `packages/cli/src/commands/<name>.ts`
2. Use `createDeviceCodeCredential()` + `getAccessToken()` from core
3. Create Graph client with `createGraphClient()`
4. Use boxen/chalk/ora for terminal UI
5. Register in `packages/cli/src/index.ts`

### Adding a new API endpoint

1. Create route in `packages/server/src/routes/<name>.ts`
2. Import auth/Graph functions from core
3. Return JSON responses
4. Register in `packages/server/src/server.ts`

### Extending Graph data fetching

1. Add new function to `core/src/graph-client.ts`
2. Define Zod schema in `core/src/types.ts`
3. Validate API response with schema
4. Export type from schema

## Azure AD Permissions

Current scopes:

- `Calendars.Read` - read calendar events
- `User.Read` - basic profile info

To add permissions:

1. Update in Azure Portal app registration
2. Grant admin consent if required
3. Update `GRAPH_SCOPES` in `.env.example`
4. Clear auth cache: `rm -rf .auth-cache`
