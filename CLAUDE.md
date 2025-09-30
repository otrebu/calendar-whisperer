# Technical direction

Microsoft Graph calendar data to provide events data of the person logging in using their outlook email

Azure Authentication with device code and caching. Caching must work so that a device code doesn't need to be entered every time.

You need to support a CLI interface and a web interface, you must be modular in how you build the application to keep it DRY.

## More technical direction and preferences

- use pnpm ONLY as your package manger
- use Typescript in strict mode
- be able to run the application without building
- be able to run the application after building
- use vitest for tests, you must have integration tests and unit tests ( but only for the most critical parts ).
- use prettier for formatting.
- use this tools to build the CLI with: boxen, chalk, commander, date-fns, dotenv, ora.
- Always ask before adding a new library, justify your choice while asking.
- For the web keep it simple, use a minimal react application, if you decide to use a framework let me know which one.

# How to develop

## 0) First, get context

- Before doing anything, read `README`, and package/project config.
- If missing info (test command, branch naming, CI), **ask** concise questions.

## 1) Tests 🧪

- For every new feature, **add or update tests** that demonstrate the intended behavior.
- When behavior changes, **update tests to reflect the new behavior**, not to “force green”.
- Keep tests fast; if slow, mark as integration/e2e and isolate from unit runs.

## 2) Commit discipline ✍️

- Use **Conventional Commits** with small, meaningful commits:
  `feat(scope): short imperative summary`
  Include body + breaking change footer when needed.
- Run the project’s tests **before each commit**. If tests fail, **do not commit**.

## 3) Branching 🔀

- Never work on `main`/`master`. If currently on it:
  1. Notify: “On main—creating a feature branch.”
  2. Create branch using repo convention (e.g., `feat/<ticket>-<slug>`), then continue.
- Push branches and open PRs; **never push directly** to protected branches.

## 4) Documentation 📝

- After implementing a feature, **update the README and relevant docs** (`/docs`, changelog, examples).
- Ensure examples and commands are still correct; remove stale sections; keep structure tidy.

## 5) Pre-merge checklist ✅

- All tests pass locally and in CI.
- Lint/type checks pass.
- Docs updated (README/CHANGELOG/examples).
- PR description explains **what/why**, links ticket, and notes breaking changes.

## 6) Safety rails 🛡️

- If a rule conflicts with repo policy, **ask** and align to the repo’s source of truth.
- If automation fails (e.g., can’t create a branch), **stop and report** with exact error output.

## 7) Code style and conventions

1. FP-first, minimal OOP

- Avoid classes entirely.
- Only exception: custom errors that extend `Error`.
- Prefer pure functions, modules, closures, and plain JavaScript objects.
- Use composition over inheritance. No `this`, no `new`, no prototypes.

2. Explicit, verbose naming

- Names must be intention-revealing and self-documenting.
- Include domain terms and units where relevant (e.g., `timeoutMs`, `priceGBP`).
- Booleans start with is/has/should; functions are verbs; data are nouns.
- Avoid abbreviations unless industry-standard (id, URL, HTML).

3. Comments explain WHY, not HOW

- Write comments only for rationale, constraints, trade-offs, invariants, and gotchas.
- Do not narrate implementation steps or restate code.

4. API & data shape

- Prefer small, focused functions. If >3 params, accept a single options object.
- Favor immutable returns; isolate side effects at the edges.
- Prefer data-first utilities (inputs first, options last; return new values).

5. Legacy/class code encountered

- Propose a functional alternative. If blocked, limit any class usage to the touched scope.
- Never introduce inheritance hierarchies; keep error subclasses trivial.
