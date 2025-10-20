# Option 4: Hybrid Cloud + Local Deployment

**Approach:** Universal web package that works in both cloud and local modes

**Diversity Constraint:** Incremental migration - Add feature alongside existing code

---

## Summary

Build a single web package that can be deployed to the cloud OR run locally via CLI command. Use a provider pattern to abstract authentication and deployment differences. This approach provides maximum flexibility: users can choose between cloud access (easy, always available) and local access (private, CLI-integrated). The same codebase works in both modes with minimal configuration changes.

---

## Key Architectural Decisions

### 1. Package Structure

```
packages/
├── core/              # Existing - shared logic
│   └── src/
│       ├── auth.ts           # Device code (CLI only)
│       ├── graph-client.ts   # Reused by all
│       └── types.ts          # Reused by all
│
├── cli/               # Enhanced - adds 'web' command
│   └── src/
│       ├── commands/
│       │   ├── events.ts     # Existing
│       │   └── web.ts        # NEW - launches local mode
│       └── index.ts
│
├── server/            # NEW - API for both cloud and local
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts       # Environment-aware auth
│   │   │   └── calendar.ts   # Calendar API
│   │   ├── providers/
│   │   │   ├── authProvider.ts     # Interface
│   │   │   ├── localAuth.ts        # Local CLI token
│   │   │   └── cloudAuth.ts        # Cloud MSAL
│   │   ├── config.ts         # Environment detection
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
└── web/               # NEW - Universal frontend
    ├── src/
    │   ├── providers/
    │   │   ├── authProvider.tsx     # Auth abstraction
    │   │   ├── localAuthProvider.tsx
    │   │   └── cloudAuthProvider.tsx
    │   ├── components/
    │   │   ├── Calendar.tsx
    │   │   ├── EventList.tsx
    │   │   └── DeploymentIndicator.tsx
    │   ├── hooks/
    │   │   └── useCalendarEvents.ts
    │   ├── machines/
    │   │   └── deploymentMachine.ts  # XState for mode switching
    │   ├── App.tsx
    │   └── main.tsx
    ├── .env.local        # Local mode config
    ├── .env.cloud        # Cloud mode config
    └── package.json
```

### 2. Authentication Flow

**Environment-Based Provider Pattern**

```typescript
// packages/web/src/providers/authProvider.tsx
import { createContext, useContext, type ReactNode } from "react";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  account: { name: string; email: string } | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
  mode: "local" | "cloud";
}

export function AuthProvider(props: AuthProviderProps) {
  const { children, mode } = props;

  // Select provider based on mode
  if (mode === "local") {
    return <LocalAuthProvider>{children}</LocalAuthProvider>;
  } else {
    return <CloudAuthProvider>{children}</CloudAuthProvider>;
  }
}
```

**Local Mode: Token from Server**

```typescript
// packages/web/src/providers/localAuthProvider.tsx
export function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch token from local server
    fetch("http://localhost:3001/api/auth/token")
      .then((res) => res.json())
      .then((data) => {
        setToken(data.accessToken);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

  const value: AuthContextValue = {
    isAuthenticated: !!token,
    isLoading,
    account: token ? { name: "Local User", email: "" } : null,
    login: async () => {
      throw new Error("Login not available in local mode");
    },
    logout: async () => {
      setToken(null);
    },
    getAccessToken: async () => {
      if (!token) throw new Error("Not authenticated");
      return token;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

**Cloud Mode: MSAL**

```typescript
// packages/web/src/providers/cloudAuthProvider.tsx
import { MsalProvider, useMsal } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";

const msalInstance = new PublicClientApplication(msalConfig);

export function CloudAuthProvider({ children }: { children: ReactNode }) {
  return (
    <MsalProvider instance={msalInstance}>
      <CloudAuthProviderInner>{children}</CloudAuthProviderInner>
    </MsalProvider>
  );
}

function CloudAuthProviderInner({ children }: { children: ReactNode }) {
  const { instance, accounts, inProgress } = useMsal();

  const value: AuthContextValue = {
    isAuthenticated: accounts.length > 0,
    isLoading: inProgress !== InteractionStatus.None,
    account: accounts[0] ?? null,
    login: async () => {
      await instance.loginRedirect(loginRequest);
    },
    logout: async () => {
      await instance.logoutRedirect();
    },
    getAccessToken: async () => {
      const response = await instance.acquireTokenSilent({
        scopes: ["https://graph.microsoft.com/.default"],
        account: accounts[0],
      });
      return response.accessToken;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

### 3. Deployment Model

**Dual Deployment Strategy**

**Cloud Deployment (Vercel):**

```bash
# .env.cloud
VITE_DEPLOYMENT_MODE=cloud
VITE_AZURE_CLIENT_ID=xxx
VITE_AZURE_TENANT_ID=xxx
VITE_API_URL=https://api.calendar-whisperer.com

# Build for cloud
pnpm build:web:cloud

# Deploy to Vercel
vercel deploy --prod
```

**Local Deployment (CLI):**

```bash
# .env.local
VITE_DEPLOYMENT_MODE=local
VITE_API_URL=http://localhost:3001

# User runs:
calendar-whisperer web

# CLI starts:
# 1. Local server on port 3001
# 2. Vite dev server on port 3000 (or serves built web)
# 3. Opens browser to localhost:3000
```

**Environment Detection:**

```typescript
// packages/web/src/lib/config.ts
export function getDeploymentMode(): "local" | "cloud" {
  return (import.meta.env.VITE_DEPLOYMENT_MODE as "local" | "cloud") || "cloud";
}

export function getApiUrl(): string {
  return import.meta.env.VITE_API_URL || "http://localhost:3001";
}
```

### 4. State Management Approach

**XState for Deployment Mode Management**

```typescript
// packages/web/src/machines/deploymentMachine.ts
import { setup, fromPromise } from "xstate";

export const deploymentMachine = setup({
  types: {
    context: {} as {
      mode: "local" | "cloud";
      serverUrl: string;
      serverReachable: boolean;
    },
    events: {} as
      | { type: "DETECT_MODE" }
      | { type: "MODE_DETECTED"; mode: "local" | "cloud" }
      | { type: "SERVER_CHECK_SUCCESS" }
      | { type: "SERVER_CHECK_FAILURE" },
  },
  actors: {
    detectMode: fromPromise(async () => {
      // Try to reach local server
      try {
        const response = await fetch("http://localhost:3001/health", {
          method: "GET",
          signal: AbortSignal.timeout(2000), // 2 second timeout
        });
        if (response.ok) {
          return "local";
        }
      } catch {
        // Local server not reachable
      }
      return "cloud";
    }),
  },
}).createMachine({
  id: "deployment",
  initial: "detecting",
  context: {
    mode: "cloud",
    serverUrl: "",
    serverReachable: false,
  },
  states: {
    detecting: {
      invoke: {
        src: "detectMode",
        onDone: {
          target: "ready",
          actions: assign({
            mode: ({ event }) => event.output,
            serverUrl: ({ event }) =>
              event.output === "local"
                ? "http://localhost:3001"
                : import.meta.env.VITE_API_URL,
          }),
        },
        onError: {
          target: "ready",
          actions: assign({ mode: "cloud" }),
        },
      },
    },
    ready: {
      type: "final",
    },
  },
});
```

**TanStack Query for Data Fetching**

- Environment-aware API base URL
- Same hooks work in both modes
- Automatic retry and caching

---

## Implementation Phases

### Phase 1: Server Package with Provider Pattern (5 days)

**Day 1-2: Server Foundation**

- [ ] Create server package
- [ ] Setup Express with TypeScript
- [ ] Create auth provider interface
- [ ] Implement local auth provider (reads CLI cache)
- [ ] Implement cloud auth provider (validates MSAL tokens)
- [ ] Add environment detection

**Day 3-4: API Routes**

- [ ] Create calendar router
- [ ] Environment-aware token handling
- [ ] Integrate core package
- [ ] Test with both auth providers
- [ ] Add error handling

**Day 5: Testing**

- [ ] Unit tests for providers
- [ ] Integration tests
- [ ] Test mode switching
- [ ] Document server configuration

**Deliverables:**

- ✅ Server works in both modes
- ✅ Auth providers functional
- ✅ API routes tested

### Phase 2: Web Package with Unified Interface (5 days)

**Day 6-7: Provider Abstraction**

- [ ] Create auth provider interface
- [ ] Implement local auth provider (React)
- [ ] Implement cloud auth provider (MSAL)
- [ ] Create deployment mode detection
- [ ] Test provider switching

**Day 8-9: UI Components**

- [ ] Create environment-agnostic components
- [ ] Add deployment mode indicator
- [ ] Build calendar UI
- [ ] Test in both modes

**Day 10: Integration**

- [ ] Wire up providers to components
- [ ] Test full flow in local mode
- [ ] Test full flow in cloud mode
- [ ] Fix mode-specific issues

**Deliverables:**

- ✅ Universal web package
- ✅ Works in both deployment modes
- ✅ Seamless switching

### Phase 3: CLI Integration (4 days)

**Day 11-12: Web Command**

- [ ] Add web command to CLI
- [ ] Start server process
- [ ] Start web dev server OR serve built web
- [ ] Environment configuration
- [ ] Browser auto-open

**Day 13: XState Integration**

- [ ] Create deployment state machine
- [ ] Integrate with CLI command
- [ ] Add user feedback
- [ ] Test state transitions

**Day 14: Testing**

- [ ] Test CLI web command
- [ ] Test local mode end-to-end
- [ ] Test error scenarios
- [ ] Performance testing

**Deliverables:**

- ✅ CLI launches local web UI
- ✅ Robust lifecycle management
- ✅ Error handling

### Phase 4: Cloud Deployment (3 days)

**Day 15: Cloud Configuration**

- [ ] Configure cloud environment variables
- [ ] Setup Azure redirect URIs for cloud domain
- [ ] Test MSAL in cloud environment
- [ ] Configure API URL

**Day 16: Deployment**

- [ ] Build for cloud
- [ ] Deploy server to Railway/Fly.io
- [ ] Deploy web to Vercel
- [ ] Test production deployment

**Day 17: Cross-Mode Testing**

- [ ] Test local mode
- [ ] Test cloud mode
- [ ] Test switching between modes
- [ ] Fix deployment-specific issues

**Deliverables:**

- ✅ Cloud deployment functional
- ✅ Both modes working
- ✅ Production-ready

### Phase 5: Documentation and Polish (3 days)

**Day 18-19: Documentation**

- [ ] Document local mode setup
- [ ] Document cloud mode setup
- [ ] Add deployment guide for both modes
- [ ] Create troubleshooting guide
- [ ] Document provider pattern

**Day 20: Final Testing**

- [ ] End-to-end testing both modes
- [ ] User acceptance testing
- [ ] Performance testing
- [ ] Security review

**Deliverables:**

- ✅ Comprehensive documentation
- ✅ Both modes production-ready
- ✅ User guides complete

---

## Trade-offs

### Pros

✅ **Maximum Flexibility:** Users choose cloud or local
✅ **Progressive Migration:** CLI users can try web without commitment
✅ **Token Sharing:** Local mode reuses CLI authentication
✅ **Future-Proof:** Easy to add more deployment modes
✅ **Code Reuse:** Single web codebase for both modes
✅ **User Choice:** Privacy (local) or convenience (cloud)

### Cons

❌ **Complexity:** Two deployment modes to maintain
❌ **Testing Burden:** 2x test matrix (local and cloud)
❌ **Confusion Risk:** Users may not understand modes
❌ **Abstraction Overhead:** Provider pattern adds indirection
❌ **Development Time:** 5-7 weeks to implement
❌ **Documentation:** More extensive docs needed
❌ **Debugging:** Mode-specific bugs harder to diagnose
❌ **Maintenance:** Two environments to monitor

---

## Best Suited For

### Team Profile

- **Size:** 2-3 developers
- **Skill Level:** Advanced - comfortable with abstraction patterns
- **Experience:** Familiar with multi-environment deployments

### Timeline Constraints

- **Urgency:** Can wait 5-7 weeks for dual-mode solution
- **Iteration:** Building for long-term flexibility

### User Requirements

- **Choice:** Users want to choose deployment mode
- **Privacy:** Some users need local-only
- **Convenience:** Some users prefer cloud access
- **Migration:** Gradual migration from CLI to web

### Technical Context

- **Infrastructure:** Can support both cloud and local
- **Maintenance:** Can maintain dual deployment
- **Flexibility:** Want maximum deployment options

---

## Acceptance Criteria

### Must Have (Both Modes)

1. **Local Mode**
   - ✅ `calendar-whisperer web` starts local server and web UI
   - ✅ Uses CLI cached token
   - ✅ Works offline (after initial auth)
   - ✅ No cloud dependencies

2. **Cloud Mode**
   - ✅ Accessible via public URL
   - ✅ MSAL authentication works
   - ✅ No CLI dependency
   - ✅ Standard web app experience

3. **Unified Experience**
   - ✅ Same UI in both modes
   - ✅ Same features available
   - ✅ Consistent behavior
   - ✅ Mode detection automatic

4. **Code Quality**
   - ✅ Provider pattern well-documented
   - ✅ Tests for both modes
   - ✅ No mode-specific hacks
   - ✅ Clean abstraction boundaries

### Should Have (Post-MVP)

- ⭕ Mode selection UI (let user choose)
- ⭕ Hybrid mode (cloud with local token option)
- ⭕ Analytics per deployment mode
- ⭕ Mode migration tools

### Could Have (Future)

- ⚪ Self-hosted cloud option
- ⚪ Docker deployment
- ⚪ Kubernetes manifests
- ⚪ Additional deployment modes (electron, Tauri)

### Won't Have (Out of Scope)

- ⛔ Native mobile apps
- ⛔ Real-time collaboration
- ⛔ Multi-user in local mode

---

## Dependencies

### Server Package

```json
{
  "dependencies": {
    "@calendar-whisperer/core": "workspace:*",
    "express": "^4.21.2",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "zod": "^3.24.1"
  }
}
```

### Web Package

```json
{
  "dependencies": {
    "@calendar-whisperer/core": "workspace:*",
    "@azure/msal-browser": "^3.30.0",
    "@azure/msal-react": "^2.2.0",
    "@tanstack/react-query": "^5.62.7",
    "xstate": "^5.20.0",
    "@xstate/react": "^5.0.1",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
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

**Total New Dependencies:** 15+ across packages

---

## Risk Mitigation

### Risk: Mode Confusion

**Mitigation:**

- Clear visual indicator of current mode
- Documentation explaining differences
- Onboarding flow explains modes
- Default to most appropriate mode

### Risk: Abstraction Leaks

**Mitigation:**

- Well-defined provider interfaces
- Comprehensive testing of both modes
- Careful API design
- Code reviews focus on abstraction quality

### Risk: Dual Maintenance

**Mitigation:**

- Shared codebase minimizes duplication
- Automated tests for both modes
- CI/CD tests both deployments
- Monitoring for both environments

### Risk: Testing Complexity

**Mitigation:**

- Test matrix covers both modes
- E2E tests for both deployments
- Automated deployment testing
- Staging environments for both modes

---

## Success Metrics

### Adoption Metrics

- ✅ 50% users choose cloud mode
- ✅ 50% users choose local mode
- ✅ Mode satisfaction rating > 8/10

### Technical Metrics

- ✅ Both modes pass all tests
- ✅ Mode switching works 100%
- ✅ No mode-specific critical bugs

### Maintenance Metrics

- ✅ Bug fix applies to both modes
- ✅ Feature parity maintained
- ✅ Documentation kept in sync

---

## Conclusion

Option 4 provides maximum flexibility by supporting both cloud and local deployment modes. While complex, it offers users the choice between convenience (cloud) and privacy (local). The provider pattern ensures code reuse while maintaining clean abstractions. Best suited for teams who want to support both deployment models and can handle the increased maintenance overhead.

**Best for:** Maximum flexibility, gradual CLI-to-web migration, diverse user needs

**Not recommended if:** Need quick MVP, want simple deployment, limited team capacity

---

**Generated:** 2025-10-14
**Status:** Ready for Implementation (Advanced)
**Estimated Effort:** 5-7 weeks (20 days)
**Risk Level:** High
**Recommended:** ⭐ For maximum deployment flexibility
