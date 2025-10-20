# Option 3: Progressive Web App (PWA)

**Approach:** Offline-first web application with Service Workers, installable as native app

**Diversity Constraint:** Production-grade - Full enterprise solution with all bells and whistles

---

## Summary

Build a Progressive Web App that works offline, caches calendar data locally, and can be installed as a native app on mobile and desktop devices. Use Service Workers for offline support, IndexedDB for data persistence, and Background Sync for updating cached data. This approach provides the best user experience for users who need offline access and want an app-like experience.

---

## Key Architectural Decisions

### 1. Package Structure

```
packages/
├── core/              # Existing - minimal changes
│   └── src/
│       ├── graph-client.ts   # Reused
│       ├── types.ts          # Reused
│       └── config.ts         # Schema reused
│
├── cli/               # Existing - no changes
│
└── web/               # NEW - PWA
    ├── src/
    │   ├── auth/
    │   │   ├── msalConfig.ts
    │   │   ├── authContext.tsx
    │   │   └── useAuth.ts
    │   ├── components/
    │   │   ├── Calendar.tsx
    │   │   ├── EventList.tsx
    │   │   ├── InstallPrompt.tsx
    │   │   └── OfflineIndicator.tsx
    │   ├── db/               # IndexedDB wrapper
    │   │   ├── schema.ts
    │   │   ├── events.ts
    │   │   └── sync.ts
    │   ├── hooks/
    │   │   ├── useCalendarEvents.ts
    │   │   ├── useOfflineStatus.ts
    │   │   └── useInstallPrompt.ts
    │   ├── lib/
    │   │   ├── graphClient.ts
    │   │   └── syncManager.ts
    │   ├── machines/       # XState state machines
    │   │   ├── syncMachine.ts
    │   │   └── offlineMachine.ts
    │   ├── workers/
    │   │   ├── service-worker.ts
    │   │   └── sync-worker.ts
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── style.css
    ├── public/
    │   ├── manifest.json     # PWA manifest
    │   ├── icons/            # App icons (various sizes)
    │   └── offline.html      # Offline fallback page
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── vite-plugin-pwa.config.ts
```

### 2. Authentication Flow

**MSAL with Long-Lived Tokens + Offline Support**

```typescript
// packages/web/src/auth/msalConfig.ts
import { Configuration } from "@azure/msal-browser";

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage", // Persist across sessions for offline
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ["https://graph.microsoft.com/.default", "offline_access"],
};
```

**Offline Token Management:**

```typescript
// Service Worker intercepts auth requests
self.addEventListener("fetch", (event) => {
  if (event.request.url.includes("/api/auth/")) {
    event.respondWith(handleAuthRequest(event.request));
  }
});

async function handleAuthRequest(request: Request) {
  // Try to get fresh token
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Offline: return cached token if valid
    const cachedToken = await getCachedToken();
    if (cachedToken && !isTokenExpired(cachedToken)) {
      return new Response(JSON.stringify({ token: cachedToken }), {
        headers: { "Content-Type": "application/json" },
      });
    }
    // No valid cached token: return error
    return new Response(JSON.stringify({ error: "Offline, no valid token" }), {
      status: 401,
    });
  }
}
```

### 3. Deployment Model

**Cloud PWA with Offline Capabilities**

**Initial Deployment:**
- Deploy to Vercel/Netlify as standard web app
- Service Worker registered for offline support
- Manifest.json for installability
- HTTPS required (for Service Workers)

**Offline Strategy:**
- **Cache-First:** Static assets (HTML, CSS, JS)
- **Network-First with Cache Fallback:** Calendar data
- **Background Sync:** Update cached data when online
- **IndexedDB:** Store events, user preferences

**Installation Flow:**
1. User visits web app (PWA-ready)
2. Browser shows "Install" prompt (after engagement heuristics)
3. User clicks "Install"
4. App added to home screen / app drawer
5. App opens in standalone window (no browser chrome)

### 4. State Management Approach

**Complex State Requires XState**

PWAs have inherently complex state:
- Online/offline status
- Data syncing (pending, syncing, synced, error)
- Service Worker lifecycle (installing, waiting, active)
- Background sync queue management

```typescript
// packages/web/src/machines/syncMachine.ts
import { setup, fromPromise } from "xstate";

export const syncMachine = setup({
  types: {
    context: {} as {
      lastSyncTime: Date | null;
      pendingSync: boolean;
      syncError: string | null;
    },
    events: {} as
      | { type: "SYNC" }
      | { type: "ONLINE" }
      | { type: "OFFLINE" }
      | { type: "SYNC_SUCCESS"; data: { syncTime: Date } }
      | { type: "SYNC_ERROR"; error: string },
  },
  actors: {
    performSync: fromPromise(async () => {
      // Sync logic: fetch fresh data, update IndexedDB
      const events = await fetchFreshEvents();
      await storeEventsInDB(events);
      return { syncTime: new Date() };
    }),
  },
}).createMachine({
  id: "sync",
  initial: "idle",
  context: {
    lastSyncTime: null,
    pendingSync: false,
    syncError: null,
  },
  states: {
    idle: {
      on: {
        SYNC: "syncing",
        OFFLINE: "offline",
      },
    },
    syncing: {
      invoke: {
        src: "performSync",
        onDone: {
          target: "idle",
          actions: assign({
            lastSyncTime: ({ event }) => event.output.syncTime,
            syncError: null,
          }),
        },
        onError: {
          target: "error",
          actions: assign({
            syncError: ({ event }) => event.error.message,
          }),
        },
      },
    },
    offline: {
      entry: assign({ pendingSync: true }),
      on: {
        ONLINE: "syncing", // Auto-sync when back online
      },
    },
    error: {
      on: {
        SYNC: "syncing", // Retry
      },
    },
  },
});
```

**Data Management:**
- **TanStack Query** with persistence plugin
- **IndexedDB** via `idb` library for structured storage
- **XState** for sync orchestration

---

## Implementation Phases

### Phase 1: PWA Foundation (5 days)

**Day 1-2: Vite PWA Plugin Setup**
- [ ] Install vite-plugin-pwa
- [ ] Configure plugin with offline strategy
- [ ] Create manifest.json (name, icons, theme)
- [ ] Generate app icons (multiple sizes)
- [ ] Test PWA installability criteria
- [ ] Test on Chrome, Safari, Firefox

**Day 3-4: Service Worker Implementation**
- [ ] Create service worker with Workbox
- [ ] Implement cache-first strategy for static assets
- [ ] Implement network-first for API calls
- [ ] Add offline fallback page
- [ ] Test offline scenarios
- [ ] Test cache invalidation

**Day 5: Manifest and Install Prompt**
- [ ] Fine-tune manifest.json (display, orientation)
- [ ] Create InstallPrompt component
- [ ] Handle beforeinstallprompt event
- [ ] Test installation on mobile and desktop
- [ ] Add uninstall instructions to docs

**Deliverables:**
- ✅ Installable PWA
- ✅ Offline-capable static assets
- ✅ Service Worker active

### Phase 2: IndexedDB and Data Persistence (5 days)

**Day 6-7: IndexedDB Schema**
- [ ] Install idb library
- [ ] Design database schema (events, sync_status, preferences)
- [ ] Create DB wrapper functions (CRUD operations)
- [ ] Add database versioning/migrations
- [ ] Test CRUD operations
- [ ] Test data persistence across sessions

**Day 8-9: Offline Data Access**
- [ ] Implement read from IndexedDB
- [ ] Implement write to IndexedDB
- [ ] Add query/filter functions
- [ ] Integrate with TanStack Query
- [ ] Test offline data access
- [ ] Test stale data handling

**Day 10: Data Sync Logic**
- [ ] Create sync manager
- [ ] Implement fetch-and-store flow
- [ ] Add conflict resolution (last-write-wins)
- [ ] Test sync scenarios
- [ ] Add sync status UI

**Deliverables:**
- ✅ IndexedDB storage working
- ✅ Offline data access functional
- ✅ Basic sync implemented

### Phase 3: Background Sync and XState (6 days)

**Day 11-12: Background Sync API**
- [ ] Implement Background Sync registration
- [ ] Create sync event handler in Service Worker
- [ ] Test periodic background sync
- [ ] Add sync queue for failed requests
- [ ] Test sync on reconnection

**Day 13-14: XState Integration**
- [ ] Create sync state machine
- [ ] Create offline/online state machine
- [ ] Integrate machines with React
- [ ] Add user feedback for sync states
- [ ] Test state transitions

**Day 15-16: Advanced Sync Features**
- [ ] Implement optimistic updates
- [ ] Add retry logic with exponential backoff
- [ ] Handle auth token expiry during offline
- [ ] Add conflict resolution UI
- [ ] Test complex sync scenarios

**Deliverables:**
- ✅ Background Sync working
- ✅ XState managing complex states
- ✅ Robust offline/online handling

### Phase 4: UI and UX Polish (5 days)

**Day 17-18: Offline-Aware UI**
- [ ] Create OfflineIndicator component
- [ ] Show sync status in header
- [ ] Visual indication for cached vs fresh data
- [ ] Add "Sync Now" button
- [ ] Style offline states

**Day 19-20: PWA-Specific Features**
- [ ] Add app shortcuts (manifest shortcuts)
- [ ] Implement share target (receive calendar events)
- [ ] Add push notifications setup (optional)
- [ ] Test app-like navigation
- [ ] Polish standalone window experience

**Day 21: Testing and Bug Fixes**
- [ ] Test full offline flow
- [ ] Test background sync on mobile
- [ ] Test installation on multiple devices
- [ ] Fix edge cases
- [ ] Performance testing

**Deliverables:**
- ✅ Polished PWA experience
- ✅ Offline-first UX
- ✅ Cross-device testing complete

### Phase 5: Testing and Documentation (5 days)

**Day 22-23: Comprehensive Testing**
- [ ] Unit tests for sync logic
- [ ] Integration tests for offline scenarios
- [ ] E2E tests with Playwright
- [ ] Test on various browsers and devices
- [ ] Test Service Worker updates
- [ ] Test uninstallation

**Day 24-25: Documentation**
- [ ] PWA installation guide
- [ ] Offline capabilities documentation
- [ ] Troubleshooting guide
- [ ] Browser compatibility matrix
- [ ] Update README

**Day 26: Deployment and Launch**
- [ ] Deploy to production
- [ ] Test production PWA
- [ ] Monitor Service Worker registration
- [ ] Monitor offline usage analytics
- [ ] Gather user feedback

**Deliverables:**
- ✅ Production PWA deployed
- ✅ Comprehensive documentation
- ✅ Monitoring in place

---

## Trade-offs

### Pros

✅ **Best UX:** App-like experience with offline support
✅ **Installable:** Native app experience without app stores
✅ **Offline-First:** Works without internet connection
✅ **Mobile-Friendly:** Optimized for mobile devices
✅ **Progressive:** Graceful degradation for older browsers
✅ **Performance:** Cached assets load instantly
✅ **Engagement:** Push notifications (optional)
✅ **No App Store:** Deploy directly, no approval process
✅ **Cross-Platform:** One codebase for all platforms

### Cons

❌ **High Complexity:** Service Workers, IndexedDB, sync logic
❌ **Long Development Time:** 6-8 weeks to production
❌ **Debugging Difficulty:** Service Worker debugging is hard
❌ **Browser Compatibility:** Limited support on iOS Safari (improving)
❌ **Storage Limits:** IndexedDB quotas vary by browser
❌ **Sync Conflicts:** Complex conflict resolution needed
❌ **State Management:** Requires XState for complex flows
❌ **Testing Burden:** Many edge cases to test
❌ **Maintenance:** Service Worker updates are tricky

---

## Best Suited For

### Team Profile
- **Size:** 2-3 developers minimum
- **Skill Level:** Advanced - experience with PWAs, Service Workers
- **Experience:** Familiarity with IndexedDB, offline-first patterns

### Timeline Constraints
- **Urgency:** Can wait 6-8 weeks for full PWA
- **Iteration:** Building for long-term, not quick MVP

### User Requirements
- **Offline Access:** Critical requirement
- **Mobile-First:** Primary usage on mobile devices
- **App-Like Experience:** Want native app feel
- **Reliability:** Need to work in poor network conditions

### Technical Context
- **Infrastructure:** Comfortable with advanced web features
- **Maintenance:** Can dedicate time to PWA maintenance
- **Support:** Can support users across various browsers

---

## Acceptance Criteria

### Must Have (PWA)

1. **Installability**
   - ✅ Passes PWA installability criteria
   - ✅ Install prompt works on Chrome, Edge
   - ✅ Adds to home screen on iOS Safari
   - ✅ Opens in standalone window

2. **Offline Functionality**
   - ✅ Static assets load offline
   - ✅ Cached calendar data accessible offline
   - ✅ Offline indicator visible
   - ✅ Graceful degradation when offline

3. **Data Sync**
   - ✅ Background sync updates cached data
   - ✅ Manual sync button works
   - ✅ Sync status visible to user
   - ✅ Conflicts resolved automatically

4. **Performance**
   - ✅ Lighthouse PWA score > 90
   - ✅ Time to Interactive < 2 seconds
   - ✅ Cached pages load < 500ms

5. **Cross-Device**
   - ✅ Works on Chrome, Safari, Firefox, Edge
   - ✅ Works on iOS, Android, Desktop
   - ✅ Responsive design tested on all devices

### Should Have (Post-MVP)

- ⭕ Push notifications for upcoming events
- ⭕ Share target (receive events from other apps)
- ⭕ App shortcuts in manifest
- ⭕ Badge API for unread count

### Could Have (Future)

- ⚪ Periodic background sync
- ⚪ Web Share API integration
- ⚪ Bluetooth API for nearby device sync
- ⚪ File System Access API for exports

### Won't Have (Out of Scope)

- ⛔ Native app wrappers (Capacitor, Cordova)
- ⛔ App store distribution
- ⛔ Native platform features (biometrics, NFC)

---

## Dependencies

```json
{
  "name": "@calendar-whisperer/web",
  "version": "0.1.0",
  "type": "module",
  "dependencies": {
    "@calendar-whisperer/core": "workspace:*",
    "@azure/msal-browser": "^3.30.0",
    "@azure/msal-react": "^2.2.0",
    "@tanstack/react-query": "^5.62.7",
    "@tanstack/react-query-persist-client": "^5.62.7",
    "xstate": "^5.20.0",
    "@xstate/react": "^5.0.1",
    "idb": "^8.0.2",
    "workbox-window": "^7.3.0",
    "workbox-core": "^7.3.0",
    "workbox-precaching": "^7.3.0",
    "workbox-routing": "^7.3.0",
    "workbox-strategies": "^7.3.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "date-fns": "^4.1.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.5",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "@tailwindcss/vite": "^4.0.0",
    "vite": "^6.0.3",
    "vite-plugin-pwa": "^0.21.2",
    "playwright": "^1.49.1",
    "vitest": "^2.1.8"
  }
}
```

**Total Dependencies:** 14 production + 9 development = 23 total

**Key Dependencies:**
- **vite-plugin-pwa:** PWA support for Vite
- **workbox-\*:** Google's Service Worker libraries
- **idb:** IndexedDB wrapper with Promises
- **xstate:** State machine for complex async flows
- **@tanstack/react-query-persist-client:** Persist query cache

---

## Risk Mitigation

### Risk: Service Worker Complexity
**Mitigation:**
- Use Workbox for battle-tested patterns
- Comprehensive testing of offline scenarios
- Detailed logging and monitoring
- Progressive rollout of Service Worker features

### Risk: IndexedDB Storage Limits
**Mitigation:**
- Monitor storage usage
- Implement data cleanup policies
- Request persistent storage permission
- Graceful degradation if quota exceeded

### Risk: iOS Safari PWA Limitations
**Mitigation:**
- Test extensively on iOS
- Document limitations clearly
- Provide fallbacks for missing features
- Progressive enhancement approach

### Risk: Sync Conflicts
**Mitigation:**
- Use last-write-wins strategy initially
- Clear UI for conflict resolution
- Comprehensive testing of edge cases
- Detailed logging of sync operations

### Risk: Service Worker Updates
**Mitigation:**
- Implement skip waiting strategy
- Prompt user to reload on update
- Test update scenarios thoroughly
- Monitor update success rate

---

## Success Metrics

### PWA Metrics
- ✅ Installability rate > 30%
- ✅ Return visitor rate > 60%
- ✅ Offline usage > 20% of sessions
- ✅ Lighthouse PWA score > 90

### Performance Metrics
- ✅ Time to Interactive < 2 seconds
- ✅ Cache hit rate > 80%
- ✅ Sync success rate > 95%

### User Experience Metrics
- ✅ Offline sessions complete successfully > 90%
- ✅ User retention rate > 70%
- ✅ Positive feedback on offline features

---

## Code Examples

### Service Worker Configuration

```typescript
// packages/web/vite-plugin-pwa.config.ts
import { VitePWA } from "vite-plugin-pwa";

export const pwaConfig = VitePWA({
  registerType: "prompt",
  includeAssets: ["favicon.ico", "apple-touch-icon.png", "mask-icon.svg"],
  manifest: {
    name: "Calendar Whisperer",
    short_name: "CalWhisper",
    description: "Insights about your calendar and focus time",
    theme_color: "#3b82f6",
    background_color: "#ffffff",
    display: "standalone",
    orientation: "portrait",
    icons: [
      {
        src: "pwa-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "pwa-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/graph\.microsoft\.com\/.*/i,
        handler: "NetworkFirst",
        options: {
          cacheName: "graph-api-cache",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24, // 24 hours
          },
          networkTimeoutSeconds: 10,
        },
      },
    ],
  },
});
```

### IndexedDB Wrapper

```typescript
// packages/web/src/db/events.ts
import { openDB, type IDBPDatabase } from "idb";
import type { CalendarEvent } from "@calendar-whisperer/core";

const DB_NAME = "calendar-whisperer";
const DB_VERSION = 1;
const STORE_NAME = "events";

export async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("date", "date");
        store.createIndex("syncTime", "syncTime");
      }
    },
  });
}

export async function storeEvents(
  events: Array<CalendarEvent>
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  await Promise.all(
    events.map((event) =>
      store.put({
        ...event,
        syncTime: new Date().toISOString(),
      })
    )
  );

  await tx.done;
}

export async function getEventsByDate(
  date: Date
): Promise<Array<CalendarEvent>> {
  const db = await getDB();
  const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
  return db.getAllFromIndex(STORE_NAME, "date", dateKey);
}

export async function clearOldEvents(daysToKeep = 30): Promise<void> {
  const db = await getDB();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const index = store.index("syncTime");
  const range = IDBKeyRange.upperBound(cutoffDate.toISOString());

  let cursor = await index.openCursor(range);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
}
```

### Offline-Aware Hook

```typescript
// packages/web/src/hooks/useCalendarEvents.ts
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/auth/useAuth";
import { useOfflineStatus } from "./useOfflineStatus";
import { fetchWebEventsForDate } from "@/lib/graphClient";
import { getEventsByDate, storeEvents } from "@/db/events";
import type { CalendarEvent } from "@calendar-whisperer/core";

export function useCalendarEvents(date: Date, timeZone = "UTC") {
  const { getAccessToken } = useAuth();
  const { isOnline } = useOfflineStatus();

  return useQuery<Array<CalendarEvent>>({
    queryKey: ["calendar-events", date.toISOString(), timeZone],
    queryFn: async () => {
      if (isOnline) {
        // Online: fetch fresh data and cache
        try {
          const token = await getAccessToken();
          const events = await fetchWebEventsForDate(token, date, timeZone);
          await storeEvents(events); // Cache for offline use
          return events;
        } catch (error) {
          // Network error: fall back to cache
          return getEventsByDate(date);
        }
      } else {
        // Offline: use cached data
        return getEventsByDate(date);
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

---

## Conclusion

Option 3 provides the most advanced user experience with full offline support and native app-like installation. However, it comes with significant complexity and development time. Best suited for teams with advanced web development skills who need offline-first functionality and can dedicate 6-8 weeks to development and ongoing maintenance.

**Best for:** Enterprise users, mobile-first applications, offline-critical use cases

**Not recommended if:** Need quick MVP, limited team experience with PWAs, don't need offline support

---

**Generated:** 2025-10-14
**Status:** Ready for Implementation (Advanced)
**Estimated Effort:** 6-8 weeks (26 days)
**Risk Level:** High
**Recommended:** ⭐ For advanced use cases requiring offline support
