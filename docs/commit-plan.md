# Analytics Feature - Commit Plan

**Status**: Planning Complete
**Created**: 2025-11-04
**Duration**: 6 weeks
**Total Commits**: 32

---

## Overview

Break down analytics implementation into atomic, reversible commits across 4 PRs.

**Build order**: Core → CLI/Server (parallel) → Web

---

## PR #1: Core Foundation (Week 1-2)

### Commits 1-10: Core Package

**TDD: Date Range Utilities**

**1. test(core): add date range utilities test suite**

- File: `packages/core/src/utils/date-range.test.ts`
- Tests: Mon-Fri weeks, weekend starts, custom schedules, DST edge cases
- Coverage target: 100%

**2. feat(core): implement date range calculation utilities**

- File: `packages/core/src/utils/date-range.ts`
- Functions: `calculateWorkWeekEnd`, `resolveDateRange`, `countWorkDays`, `calculateTotalWorkHours`
- All commit 1 tests passing

**3. test(core): add edge case tests for date range**

- Extend `date-range.test.ts`
- Edge cases: timezones, DST transitions, single work day, no work days

**Config Schema**

**4. test(core): add work config validation tests**

- File: `packages/core/src/config.test.ts` (extend existing)
- Tests: env var parsing, defaults, invalid ranges, comma-separated WORK_DAYS

**5. feat(core): extend config schema with work schedule**

- File: `packages/core/src/config.ts`
- Schema: `work.{hoursPerWeek, daysPerWeek, workDays, startHour, endHour}`
- Parse: `WORK_DAYS` string → number array
- Defaults: 40h/week, 5 days, Mon-Fri, 9-17

**6. docs(core): update .env.example with work variables**

- File: `.env.example`
- Add: `WORK_HOURS_PER_WEEK`, `WORK_DAYS_PER_WEEK`, `WORK_DAYS`, `WORK_START_HOUR`, `WORK_END_HOUR`
- Include inline comments

**Analytics Engine**

**7. test(core): add meeting analytics calculation tests**

- File: `packages/core/src/analytics/meeting-analytics.test.ts`
- Tests: meeting percentages, focus time, daily breakdown, edge cases (no meetings, overtime)
- Mock calendar events

**8. feat(core): implement meeting analytics engine**

- File: `packages/core/src/analytics/meeting-analytics.ts`
- Functions: `analyzeMeetings`, `calculateMeetingDuration`, `generateDailyBreakdown`
- Types: `MeetingAnalytics`, `DailyBreakdown`

**9. feat(core): add Graph client date range support**

- File: `packages/core/src/graph-client.ts` (extend)
- Function: `fetchCalendarEventsInRange(client, {startDate, endDate, timezone?})`
- Type: `FetchEventsOptions`

**10. feat(core): export analytics and date utilities**

- File: `packages/core/src/index.ts`
- Exports: date-range utils, analytics functions, types

**PR #1 Checkpoint**

- Run: `pnpm build`, `pnpm test`, `pnpm type-check`
- Coverage: 80%+ in core package
- Demo: Run tests, validate calculations

---

## PR #2: CLI Interface (Week 3)

### Commits 11-16: CLI Package

**Config Command (Independent Path)**

**11. feat(cli): add config show command**

- File: `packages/cli/src/commands/config.ts` (new)
- Command: `config show`
- Display: work schedule with boxen formatting
- Deps: Phase 1 config schema

**12. chore(cli): register config command**

- File: `packages/cli/src/index.ts`
- Add: `program.addCommand(configCommand)`

**Events Command Enhancement**

**13. feat(cli): add date range options to events command**

- File: `packages/cli/src/commands/events.ts`
- Options: `--start-date <date>`, `--end-date <date>`
- Replace: single date → date range query
- Use: `fetchCalendarEventsInRange` from core

**14. feat(cli): add work schedule CLI overrides**

- File: `packages/cli/src/commands/events.ts`
- Options: `--hours-per-week <hours>`, `--days-per-week <days>`
- Override priority: CLI > env > defaults

**15. feat(cli): add analytics display to events**

- File: `packages/cli/src/commands/events.ts`
- Option: `--analytics` (default: true)
- Display: boxen summary, daily breakdown table
- Use: `analyzeMeetings` from core

**16. docs(cli): update README with CLI examples**

- File: `README.md`
- Examples: date ranges, CLI overrides, analytics usage
- Commands: `events`, `config show`

**PR #2 Checkpoint**

- Run: `pnpm dev events --start-date 2025-04-07`
- Demo: CLI analytics output
- Test: Manual terminal testing

---

## PR #3: Server API (Week 4)

### Commits 17-22: Server Package

**Parallel with CLI (after commit 10)**

**17. test(server): add analytics endpoint tests**

- File: `packages/server/src/routes/analytics.test.ts` (new)
- Tests: GET `/api/analytics`, query params, error responses (400, 500)
- Use: Fastify `.inject()` pattern

**18. feat(server): implement analytics API route**

- File: `packages/server/src/routes/analytics.ts` (new)
- Endpoint: `GET /api/analytics?startDate=...&endDate=...&hoursPerWeek=...&daysPerWeek=...`
- Response: `{dateRange, workConfig, analytics, events}`
- Validation: Zod schema for query params

**19. feat(server): add config API endpoint**

- File: `packages/server/src/routes/analytics.ts`
- Endpoint: `GET /api/config`
- Response: `{workConfig}`

**20. feat(server): register analytics routes**

- File: `packages/server/src/server.ts`
- Add: `app.register(analyticsRoutes, {prefix: '/api'})`

**21. fix(server): enhance error handling in API**

- File: `packages/server/src/routes/analytics.ts`
- Add: 400 (missing startDate), 401 (auth), 500 (Graph errors)
- Logging: `fastify.log.error()`

**22. test(server): add integration tests for error paths**

- File: `packages/server/src/routes/analytics.test.ts`
- Tests: missing params, auth failure, Graph API errors

**PR #3 Checkpoint**

- Run: `pnpm dev:server`
- Demo: `curl "http://localhost:3000/api/analytics?startDate=2025-04-07"`
- Test: All endpoint tests passing

---

## PR #4: Web UI + Polish (Week 5-6)

### Commits 23-28: Web Package

**Components (Parallel Development)**

**23. feat(web): add DateRangePicker component**

- File: `packages/web/src/components/DateRangePicker.tsx` (new)
- Props: `onDateRangeChange`, `defaultStartDate?`, `defaultEndDate?`
- Features: start/end date inputs, work week checkbox toggle
- Styling: Tailwind, matches existing patterns

**24. test(web): add DateRangePicker tests**

- File: `packages/web/src/components/DateRangePicker.test.tsx` (new)
- Tests: form submission, checkbox toggle, validation

**25. feat(web): add AnalyticsDashboard component**

- File: `packages/web/src/components/AnalyticsDashboard.tsx` (new)
- Props: `startDate`, `endDate?`
- Query: TanStack Query with `useQuery`
- States: loading, error, success

**26. feat(web): add MetricCard and DayBreakdown subcomponents**

- File: `packages/web/src/components/AnalyticsDashboard.tsx`
- Components: `MetricCard`, `DayBreakdown`
- Styling: color-coded (red=meetings, green=focus, blue=info)

**27. feat(web): integrate analytics into App**

- File: `packages/web/src/App.tsx`
- Layout: two-column grid (date picker | dashboard)
- State: `dateRange: {startDate, endDate?} | null`
- Empty state: "Select a date range to view analytics"

**28. style(web): polish analytics UI styling**

- File: `packages/web/src/components/*.tsx`
- Responsive: `grid-cols-1 md:grid-cols-3`
- Polish: shadows, borders, spacing

### Commits 29-32: Testing & Documentation

**29. test: add end-to-end integration test**

- File: `packages/web/src/__tests__/analytics-e2e.test.ts` (new)
- Test: date select → API call → display results
- Coverage: one full user flow

**30. test: verify coverage across packages**

- Run: `pnpm test --coverage`
- Verify: core 80%+, server integration tests, CLI manual

**31. docs: update CLAUDE.md with architecture**

- File: `CLAUDE.md`
- Add: Analytics Architecture section
- Document: date range logic, analytics engine, testing patterns

**32. docs: update README with comprehensive guide**

- File: `README.md`
- Add: Analytics Features section
- Document: CLI usage, API endpoints, web UI, configuration

**PR #4 Checkpoint**

- Run: `pnpm web` → http://localhost:3000
- Demo: Full web UI with analytics
- Final: all checks passing

---

## Parallel Work Opportunities

**After Commit 10** (Core complete):

- Thread A: 11-12 (config command)
- Thread B: 13-16 (events command)
- Thread C: 17-22 (server API)

**After Commit 22** (API complete):

- Thread A: 23-24 (DateRangePicker)
- Thread B: 25-26 (Dashboard)

**Final Phase**:

- Thread A: 29-30 (tests)
- Thread B: 31-32 (docs)

---

## Minimal Viable Features

**MVF #1** (End of Week 3): CLI Analytics

- Commits: 1-16
- Demo: `pnpm dev events --start-date 2025-04-07`
- User value: Terminal-based analytics

**MVF #2** (End of Week 4): API Endpoint

- Commits: 1-22
- Demo: `curl localhost:3000/api/analytics?startDate=2025-04-07`
- User value: Programmatic access

**MVF #3** (End of Week 6): Web UI

- Commits: 1-32
- Demo: http://localhost:3000
- User value: Visual analytics dashboard

---

## Skills Reference

Use these skills during implementation:

- **typescript-coding**: TypeScript strict mode, Zod, ESM patterns
- **development-lifecycle:git-commit**: Conventional commits, atomic changes
- **development-lifecycle:code-review**: After each PR checkpoint

---

## Commit Checklist

Every commit must:

- ✓ Build: `pnpm build` succeeds
- ✓ Test: `pnpm test` passes (or manual for UI)
- ✓ Types: `pnpm type-check` passes
- ✓ Lint: `pnpm lint` passes
- ✓ Format: Conventional commit message
- ✓ Reversible: Can be reverted independently

---

## Risk Mitigation

**High-risk commits** (extra testing needed):

- Commit 5: Config schema (verify existing .env still works)
- Commit 9: Graph client (doesn't break existing commands)
- Commit 27: App.tsx (doesn't break existing web UI)

**Dependencies**:

- All CLI/server/web commits depend on commit 10 (core exports)
- Web commits 23-28 depend on commit 20 (API routes)

---

## Success Metrics

**Phase 1**: Core tests at 80%+ coverage
**Phase 2**: CLI demo successful
**Phase 3**: API responds correctly via curl
**Phase 4**: Web UI renders analytics dashboard

**Final**: All packages build, test, type-check successfully
