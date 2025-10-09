# calendar-whisperer

Provide insights about time spent in meetings and focus work. Help realize how much actual working time is available and how much time is left for doing deep work.

A CLI tool for developers and a simple web interface for less technical people.

## What's Included

- 📦 **Monorepo structure** with pnpm workspaces
- 🔐 **Azure AD authentication** with device code flow and token caching
- 📅 **Microsoft Graph integration** to fetch calendar events
- 🖥️ **CLI interface** with beautiful terminal UI (boxen, chalk, ora)
- ✅ **TypeScript strict mode** with comprehensive type safety
- 🧪 **Vitest** for testing (unit + integration)
- 📝 **Zod schemas** for runtime validation
- 🎨 **ESLint** with uba-eslint-config for code quality
- 🪝 **Husky** + **Commitlint** for conventional commits
- 🚀 **Semantic-release** for automated versioning

## Project Structure

```
calendar-whisperer/
├── packages/
│   ├── core/              # Shared: auth, MS Graph client, types
│   └── cli/               # CLI interface with commander
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── .env                   # Your Azure credentials (not committed)
```

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Azure AD app registration with Microsoft Graph permissions

## Azure AD Setup

1. Go to [Azure Portal](https://portal.azure.com/) → Azure Active Directory → App registrations
2. Create a new registration:
   - Name: `calendar-whisperer`
   - Supported account types: "Accounts in any organizational directory and personal Microsoft accounts"
   - Redirect URI: Leave empty (we use device code flow)
3. After creation, note your **Application (client) ID** and **Directory (tenant) ID**
4. Go to "API permissions" → Add a permission → Microsoft Graph → Delegated permissions:
   - Add: `Calendars.Read`, `User.Read`
5. Grant admin consent (if required by your organization)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd calendar-whisperer

# Install dependencies
pnpm install

# Create .env file with your Azure credentials
cp .env.example .env
# Edit .env and add your AZURE_CLIENT_ID and AZURE_TENANT_ID
```

## Configuration

Create a `.env` file in the project root:

```env
AZURE_CLIENT_ID=your-client-id-here
AZURE_TENANT_ID=your-tenant-id-here

# Optional
GRAPH_SCOPES=https://graph.microsoft.com/.default
CACHE_DIRECTORY=.auth-cache
```

## Usage

### CLI

```bash
# Run without building (development)
pnpm dev

# Fetch events for today
pnpm dev events

# Fetch events for a specific date
pnpm dev events 2025-10-15

# Fetch events with custom timezone
pnpm dev events 2025-10-15 --timezone "America/New_York"

# Build and run
pnpm build
node packages/cli/dist/index.js events
```

### First-time Authentication

On first run, you'll see a device code prompt:

```
┌─────────────────────────────────────────┐
│                                         │
│   Authentication Required               │
│                                         │
│   1. Visit: https://microsoft.com/...  │
│   2. Enter code: ABCD-EFGH              │
│                                         │
│   Waiting for you to complete...       │
│                                         │
└─────────────────────────────────────────┘
```

After successful authentication, the token is cached in `.auth-cache/` and reused automatically.

## Development

```bash
# Run tests
pnpm test

# Run tests with UI
pnpm test:ui

# Type check
pnpm type-check

# Lint code
pnpm lint

# Lint and auto-fix
pnpm lint:fix

# Format code
pnpm format

# Format check
pnpm format:check

# Build all packages
pnpm build
```

## Package Scripts

### Root

- `pnpm dev` - Run CLI in development mode
- `pnpm build` - Build all packages
- `pnpm test` - Run tests
- `pnpm type-check` - Type check all packages
- `pnpm lint` - Lint code with ESLint
- `pnpm lint:fix` - Lint and auto-fix issues
- `pnpm format` - Format code with Prettier
- `pnpm format:check` - Check code formatting

### Core Package

- `pnpm --filter @calendar-whisperer/core build` - Build core package
- `pnpm --filter @calendar-whisperer/core dev` - Watch mode

### CLI Package

- `pnpm --filter @calendar-whisperer/cli dev` - Run CLI in dev mode
- `pnpm --filter @calendar-whisperer/cli build` - Build CLI

## Architecture

### Core Package (`@calendar-whisperer/core`)

Provides the foundational functionality:

- **Authentication**: Azure device code flow with automatic token refresh
- **Token Caching**: Filesystem-based cache to avoid repeated auth prompts
- **MS Graph Client**: Wrapper around Microsoft Graph API
- **Types & Schemas**: Zod schemas for runtime validation
- **Configuration**: Environment variable validation

### CLI Package (`@calendar-whisperer/cli`)

Command-line interface built with:

- **Commander**: Command parsing with TypeScript types
- **Chalk**: Colored terminal output
- **Boxen**: Boxed messages for device code display
- **Ora**: Elegant terminal spinners
- **Date-fns**: Date manipulation and formatting

## Current Features

- ✅ Device code authentication with Azure AD
- ✅ Token caching (persists across sessions)
- ✅ Fetch calendar events for any date
- ✅ Beautiful terminal UI
- ✅ Timezone support
- ✅ TypeScript strict mode
- ✅ Unit and integration tests

## Roadmap

- [ ] Meeting analytics (time spent, participants, etc.)
- [ ] Focus time calculation
- [ ] Weekly/monthly summaries
- [ ] Export to CSV/JSON
- [ ] Web interface
- [ ] Multi-account support

## Troubleshooting

### "Failed to acquire access token"

1. Check your `.env` file has correct `AZURE_CLIENT_ID` and `AZURE_TENANT_ID`
2. Verify your Azure app has the required Graph API permissions
3. Clear the cache: `rm -rf .auth-cache` and try again

### "No valid cached token found"

This is normal on first run. Follow the device code prompt to authenticate.

### TypeScript errors

Run `pnpm type-check` to see all type errors. Make sure all packages are built:

```bash
pnpm build
```

## Contributing

1. Create a feature branch from `main`
2. Make your changes with tests
3. Run `pnpm test`, `pnpm type-check`, and `pnpm lint`
4. Update documentation
5. Commit using [Conventional Commits](https://www.conventionalcommits.org/) format:
   - `feat: add new feature`
   - `fix: resolve bug`
   - `docs: update documentation`
   - `chore: update dependencies`
6. Submit a PR

**Note**: Git hooks are configured to enforce conventional commit messages and run tests before commits.

## License

MIT
