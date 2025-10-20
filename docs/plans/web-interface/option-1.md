# Option 1: Cloud SPA with TanStack Query

**Approach:** Modern single-page application deployed to cloud with standard OAuth redirect flow

**Diversity Constraint:** Modern stack - Latest patterns/tools (may require new dependencies)

---

## Summary

Build a standard React SPA using Vite, deploy to Vercel/Netlify, authenticate with MSAL browser using authorization code + PKCE flow. Use TanStack Query for data fetching from Microsoft Graph API via the shared core package. This is the most straightforward, battle-tested approach for modern web applications.

---

## Key Architectural Decisions

### 1. Package Structure

```
packages/
├── core/              # Existing - no changes needed
│   └── src/
│       ├── graph-client.ts    # Reused by web
│       ├── types.ts           # Reused by web
│       └── config.ts          # Schema reused
├── cli/               # Existing - no changes needed
└── web/               # NEW
    ├── src/
    │   ├── auth/
    │   │   ├── msalConfig.ts
    │   │   ├── authContext.tsx
    │   │   └── useAuth.ts
    │   ├── components/
    │   │   ├── Calendar.tsx
    │   │   ├── EventList.tsx
    │   │   ├── Header.tsx
    │   │   └── DatePicker.tsx
    │   ├── hooks/
    │   │   ├── useCalendarEvents.ts
    │   │   └── useGraphClient.ts
    │   ├── lib/
    │   │   └── graphClient.ts    # Web adapter for core
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── style.css
    ├── public/
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── .env.example
```

### 2. Authentication Flow

**Authorization Code + PKCE (Proof Key for Code Exchange)**

```typescript
// packages/web/src/auth/msalConfig.ts
import { Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage", // More secure, no cross-tab SSO
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["https://graph.microsoft.com/.default"],
};
```

**Flow:**

1. User clicks "Sign in with Microsoft"
2. Redirect to Azure AD login page
3. User authenticates
4. Azure redirects back with authorization code
5. MSAL exchanges code for access token using PKCE
6. Token stored in sessionStorage
7. Token automatically refreshed by MSAL

**Why PKCE?**

- Industry standard for SPAs (2025)
- No client secret needed (secure for public clients)
- Protection against authorization code interception
- Recommended by Microsoft for browser-based apps

### 3. Deployment Model

**Target:** Vercel (primary) or Netlify (alternative)

**Why Vercel?**

- Zero-config deployment for Vite + React
- Automatic HTTPS
- Global CDN
- Preview deployments for PRs
- Free tier sufficient for personal/small team use

**Build Output:**

```bash
pnpm build:web
# → packages/web/dist/
#    ├── index.html
#    ├── assets/
#    │   ├── index-[hash].js
#    │   └── index-[hash].css
#    └── favicon.ico
```

**Environment Variables (Vercel):**

```env
VITE_AZURE_CLIENT_ID=xxx
VITE_AZURE_TENANT_ID=xxx
```

### 4. State Management Approach

**Data Fetching:** TanStack Query (React Query)
**Auth State:** React Context (provided by @azure/msal-react)
**UI State:** React hooks (useState, useReducer)

**Why TanStack Query?**

- Automatic caching and deduplication
- Background refetching
- Optimistic updates
- Error retry logic
- Stale-while-revalidate pattern
- Excellent TypeScript support
- Aligns with FP principles

**Example:**

```typescript
// packages/web/src/hooks/useCalendarEvents.ts
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/useAuth";
import { fetchWebEventsForDate } from "@/lib/graphClient";
import type { CalendarEvent } from "@calendar-whisperer/core";

export function useCalendarEvents(date: Date, timeZone = "UTC") {
  const { getAccessToken } = useAuth();

  return useQuery<Array<CalendarEvent>>({
    queryKey: ["calendar-events", date.toISOString(), timeZone],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchWebEventsForDate(token, date, timeZone);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
}
```

**No XState Initially:**

- Start simple with React hooks
- Add XState later if complex state machines emerge
- Calendar data fetching doesn't require state machines

---

## Implementation Phases

### Phase 1: Setup and Authentication (4 days)

**Day 1: Web Package Scaffold**

- [ ] Create `packages/web/` directory
- [ ] Initialize package.json with dependencies
- [ ] Setup tsconfig.json extending base config
- [ ] Configure Vite with React plugin and Tailwind
- [ ] Create basic index.html and main.tsx
- [ ] Add web package reference to root tsconfig.json
- [ ] Install dependencies: `pnpm install`
- [ ] Test dev server: `pnpm dev:web`

**Day 2-3: MSAL Authentication**

- [ ] Install MSAL packages
- [ ] Create msalConfig.ts with PKCE configuration
- [ ] Update Azure App Registration with redirect URIs
- [ ] Create .env.example and .env (gitignored)
- [ ] Wrap App with MsalProvider in main.tsx
- [ ] Create useAuth hook with login/logout/getAccessToken
- [ ] Create AuthGuard component for protected routes
- [ ] Test login/logout flow
- [ ] Test token acquisition for Graph API

**Day 4: Core Package Integration**

- [ ] Import types from core
- [ ] Import createGraphClient from core
- [ ] Import fetchEventsForDate from core
- [ ] Create web adapter: useGraphClient hook
- [ ] Test Graph API calls with authenticated user
- [ ] Verify types work correctly in web context

**Deliverables:**

- ✅ Working authentication flow
- ✅ Core package integrated
- ✅ Graph API calls functional

### Phase 2: UI Components and Data Fetching (5 days)

**Day 5-6: TanStack Query Setup**

- [ ] Install TanStack Query
- [ ] Create QueryClient configuration
- [ ] Wrap App with QueryClientProvider
- [ ] Create useCalendarEvents hook
- [ ] Test data fetching and caching
- [ ] Add React Query DevTools (dev only)

**Day 7-8: Calendar Components**

- [ ] Create Header component (user info, sign out button)
- [ ] Create DatePicker component (select date to view)
- [ ] Create EventList component (display events)
- [ ] Create EventCard component (individual event details)
- [ ] Add loading states (skeletons)
- [ ] Add error handling UI
- [ ] Add empty state (no events)

**Day 9: App Integration**

- [ ] Create main App.tsx with routing logic
- [ ] Integrate all components
- [ ] Add timezone selector (optional)
- [ ] Test all user flows
- [ ] Fix bugs and edge cases

**Deliverables:**

- ✅ Functional calendar UI
- ✅ Event list with details
- ✅ Loading and error states
- ✅ Date navigation

### Phase 3: Styling and Polish (3 days)

**Day 10: Tailwind Styling**

- [ ] Design system tokens (colors, spacing, typography)
- [ ] Style Header component
- [ ] Style Calendar/EventList components
- [ ] Style authentication screens
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Dark mode support (optional)

**Day 11: UX Enhancements**

- [ ] Add transitions and animations
- [ ] Improve loading indicators
- [ ] Better error messages
- [ ] Accessibility improvements (ARIA labels, keyboard nav)
- [ ] Focus management
- [ ] Screen reader testing

**Day 12: Testing**

- [ ] Write component tests (React Testing Library)
- [ ] Write hook tests (useAuth, useCalendarEvents)
- [ ] Test authentication flows
- [ ] Test data fetching scenarios
- [ ] Test error handling
- [ ] Manual testing across browsers

**Deliverables:**

- ✅ Polished UI
- ✅ Responsive design
- ✅ Comprehensive tests
- ✅ Accessibility compliant

### Phase 4: Deployment and Documentation (2 days)

**Day 13: Deployment Setup**

- [ ] Test production build locally
- [ ] Create Vercel project
- [ ] Configure environment variables in Vercel
- [ ] Update Azure redirect URIs for production domain
- [ ] Deploy to Vercel
- [ ] Test authentication in production
- [ ] Setup custom domain (optional)

**Day 14: Documentation**

- [ ] Update README with web interface section
- [ ] Document web-specific scripts
- [ ] Add web authentication setup guide
- [ ] Document Azure App Registration for web
- [ ] Add troubleshooting section
- [ ] Create user guide (optional)
- [ ] Update contributing guide

**Deliverables:**

- ✅ Production deployment
- ✅ Comprehensive documentation
- ✅ User onboarding guide

---

## Trade-offs

### Pros

✅ **Standard Patterns:** Well-documented, battle-tested approach
✅ **Low Complexity:** Straightforward architecture, easy to understand
✅ **Fast Development:** 2-3 weeks to production-ready application
✅ **Low Maintenance:** Minimal moving parts, standard web patterns
✅ **Scalable:** Easy to add features incrementally
✅ **Great UX:** Familiar OAuth redirect flow, fast page loads
✅ **Free Deployment:** Vercel free tier is generous
✅ **FP-Friendly:** TanStack Query and React hooks align with functional style
✅ **DRY:** Maximizes code reuse from core package
✅ **TypeScript:** Full type safety from core to UI
✅ **Testing:** Easy to test with standard tools
✅ **Community Support:** Extensive documentation and examples

### Cons

❌ **No Offline Support:** Requires internet connection (can add PWA later)
❌ **Separate Auth:** CLI and web have separate authentication sessions
❌ **Cloud Dependency:** Relies on Vercel/Netlify availability
❌ **Browser-Only:** Not accessible from terminal (by design)
❌ **New Dependencies:** Adds MSAL and TanStack Query (but both are solid)

---

## Best Suited For

### Team Profile

- **Size:** Solo developer or small team (2-3 people)
- **Skill Level:** Comfortable with React and TypeScript
- **Experience:** Familiar with modern web development patterns

### Timeline Constraints

- **Urgency:** Need working web interface in 2-3 weeks
- **Iteration:** Prefer shipping MVP and iterating based on feedback

### User Requirements

- **Access Pattern:** Users access from web browser primarily
- **Offline:** Not required initially
- **Privacy:** Standard cloud deployment acceptable
- **Authentication:** Comfortable with Microsoft account login

### Technical Context

- **Infrastructure:** Comfortable with cloud deployment
- **Maintenance:** Want low maintenance burden
- **Flexibility:** Want to add features incrementally

---

## Acceptance Criteria

### Must Have (MVP)

1. **Authentication**
   - ✅ User can sign in with Microsoft account
   - ✅ User can sign out
   - ✅ Token automatically refreshes
   - ✅ Clear error messages for auth failures

2. **Calendar Viewing**
   - ✅ User can view events for today
   - ✅ User can select different dates
   - ✅ Events show: subject, time, organizer
   - ✅ Events are sorted chronologically

3. **Performance**
   - ✅ Initial page load < 2 seconds
   - ✅ Navigation between dates < 500ms
   - ✅ No flickering during data fetching

4. **UX**
   - ✅ Responsive design (mobile, tablet, desktop)
   - ✅ Loading states for all async operations
   - ✅ Error handling with user-friendly messages
   - ✅ Empty state when no events

5. **Code Quality**
   - ✅ TypeScript strict mode passes
   - ✅ ESLint passes (no warnings)
   - ✅ All tests pass (>80% coverage)
   - ✅ No console errors in production

### Should Have (Post-MVP)

- ⭕ Timezone selector with persistence
- ⭕ Weekly/monthly views
- ⭕ Event search and filtering
- ⭕ Export to CSV/JSON
- ⭕ Dark mode toggle
- ⭕ Analytics (meeting time, focus time)

### Could Have (Future)

- ⚪ Multi-calendar support
- ⚪ Offline support (PWA)
- ⚪ Notifications
- ⚪ Calendar event creation/editing
- ⚪ Integration with other services

### Won't Have (Out of Scope)

- ⛔ Native mobile apps
- ⛔ Desktop apps (Electron)
- ⛔ Real-time collaboration
- ⛔ Email integration
- ⛔ Video conferencing features

---

## Dependencies

```json
{
  "name": "@calendar-whisperer/web",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --build && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@calendar-whisperer/core": "workspace:*",
    "@azure/msal-browser": "^3.30.0",
    "@azure/msal-react": "^2.2.0",
    "@tanstack/react-query": "^5.62.7",
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
    "@tanstack/react-query-devtools": "^5.62.7",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@vitest/ui": "^2.1.8",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "vitest": "^2.1.8"
  }
}
```

**Total Dependencies:** 7 production + 11 development = 18 total

**Dependency Justification:**

- **@azure/msal-browser, @azure/msal-react:** Industry-standard auth for Microsoft
- **@tanstack/react-query:** Best-in-class data fetching library
- **React, React-DOM:** Standard web framework
- **date-fns:** Already used in core, consistent across packages
- **Vite:** Fast build tool, modern defaults
- **Tailwind CSS:** Utility-first CSS, rapid development
- **Testing Library:** Standard React testing tools

---

## Code Examples

### Core Package Reuse

```typescript
// packages/web/src/lib/graphClient.ts
import {
  createGraphClient,
  fetchEventsForDate,
  type CalendarEvent,
} from "@calendar-whisperer/core";

/**
 * Fetch calendar events for a specific date using shared core logic.
 * This function bridges web auth (MSAL) with core Graph client.
 */
export async function fetchWebEventsForDate(
  accessToken: string,
  date: Date,
  timeZone = "UTC",
): Promise<Array<CalendarEvent>> {
  // Create Graph client using core function
  const client = createGraphClient(accessToken);

  // Fetch events using core function
  return fetchEventsForDate(client, date, timeZone);
}
```

### Authentication Hook

```typescript
// packages/web/src/auth/useAuth.ts
import { useMsal } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { loginRequest } from "./msalConfig";

export function useAuth() {
  const { instance, accounts, inProgress } = useMsal();

  const isAuthenticated = accounts.length > 0;
  const isLoading = inProgress !== InteractionStatus.None;
  const account = accounts[0] ?? null;

  async function login() {
    await instance.loginRedirect(loginRequest);
  }

  async function logout() {
    await instance.logoutRedirect();
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

### Calendar Data Hook

```typescript
// packages/web/src/hooks/useCalendarEvents.ts
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/useAuth";
import { fetchWebEventsForDate } from "@/lib/graphClient";
import type { CalendarEvent } from "@calendar-whisperer/core";

interface UseCalendarEventsOptions {
  date: Date;
  timeZone?: string;
  enabled?: boolean;
}

export function useCalendarEvents(options: UseCalendarEventsOptions) {
  const { date, timeZone = "UTC", enabled = true } = options;
  const { getAccessToken } = useAuth();

  return useQuery<Array<CalendarEvent>>({
    queryKey: ["calendar-events", date.toISOString(), timeZone],
    queryFn: async () => {
      const token = await getAccessToken();
      return fetchWebEventsForDate(token, date, timeZone);
    },
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: 2,
    refetchOnWindowFocus: true,
  });
}
```

### Event List Component

```typescript
// packages/web/src/components/EventList.tsx
import { format } from "date-fns";
import type { CalendarEvent } from "@calendar-whisperer/core";

interface EventListProps {
  events: Array<CalendarEvent>;
}

export function EventList(props: EventListProps) {
  const { events } = props;

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No events for this date</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.map((event) => (
        <EventCard key={event.id} event={event} />
      ))}
    </div>
  );
}

interface EventCardProps {
  event: CalendarEvent;
}

function EventCard(props: EventCardProps) {
  const { event } = props;

  const startTime = format(new Date(event.start.dateTime), "h:mm a");
  const endTime = format(new Date(event.end.dateTime), "h:mm a");

  return (
    <div className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
      <h3 className="font-semibold text-lg mb-1">{event.subject}</h3>
      <p className="text-gray-600 text-sm mb-2">
        {startTime} - {endTime}
      </p>
      {event.organizer && (
        <p className="text-gray-500 text-sm">
          Organized by: {event.organizer.emailAddress.name}
        </p>
      )}
      {event.location?.displayName && (
        <p className="text-gray-500 text-sm">
          Location: {event.location.displayName}
        </p>
      )}
    </div>
  );
}
```

---

## Risk Mitigation

### Risk: MSAL Configuration Errors

**Mitigation:**

- Use official Microsoft documentation
- Test in development before production
- Create detailed setup guide with screenshots
- Provide .env.example with clear instructions

### Risk: Azure Redirect URI Mismatch

**Mitigation:**

- Document exact redirect URIs needed
- Test with both localhost and production URLs
- Add troubleshooting section to docs
- Use environment-based redirect URI configuration

### Risk: Token Expiration During Use

**Mitigation:**

- MSAL handles silent token refresh automatically
- Implement error boundary for auth errors
- Clear error messages guiding user to re-authenticate
- Test token refresh scenarios

### Risk: Graph API Rate Limiting

**Mitigation:**

- TanStack Query caching reduces API calls
- Implement exponential backoff for retries
- Show user-friendly error message
- Consider adding request throttling

### Risk: Browser Compatibility

**Mitigation:**

- Test on Chrome, Firefox, Safari, Edge
- Use Vite's browser targets for polyfills
- Document minimum browser versions
- Progressive enhancement where possible

---

## Success Metrics

### Technical Metrics

- ✅ Build time < 30 seconds
- ✅ Bundle size < 500 KB (gzipped)
- ✅ Lighthouse score > 90
- ✅ Test coverage > 80%
- ✅ Zero TypeScript errors
- ✅ Zero ESLint warnings

### Performance Metrics

- ✅ Time to Interactive (TTI) < 2 seconds
- ✅ First Contentful Paint (FCP) < 1 second
- ✅ Largest Contentful Paint (LCP) < 2.5 seconds
- ✅ Cumulative Layout Shift (CLS) < 0.1

### User Experience Metrics

- ✅ Authentication success rate > 95%
- ✅ Zero critical bugs in first month
- ✅ Positive user feedback
- ✅ Mobile usability score > 90

### Development Metrics

- ✅ Complete within 2-3 weeks
- ✅ All acceptance criteria met
- ✅ Documentation complete
- ✅ Ready for production deployment

---

## Conclusion

Option 1 provides the optimal balance of speed, simplicity, and functionality. It leverages modern web development patterns, maximizes code reuse from the core package, and delivers a polished user experience in 2-3 weeks. The approach aligns well with FP-first coding principles and provides a solid foundation for future enhancements.

**Next Steps:**

1. Get approval for this approach
2. Update Azure App Registration with web redirect URIs
3. Create web package skeleton
4. Begin Phase 1: Setup and Authentication

---

**Generated:** 2025-10-14
**Status:** Ready for Implementation
**Estimated Effort:** 2-3 weeks (14 days)
**Risk Level:** Low
**Recommended:** ⭐ Yes (Primary recommendation)
