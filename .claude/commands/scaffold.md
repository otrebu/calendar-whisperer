# Project Scaffolding Rules

Apply these defaults for all new projects. Only deviate when context makes it clearly unnecessary.

## Core Principles
- **CLI-first**: Use official CLIs with non-interactive flags
- **Type-safe runtime**: Zod for all schemas, configs, and external data
- **Start simple**: Minimal config, add complexity only when needed

## Setup Checklist

### 1. Foundation
```bash
# Always
pnpm init
pnpm add -D typescript @types/node
pnpm add zod
pnpm exec tsc --init --strict
pnpm add -D prettier && echo '{}' > .prettierrc.json
pnpm add -D vitest @vitest/ui
```

### 2. Project Structure
- **Single package**: Default choice
- **Workspaces**: When multiple packages likely (`echo 'packages:\n  - packages/*' > pnpm-workspace.yaml`)

### 3. Build Tools
- **Web**: Vite (`pnpm dlx create-vite@latest app --template react-ts`)
- **Node scripts**: tsx (`pnpm add -D tsx`)

### 4. Essential Config

#### Environment (always with Zod)
```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url().optional(),
});

export const env = envSchema.parse(process.env);
```

#### Path Aliases (always)
```typescript
// tsconfig.json
"paths": { "@/*": ["./src/*"] }

// vite.config.ts (if using Vite)
alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
```

#### package.json Scripts
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

### 5. Libraries (add when needed)

| Purpose | Library | When |
|---------|---------|------|
| **Schemas** | `zod` | **ALWAYS** |
| Environment | `dotenv` | Always |
| CLI parsing | `commander` | Multi-command CLIs |
| CLI UX | `chalk`, `ora` | Interactive terminals |
| Dates | `date-fns` | Date manipulation |
| Database | `prisma` | Schema-first DB |
| Processes | `execa` | Child process control |

## Common Patterns

### Zod Schemas
```typescript
// Config schema
export const configSchema = z.object({
  feature: z.boolean().default(false),
  apiUrl: z.string().url(),
  retries: z.number().min(0).max(10),
});

// User schema with type inference
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'user']),
});

export type User = z.infer<typeof userSchema>;
```

## CLI Commands
```bash
# Examples - always use flags for reproducibility
pnpm dlx create-vite@latest app --template react-ts
pnpm dlx create-next-app@latest app --typescript --use-pnpm
pnpm add -D prisma && pnpm dlx prisma init
```

## Rules
1. **Validate all external data** with Zod (env, APIs, user input)
2. **Derive types** from schemas: `z.infer<typeof schema>`
3. **Use official CLIs** - never hand-craft configs
4. **Document commands** in README for reproducibility
