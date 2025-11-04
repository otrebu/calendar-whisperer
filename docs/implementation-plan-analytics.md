# Implementation Plan: Analytics Features with .env Configuration

**Variation**: Core-First, Minimal Config Approach (Adapted for .env-only configuration)

**Status**: Planning Phase
**Created**: 2025-11-04
**Estimated Duration**: 6 weeks

---

## Overview

Build calendar analytics features using environment variable configuration exclusively. No JSON config files - everything configured via `.env`.

### Key Requirements

1. Add start date and end date parameters for event queries
2. Default behavior: if only start date provided, default to the work week containing that date
3. Configuration via .env: hours per week, days per week, work days
4. Calculate percentage of time spent in meetings
5. Calculate percentage of hours spent in meetings

### User Preferences (from planning session)

- **Work days**: Configurable via environment variables (e.g., `WORK_DAYS=1,2,3,4,5`)
- **Work week logic**: Same calendar week (if start date is Friday, calculate Mon-Fri of that week)
- **CLI overrides**: Yes, allow CLI arguments to override .env values

---

## Configuration Design

### Environment Variables (`.env.example`)

```env
# Existing Azure/Graph configuration
AZURE_CLIENT_ID=<your-client-id>
AZURE_TENANT_ID=<your-tenant-id>
GRAPH_SCOPES=https://graph.microsoft.com/.default
CACHE_DIRECTORY=.auth-cache

# Work Schedule Configuration (NEW)
WORK_HOURS_PER_WEEK=40
WORK_DAYS_PER_WEEK=5
WORK_DAYS=1,2,3,4,5  # 0=Sunday, 1=Monday, 2=Tuesday, etc.
WORK_START_HOUR=9
WORK_END_HOUR=17

# Server Configuration
PORT=3000
```

### Configuration Loading Priority

1. **Defaults** (hardcoded in code)
2. **Environment variables** (from `.env` file)
3. **CLI arguments** (highest priority, for one-off overrides)

---

## Implementation Phases

### Phase 1: Core Package Foundation (Week 1-2)

**Location**: `packages/core/src/`

#### 1.1 Config Schema Enhancement

**File**: `packages/core/src/config.ts`

**Changes**:

- Extend existing `configSchema` with work schedule fields
- Add Zod validation for work configuration
- Parse `WORK_DAYS` as comma-separated numbers

**New schema fields**:

```typescript
export const configSchema = z.object({
  // ... existing fields (azureClientId, azureTenantId, etc.)

  work: z
    .object({
      hoursPerWeek: z.number().min(1).max(168).default(40),
      daysPerWeek: z.number().min(1).max(7).default(5),
      workDays: z.array(z.number().min(0).max(6)).default([1, 2, 3, 4, 5]),
      startHour: z.number().min(0).max(23).default(9),
      endHour: z.number().min(0).max(23).default(17),
    })
    .default({}),
});

export type Config = z.infer<typeof configSchema>;
```

**Loading logic**:

```typescript
export function loadConfig(): Config {
  return configSchema.parse({
    // ... existing fields
    work: {
      hoursPerWeek: process.env.WORK_HOURS_PER_WEEK
        ? parseInt(process.env.WORK_HOURS_PER_WEEK, 10)
        : undefined,
      daysPerWeek: process.env.WORK_DAYS_PER_WEEK
        ? parseInt(process.env.WORK_DAYS_PER_WEEK, 10)
        : undefined,
      workDays: process.env.WORK_DAYS
        ? process.env.WORK_DAYS.split(",").map((d) => parseInt(d.trim(), 10))
        : undefined,
      startHour: process.env.WORK_START_HOUR
        ? parseInt(process.env.WORK_START_HOUR, 10)
        : undefined,
      endHour: process.env.WORK_END_HOUR
        ? parseInt(process.env.WORK_END_HOUR, 10)
        : undefined,
    },
  });
}
```

#### 1.2 Date Range Utilities

**New File**: `packages/core/src/utils/date-range.ts`

**Key Functions**:

```typescript
export interface WorkConfig {
  hoursPerWeek: number;
  daysPerWeek: number;
  workDays: number[];
  startHour: number;
  endHour: number;
}

export interface DateRangeResult {
  startDate: Date;
  endDate: Date;
  isAutoCalculated: boolean;
}

/**
 * Calculate work week end date from start date
 * Logic: Find the last work day in the same calendar week as startDate
 *
 * Example: startDate = Friday 2025-04-11
 * Result: Monday 2025-04-07 to Friday 2025-04-11
 */
export function calculateWorkWeekEnd(
  startDate: Date,
  workConfig: WorkConfig,
): DateRangeResult;

/**
 * Resolve date range with optional end date
 * If endDate provided: use it
 * If endDate omitted: calculate work week
 */
export function resolveDateRange(
  startDate: string | Date,
  endDate: string | Date | undefined,
  workConfig: WorkConfig,
): DateRangeResult;

/**
 * Count work days in a date range
 */
export function countWorkDays(
  startDate: Date,
  endDate: Date,
  workDays: number[],
): number;

/**
 * Calculate total available work hours in date range
 */
export function calculateTotalWorkHours(
  startDate: Date,
  endDate: Date,
  workConfig: WorkConfig,
): number;
```

**Algorithm for Work Week Calculation**:

1. Get day of week for `startDate`
2. If `startDate` is not a work day, find next work day
3. Find start of work week: iterate backwards to find first work day of calendar week
4. Find end of work week: iterate forwards to find last work day of calendar week
5. Return `{ startDate: workWeekStart, endDate: workWeekEnd, isAutoCalculated: true }`

#### 1.3 Analytics Engine

**New File**: `packages/core/src/analytics/meeting-analytics.ts`

**Core Types**:

```typescript
export interface MeetingAnalytics {
  // Summary metrics
  totalEvents: number;
  totalMeetingHours: number;
  totalWorkHours: number;

  // Percentages
  meetingPercentageOfTime: number; // % of calendar time in date range
  meetingPercentageOfWorkHours: number; // % of work hours (primary metric)

  // Focus time
  focusHours: number;
  focusPercentage: number;

  // Daily breakdown
  breakdownByDay: DailyBreakdown[];
}

export interface DailyBreakdown {
  date: string; // ISO date string (YYYY-MM-DD)
  dayOfWeek: number; // 0=Sunday
  isWorkDay: boolean;
  meetingHours: number;
  workHours: number;
  focusHours: number;
  eventCount: number;
}
```

**Key Functions**:

```typescript
/**
 * Main analytics calculation function
 */
export function analyzeMeetings(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date,
  workConfig: WorkConfig,
): MeetingAnalytics;

/**
 * Calculate meeting duration in hours
 */
export function calculateMeetingDuration(event: CalendarEvent): number;

/**
 * Generate daily breakdown of meetings
 */
export function generateDailyBreakdown(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date,
  workConfig: WorkConfig,
): DailyBreakdown[];
```

**Calculation Logic**:

1. Calculate total work hours in date range:
   - Count work days between start and end
   - Multiply by hours per day (hoursPerWeek / daysPerWeek)

2. Calculate total meeting hours:
   - Sum duration of all events
   - Duration = (endTime - startTime) / 3600000

3. Calculate percentages:
   - `meetingPercentageOfWorkHours` = (totalMeetingHours / totalWorkHours) \* 100
   - `meetingPercentageOfTime` = (totalMeetingHours / totalCalendarHours) \* 100

4. Calculate focus time:
   - `focusHours` = totalWorkHours - totalMeetingHours
   - `focusPercentage` = (focusHours / totalWorkHours) \* 100

#### 1.4 Enhanced Graph Client

**File**: `packages/core/src/graph-client.ts`

**Add new function**:

```typescript
export interface FetchEventsOptions {
  startDate: Date;
  endDate: Date;
  timezone?: string;
}

/**
 * Fetch calendar events for a date range
 */
export async function fetchCalendarEventsInRange(
  client: Client,
  options: FetchEventsOptions,
): Promise<CalendarEvent[]>;
```

#### 1.5 Core Exports

**File**: `packages/core/src/index.ts`

**Add exports**:

```typescript
// Date range utilities
export * from "./utils/date-range.js";

// Analytics
export * from "./analytics/meeting-analytics.js";

// Enhanced graph client
export { fetchCalendarEventsInRange } from "./graph-client.js";
```

---

### Phase 2: CLI Enhancement (Week 3)

**Location**: `packages/cli/src/commands/`

#### 2.1 Enhanced Events Command

**File**: `packages/cli/src/commands/events.ts`

**Changes**:

- Add new options: `--start-date`, `--end-date`, `--hours-per-week`, `--days-per-week`
- Add `--analytics` flag (default: true)
- Display analytics results with boxen + tables

**New command signature**:

```bash
calendar-whisperer events --start-date 2025-04-07 [--end-date 2025-04-11] [--analytics]
calendar-whisperer events --start-date 2025-04-07 --hours-per-week 35 --analytics
```

**Implementation**:

```typescript
export const eventsCommand = new Command("events")
  .description("Fetch calendar events for a date range")
  .option(
    "-s, --start-date <date>",
    "Start date (YYYY-MM-DD, defaults to today)",
  )
  .option(
    "-e, --end-date <date>",
    "End date (optional, defaults to work week end)",
  )
  .option(
    "--hours-per-week <hours>",
    "Override work hours per week",
    parseFloat,
  )
  .option("--days-per-week <days>", "Override work days per week", parseInt)
  .option("--analytics", "Show meeting analytics", true)
  .action(async (options) => {
    const config = loadConfig();

    // Apply CLI overrides
    const workConfig = {
      ...config.work,
      hoursPerWeek: options.hoursPerWeek ?? config.work.hoursPerWeek,
      daysPerWeek: options.daysPerWeek ?? config.work.daysPerWeek,
    };

    // Resolve date range
    const startDate =
      options.startDate || new Date().toISOString().split("T")[0];
    const {
      startDate: resolvedStart,
      endDate: resolvedEnd,
      isAutoCalculated,
    } = resolveDateRange(startDate, options.endDate, workConfig);

    // Authenticate & fetch events
    const credential = createDeviceCodeCredential();
    const token = await getAccessToken(credential);
    const client = createGraphClient(token);
    const events = await fetchCalendarEventsInRange(client, {
      startDate: resolvedStart,
      endDate: resolvedEnd,
    });

    // Display results
    displayDateRange(resolvedStart, resolvedEnd, isAutoCalculated);
    displayEvents(events);

    if (options.analytics) {
      const analytics = analyzeMeetings(
        events,
        resolvedStart,
        resolvedEnd,
        workConfig,
      );
      displayAnalytics(analytics);
    }
  });
```

**Display functions**:

```typescript
function displayDateRange(
  start: Date,
  end: Date,
  autoCalculated: boolean,
): void {
  console.log(
    boxen(
      `Date Range: ${formatDate(start)} to ${formatDate(end)}` +
        (autoCalculated ? "\n(Auto-calculated work week)" : ""),
      { padding: 1, borderColor: "blue" },
    ),
  );
}

function displayAnalytics(analytics: MeetingAnalytics): void {
  console.log(
    boxen(
      chalk.bold("Meeting Analytics\n\n") +
        `Total Events: ${chalk.cyan(analytics.totalEvents)}\n` +
        `Total Meeting Hours: ${chalk.cyan(analytics.totalMeetingHours.toFixed(2))}\n` +
        `Total Work Hours: ${chalk.cyan(analytics.totalWorkHours.toFixed(2))}\n\n` +
        `${chalk.yellow("Meeting Time:")}\n` +
        `  • ${analytics.meetingPercentageOfWorkHours.toFixed(1)}% of work hours\n\n` +
        `${chalk.green("Focus Time:")}\n` +
        `  • ${analytics.focusHours.toFixed(2)} hours\n` +
        `  • ${analytics.focusPercentage.toFixed(1)}% of work hours`,
      { padding: 1, borderColor: "green" },
    ),
  );

  // Daily breakdown table
  const table = new Table({
    head: ["Date", "Day", "Meeting Hours", "Work Hours", "Focus Hours"],
  });

  analytics.breakdownByDay
    .filter((day) => day.isWorkDay)
    .forEach((day) => {
      table.push([
        day.date,
        getDayName(day.dayOfWeek),
        day.meetingHours.toFixed(1),
        day.workHours.toFixed(1),
        day.focusHours.toFixed(1),
      ]);
    });

  console.log("\n" + table.toString());
}
```

#### 2.2 Config Command

**New File**: `packages/cli/src/commands/config.ts`

**Command**: `calendar-whisperer config show`

```typescript
export const configCommand = new Command("config")
  .description("Manage configuration")
  .addCommand(
    new Command("show").description("Show current configuration").action(() => {
      const config = loadConfig();

      console.log(
        boxen(
          chalk.bold("Work Schedule Configuration\n\n") +
            `Hours per week: ${chalk.cyan(config.work.hoursPerWeek)}\n` +
            `Days per week: ${chalk.cyan(config.work.daysPerWeek)}\n` +
            `Work days: ${chalk.cyan(config.work.workDays.map(formatDayOfWeek).join(", "))}\n` +
            `Work hours: ${chalk.cyan(`${config.work.startHour}:00 - ${config.work.endHour}:00`)}`,
          { padding: 1, borderColor: "blue" },
        ),
      );
    }),
  );
```

#### 2.3 Update CLI Entry Point

**File**: `packages/cli/src/index.ts`

```typescript
import { configCommand } from "./commands/config.js";

program.addCommand(configCommand);
```

---

### Phase 3: Server API (Week 4)

**Location**: `packages/server/src/routes/`

#### 3.1 Analytics API Endpoint

**New File**: `packages/server/src/routes/analytics.ts`

**Endpoints**:

```typescript
import { FastifyPluginAsync } from "fastify";
import {
  createDeviceCodeCredential,
  getAccessToken,
  createGraphClient,
  fetchCalendarEventsInRange,
  analyzeMeetings,
  resolveDateRange,
  loadConfig,
} from "@calendar-whisperer/core";

export const analyticsRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /api/analytics?startDate=2025-04-07&endDate=2025-04-11
  fastify.get<{
    Querystring: {
      startDate: string;
      endDate?: string;
      hoursPerWeek?: number;
      daysPerWeek?: number;
    };
  }>("/analytics", async (request, reply) => {
    const { startDate, endDate, hoursPerWeek, daysPerWeek } = request.query;

    if (!startDate) {
      return reply.code(400).send({
        error: "startDate query parameter is required",
      });
    }

    try {
      const config = loadConfig();

      // Apply query overrides
      const workConfig = {
        ...config.work,
        hoursPerWeek: hoursPerWeek ?? config.work.hoursPerWeek,
        daysPerWeek: daysPerWeek ?? config.work.daysPerWeek,
      };

      // Resolve date range
      const dateRange = resolveDateRange(startDate, endDate, workConfig);

      // Fetch events
      const credential = createDeviceCodeCredential();
      const token = await getAccessToken(credential);
      const client = createGraphClient(token);
      const events = await fetchCalendarEventsInRange(client, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      // Calculate analytics
      const analytics = analyzeMeetings(
        events,
        dateRange.startDate,
        dateRange.endDate,
        workConfig,
      );

      return {
        dateRange: {
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          isAutoCalculated: dateRange.isAutoCalculated,
        },
        workConfig,
        analytics,
        events: events.map((event) => ({
          id: event.id,
          subject: event.subject,
          start: event.start.dateTime,
          end: event.end.dateTime,
        })),
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // GET /api/config
  fastify.get("/config", async (request, reply) => {
    try {
      const config = loadConfig();
      return { workConfig: config.work };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
};
```

#### 3.2 Register Routes

**File**: `packages/server/src/server.ts`

```typescript
import { analyticsRoutes } from "./routes/analytics.js";

// Register routes
await server.register(analyticsRoutes, { prefix: "/api" });
```

---

### Phase 4: Web UI (Week 5)

**Location**: `packages/web/src/components/`

#### 4.1 DateRangePicker Component

**New File**: `packages/web/src/components/DateRangePicker.tsx`

```typescript
import { useState } from 'react';

interface DateRangePickerProps {
  onDateRangeChange: (startDate: string, endDate?: string) => void;
  defaultStartDate?: string;
  defaultEndDate?: string;
}

export function DateRangePicker({
  onDateRangeChange,
  defaultStartDate,
  defaultEndDate,
}: DateRangePickerProps) {
  const [startDate, setStartDate] = useState(defaultStartDate || '');
  const [endDate, setEndDate] = useState(defaultEndDate || '');
  const [useWorkWeek, setUseWorkWeek] = useState(!defaultEndDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onDateRangeChange(startDate, useWorkWeek ? undefined : endDate);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="startDate" className="block text-sm font-medium mb-1">
          Start Date
        </label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="useWorkWeek"
          checked={useWorkWeek}
          onChange={(e) => setUseWorkWeek(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="useWorkWeek" className="text-sm">
          Auto-calculate work week
        </label>
      </div>

      {!useWorkWeek && (
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium mb-1">
            End Date
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate}
            required={!useWorkWeek}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      )}

      <button
        type="submit"
        className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        Analyze
      </button>
    </form>
  );
}
```

#### 4.2 AnalyticsDashboard Component

**New File**: `packages/web/src/components/AnalyticsDashboard.tsx`

```typescript
import { useQuery } from '@tanstack/react-query';

interface AnalyticsDashboardProps {
  startDate: string;
  endDate?: string;
}

interface AnalyticsResponse {
  dateRange: {
    startDate: string;
    endDate: string;
    isAutoCalculated: boolean;
  };
  workConfig: {
    hoursPerWeek: number;
    daysPerWeek: number;
  };
  analytics: {
    totalEvents: number;
    totalMeetingHours: number;
    totalWorkHours: number;
    meetingPercentageOfWorkHours: number;
    focusHours: number;
    focusPercentage: number;
    breakdownByDay: Array<{
      date: string;
      meetingHours: number;
      workHours: number;
      focusHours: number;
      isWorkDay: boolean;
    }>;
  };
}

async function fetchAnalytics(
  startDate: string,
  endDate?: string
): Promise<AnalyticsResponse> {
  const params = new URLSearchParams({ startDate });
  if (endDate) params.append('endDate', endDate);

  const response = await fetch(`/api/analytics?${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch analytics');
  }
  return response.json();
}

export function AnalyticsDashboard({ startDate, endDate }: AnalyticsDashboardProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['analytics', startDate, endDate],
    queryFn: () => fetchAnalytics(startDate, endDate),
  });

  if (isLoading) {
    return <div className="text-center py-8">Loading analytics...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        Error: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  if (!data) return null;

  const { analytics, dateRange } = data;

  return (
    <div className="space-y-6">
      {/* Date Range Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-1">Date Range</h3>
        <p className="text-sm text-blue-700">
          {new Date(dateRange.startDate).toLocaleDateString()} to{' '}
          {new Date(dateRange.endDate).toLocaleDateString()}
        </p>
        {dateRange.isAutoCalculated && (
          <span className="text-xs text-blue-600">(Auto-calculated work week)</span>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Meeting Time"
          value={`${analytics.meetingPercentageOfWorkHours.toFixed(1)}%`}
          subtitle={`${analytics.totalMeetingHours.toFixed(1)} hours`}
          color="red"
        />

        <MetricCard
          title="Focus Time"
          value={`${analytics.focusPercentage.toFixed(1)}%`}
          subtitle={`${analytics.focusHours.toFixed(1)} hours`}
          color="green"
        />

        <MetricCard
          title="Total Events"
          value={analytics.totalEvents.toString()}
          subtitle={`${analytics.totalWorkHours.toFixed(0)} work hours`}
          color="blue"
        />
      </div>

      {/* Daily Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="font-semibold text-lg mb-4">Daily Breakdown</h3>
        <div className="space-y-3">
          {analytics.breakdownByDay
            .filter((day) => day.isWorkDay)
            .map((day) => (
              <DayBreakdown key={day.date} day={day} />
            ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, subtitle, color }: {
  title: string;
  value: string;
  subtitle: string;
  color: 'red' | 'green' | 'blue';
}) {
  const colorClasses = {
    red: 'text-red-600',
    green: 'text-green-600',
    blue: 'text-blue-600',
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
      <h4 className="text-sm font-medium text-gray-600 mb-2">{title}</h4>
      <p className={`text-3xl font-bold ${colorClasses[color]}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
    </div>
  );
}

function DayBreakdown({ day }: { day: any }) {
  const meetingPercentage = (day.meetingHours / day.workHours) * 100;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">
          {new Date(day.date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })}
        </span>
        <span className="text-gray-600">
          {day.meetingHours.toFixed(1)}h meetings / {day.workHours.toFixed(1)}h work
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-red-500 h-2 rounded-full"
          style={{ width: `${meetingPercentage}%` }}
        />
      </div>
    </div>
  );
}
```

#### 4.3 Update App Component

**File**: `packages/web/src/App.tsx`

```typescript
import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DateRangePicker } from './components/DateRangePicker';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';

const queryClient = new QueryClient();

function AppContent() {
  const [dateRange, setDateRange] = useState<{
    startDate: string;
    endDate?: string;
  } | null>(null);

  const handleDateRangeChange = (startDate: string, endDate?: string) => {
    setDateRange({ startDate, endDate });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Calendar Whisperer</h1>
          <p className="text-gray-600 mt-2">
            Analyze your meeting time vs. focus work
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left sidebar: Date picker */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Select Date Range</h2>
              <DateRangePicker onDateRangeChange={handleDateRangeChange} />
            </div>
          </div>

          {/* Main content: Analytics */}
          <div className="lg:col-span-2">
            {dateRange ? (
              <AnalyticsDashboard
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
              />
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-12 text-center shadow-sm">
                <p className="text-gray-500">
                  Select a date range to view analytics
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
```

---

### Phase 5: Testing & Polish (Week 6)

#### 5.1 Unit Tests

**New Files**:

1. `packages/core/src/utils/date-range.test.ts`
   - Test work week calculation for various start days
   - Test weekend handling
   - Test custom work schedules

2. `packages/core/src/analytics/meeting-analytics.test.ts`
   - Test meeting percentage calculations
   - Test focus time calculations
   - Test daily breakdown generation

3. `packages/core/src/config.test.ts`
   - Test work config loading from env
   - Test validation errors
   - Test defaults

**Example Test**:

```typescript
describe("calculateWorkWeekEnd", () => {
  const defaultConfig = {
    hoursPerWeek: 40,
    daysPerWeek: 5,
    workDays: [1, 2, 3, 4, 5], // Mon-Fri
    startHour: 9,
    endHour: 17,
  };

  it("calculates work week for Monday start", () => {
    const start = new Date("2025-04-07"); // Monday
    const result = calculateWorkWeekEnd(start, defaultConfig);

    expect(result.startDate.toISOString().split("T")[0]).toBe("2025-04-07");
    expect(result.endDate.toISOString().split("T")[0]).toBe("2025-04-11"); // Friday
    expect(result.isAutoCalculated).toBe(true);
  });

  it("calculates work week for Friday start (same week)", () => {
    const start = new Date("2025-04-11"); // Friday
    const result = calculateWorkWeekEnd(start, defaultConfig);

    expect(result.startDate.toISOString().split("T")[0]).toBe("2025-04-07"); // Monday
    expect(result.endDate.toISOString().split("T")[0]).toBe("2025-04-11"); // Friday
  });

  it("skips weekend and calculates next work week", () => {
    const start = new Date("2025-04-05"); // Saturday
    const result = calculateWorkWeekEnd(start, defaultConfig);

    expect(result.startDate.toISOString().split("T")[0]).toBe("2025-04-07"); // Monday
    expect(result.endDate.toISOString().split("T")[0]).toBe("2025-04-11"); // Friday
  });
});
```

#### 5.2 Integration Tests

**Server endpoint tests**:

```typescript
describe("GET /api/analytics", () => {
  it("returns analytics for date range", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/analytics?startDate=2025-04-07&endDate=2025-04-11",
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty("analytics");
    expect(body.analytics).toHaveProperty("totalMeetingHours");
    expect(body.analytics).toHaveProperty("meetingPercentageOfWorkHours");
  });

  it("returns 400 if startDate missing", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/analytics",
    });

    expect(response.statusCode).toBe(400);
  });
});
```

#### 5.3 Documentation Updates

**Files to update**:

1. **README.md**
   - Add "Analytics Features" section
   - Document CLI commands with examples
   - Document API endpoints

2. **CLAUDE.md**
   - Add work schedule configuration section
   - Document analytics architecture
   - Add testing examples

3. **.env.example**
   - Add work schedule variables with comments

**Example README section**:

````markdown
## Analytics Features

Calendar Whisperer provides detailed analytics on your meeting time vs. focus work.

### Configuration

Configure your work schedule in `.env`:

```env
# Work Schedule
WORK_HOURS_PER_WEEK=40
WORK_DAYS_PER_WEEK=5
WORK_DAYS=1,2,3,4,5  # 0=Sunday, 1=Monday, etc.
WORK_START_HOUR=9
WORK_END_HOUR=17
```
````

### CLI Usage

```bash
# Analyze current work week
pnpm dev events --start-date 2025-04-07

# Analyze specific date range
pnpm dev events --start-date 2025-04-07 --end-date 2025-04-11

# Override work hours for one-off analysis
pnpm dev events --start-date 2025-04-07 --hours-per-week 35

# Show current configuration
pnpm dev config show
```

### Web UI

Launch the web interface:

```bash
pnpm web
```

Then visit http://localhost:3000 and use the date range picker to analyze your calendar.

### API Endpoints

**GET /api/analytics**

Query parameters:

- `startDate` (required): YYYY-MM-DD format
- `endDate` (optional): YYYY-MM-DD format
- `hoursPerWeek` (optional): Override hours per week
- `daysPerWeek` (optional): Override days per week

Returns:

```json
{
  "dateRange": {
    "startDate": "2025-04-07T00:00:00.000Z",
    "endDate": "2025-04-11T23:59:59.999Z",
    "isAutoCalculated": true
  },
  "analytics": {
    "totalEvents": 15,
    "totalMeetingHours": 12.5,
    "totalWorkHours": 40,
    "meetingPercentageOfWorkHours": 31.25,
    "focusHours": 27.5,
    "focusPercentage": 68.75,
    "breakdownByDay": [...]
  }
}
```

```

---

## Summary

### Files Created (13 new files)

**Core Package** (5 files):
1. `packages/core/src/utils/date-range.ts` - Date range utilities
2. `packages/core/src/analytics/meeting-analytics.ts` - Analytics engine
3. `packages/core/src/utils/date-range.test.ts` - Date range tests
4. `packages/core/src/analytics/meeting-analytics.test.ts` - Analytics tests
5. `packages/core/src/config.test.ts` - Config tests (enhanced)

**CLI Package** (1 file):
6. `packages/cli/src/commands/config.ts` - Config management command

**Server Package** (1 file):
7. `packages/server/src/routes/analytics.ts` - Analytics API routes

**Web Package** (2 files):
8. `packages/web/src/components/DateRangePicker.tsx` - Date picker component
9. `packages/web/src/components/AnalyticsDashboard.tsx` - Analytics dashboard

**Documentation** (1 file):
10. This implementation plan

### Files Modified (6 existing files)

1. `packages/core/src/config.ts` - Add work schedule fields
2. `packages/core/src/graph-client.ts` - Add `fetchCalendarEventsInRange()`
3. `packages/core/src/index.ts` - Export new modules
4. `packages/cli/src/commands/events.ts` - Add analytics
5. `packages/cli/src/index.ts` - Register config command
6. `packages/server/src/server.ts` - Register analytics routes
7. `packages/web/src/App.tsx` - Integrate components
8. `.env.example` - Add work schedule variables
9. `README.md` - Document analytics features
10. `CLAUDE.md` - Document implementation

### Estimated Lines of Code

- **Core package**: ~800 lines (400 implementation + 400 tests)
- **CLI package**: ~300 lines
- **Server package**: ~150 lines
- **Web package**: ~400 lines
- **Documentation**: ~200 lines

**Total**: ~1,850 lines of new code

### Timeline

- **Week 1-2**: Core package foundation (config, date range, analytics)
- **Week 3**: CLI enhancement (commands, display)
- **Week 4**: Server API (endpoints)
- **Week 5**: Web UI (components, integration)
- **Week 6**: Testing, documentation, polish

**Total duration**: 6 weeks

---

## Key Technical Decisions

### 1. Configuration Strategy
- **Decision**: Environment variables only, no JSON config files
- **Rationale**: Simpler, follows 12-factor app principles, easy to deploy
- **Trade-offs**: Less flexible than config files, but sufficient for personal tool

### 2. Work Week Calculation
- **Decision**: Calculate work week within same calendar week as start date
- **Rationale**: More intuitive, aligns with how people think about weeks
- **Example**: If start = Friday, return Mon-Fri of that week (not Fri-Thu of next week)

### 3. CLI Override Priority
- **Decision**: CLI args > .env > defaults
- **Rationale**: Allows one-off analysis without changing .env
- **Implementation**: Merge config objects, with CLI args taking precedence

### 4. Percentage Calculation
- **Decision**: Time-based (meeting hours / work hours), not count-based
- **Rationale**: More accurate representation of actual time spent
- **Example**: 10 1-hour meetings = 50% of 20-hour work week, not "10/20 meetings"

### 5. Focus Time Definition
- **Decision**: Total work hours - total meeting hours
- **Rationale**: Simple, understandable metric
- **Future**: Could enhance with "uninterrupted blocks" detection

---

## Future Enhancements (Post-MVP)

1. **Fragmentation score**: Measure how broken up the day is (many short gaps = high fragmentation)
2. **Peak meeting times**: Heatmap of when meetings typically occur
3. **Trend analysis**: Compare current period vs previous (e.g., this week vs last week)
4. **Export**: CSV/JSON export of analytics
5. **Goals**: Set targets (e.g., "keep meetings < 40%") with progress tracking
6. **Categories**: Classify meetings by type (1:1, team, all-hands) for deeper insights

---

## Risk Mitigation

### Technical Risks

1. **Date/time handling complexity**
   - **Mitigation**: Use standard Date objects, comprehensive tests
   - **Edge cases**: Timezones, DST transitions, leap years

2. **Config validation**
   - **Mitigation**: Zod schemas with clear error messages
   - **Edge cases**: Invalid work days (e.g., 8), negative hours

3. **API rate limits**
   - **Mitigation**: Existing Graph API client handles pagination
   - **Future**: Add caching layer if needed

### User Experience Risks

1. **Confusing work week logic**
   - **Mitigation**: Clear messaging ("Auto-calculated work week")
   - **Documentation**: Examples in README

2. **Unexpected percentage values**
   - **Mitigation**: Show both hours and percentages
   - **Context**: Display total work hours for reference

---

## Success Criteria

### Functional Requirements
- ✅ Date range queries with start/end dates
- ✅ Smart work week default (same calendar week)
- ✅ Configurable work schedule via .env
- ✅ Meeting time percentage calculation
- ✅ Focus time percentage calculation
- ✅ CLI, Server, and Web interfaces

### Non-Functional Requirements
- ✅ All calculations covered by unit tests
- ✅ API endpoints have integration tests
- ✅ Documentation updated (README, CLAUDE.md)
- ✅ Existing functionality not broken
- ✅ Type-safe (TypeScript strict mode)

### User Experience
- ✅ CLI analytics display easy to read
- ✅ Web UI intuitive and responsive
- ✅ Error messages helpful
- ✅ Config visible via `config show` command

---

## Getting Started After Approval

1. Create feature branch: `git checkout -b feature/analytics-implementation`
2. Start with Phase 1 (Core package)
3. Run tests after each module: `pnpm test`
4. Type-check frequently: `pnpm type-check`
5. Commit incrementally with conventional commits
6. Create PR after Phase 3 for early feedback

---

**Document Version**: 1.0
**Last Updated**: 2025-11-04
**Status**: Ready for implementation
```
