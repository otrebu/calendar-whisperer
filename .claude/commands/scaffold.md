# Project Scaffolding Assistant

When starting any new project, follow these defaults. Only deviate when context makes it clearly unnecessary.

## Core Principles
- **CLI-first**: Always use official CLIs/initializers with non-interactive flags
- **Start simple**: Minimal config first, complexity only when needed
- **Document decisions**: Record setup commands and rationale in README

## Setup Checklist

### 1. Foundation
```bash
# Initialize project
pnpm init -y

# TypeScript (always strict)
pnpm add -D typescript @types/node
pnpm exec tsc --init --strict

# Formatting (always Prettier, minimal config)
pnpm add -D prettier
echo '{}' > .prettierrc.json

# Testing (always Vitest)
pnpm add -D vitest @vitest/ui
```

### 2. Project Structure
- **Single package**: Keep it simple if that's enough
- **Multiple packages**: Use pnpm workspaces from the start (easier than migrating later)
  ```bash
  echo 'packages:\n  - packages/*' > pnpm-workspace.yaml
  ```

### 3. Build & Development
- **Web apps/libraries**: Vite (`pnpm dlx create-vite@latest app-name --template react-ts`)
- **Node scripts/CLIs**: tsx (`pnpm add -D tsx`)
- **Other**: Simplest tool that fits the target

### 4. Configuration Standards

#### Path Aliases (always configure)
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}

// vite.config.ts (if using Vite)
resolve: {
  alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
}
```

#### Environment Variables
```bash
pnpm add dotenv
cp .env.example .env  # Always provide example
```

#### Scripts (package.json)
```json
{
  "scripts": {
    "dev": "...",
    "build": "...",
    "test": "vitest",
    "type-check": "tsc --noEmit"
  }
}
```

### 5. Common Libraries (add only when needed)

| Purpose | Library | When to Use |
|---------|---------|-------------|
| Child processes | `execa` | Scripts/CLIs needing process control |
| CLI UX | `chalk`, `ora`, `boxen` | Interactive terminal apps |
| CLI parsing | `commander` | Multi-command CLIs |
| Dates | `date-fns` | Date manipulation (avoid moment.js) |
| Database | `prisma` | Schema-first database workflow |
| State machines | `xstate` | Complex, long-lived state logic |

## CLI Initialization Examples

Always use official CLIs with flags for reproducibility:

```bash
# Vite React app
pnpm dlx create-vite@latest my-app --template react-ts

# Prisma setup
pnpm add -D prisma
pnpm dlx prisma init

# Next.js app
pnpm dlx create-next-app@latest my-app --typescript --tailwind --app --use-pnpm

# Vitest config
pnpm exec vitest init --ui
```

## Documentation Template

Add to README.md:

```markdown
## Setup Commands Used
\```bash
# Exact commands for reproducibility
pnpm init -y
pnpm add -D typescript @types/node
# ... etc
\```

## Architecture Decisions
- **pnpm**: Fast, efficient package management
- **TypeScript strict**: Catch errors at compile time
- **Path aliases**: Cleaner imports, easier refactoring
- **[Other choices]**: [Rationale]
```

## Rules of Thumb
1. **Never hand-edit config files** if a CLI exists
2. **Use `pnpm dlx`** for one-time runners (avoid global installs)
3. **Pin versions** in initialization commands
4. **Fail fast** if official tooling is missing - suggest alternatives
5. **Test immediately** after each setup step to verify configuration
