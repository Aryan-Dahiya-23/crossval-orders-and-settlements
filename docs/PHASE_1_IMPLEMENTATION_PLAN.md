# Phase 1 Implementation Plan — Monorepo Foundation

## Implementation status

Completed and verified on 2026-08-14.

Selected baseline:

- Node.js 24.16.0 and pnpm 11.5.2;
- Next.js 16.3.1 and React 19.2.8;
- Express 5.2.1;
- TypeScript 6.0.3;
- TanStack Query 5.101.4;
- Vitest 4.1.10;
- ESLint 9.39.5 and Prettier 3.9.6.

Verification completed:

- isolated `pnpm install --frozen-lockfile`;
- peer dependency audit;
- format, lint, strict typecheck, tests, and production builds;
- concurrent local web/API startup and clean shutdown;
- API 200/404 HTTP smoke checks;
- rendered web-page and browser-console inspection.

No database, authentication, order, payment, or dashboard behavior was introduced.

## 1. Objective

Create the smallest production-shaped pnpm monorepo that can run, type-check, lint, test, and build the Next.js web application, Express API, and shared contracts package.

Phase 1 establishes boundaries and developer workflow only. It must not implement authentication, MongoDB collections, order rules, payment behavior, or dashboard features.

## 2. Authorization boundary

This document began as an execution plan and now records the completed Phase 1 scope. Further phases still require their own explicit approval.

## 3. Starting conditions

- Phase 0 documentation is complete.
- The workspace currently contains Markdown planning documents and the assignment PDF only.
- There is no existing application code or package configuration to preserve.
- Current dependency and runtime versions must be verified immediately before installation because they change over time.

## 4. Phase boundaries

### Included

- Initialize Git and repository ignore rules.
- Pin Node.js, pnpm, and package-manager metadata.
- Create the pnpm workspace.
- Scaffold `apps/web`, `apps/api`, and `packages/contracts`.
- Establish strict TypeScript configuration.
- Establish linting and formatting.
- Add root orchestration commands.
- Add minimal unit-test infrastructure.
- Add environment-variable examples and validation seams.
- Add a minimal React Query provider boundary.
- Add a minimal API liveness route.
- Verify local development and production builds.
- Update documentation to reflect the real scaffold.

### Excluded

- MongoDB and collection validators/indexes/migrations; these begin in Phase 2.
- User, Session, Order, OrderItem, or Payment schemas.
- Signup, login, logout, cookies, or authentication middleware.
- Order calculations, status derivation, atomic payment writes, or idempotency behavior.
- Dashboard, forms, business tables, Align UI composition, or product styling.
- Deployment configuration.
- CI/CD workflows unless separately approved.
- Placeholder domain endpoints or mock financial data.

## 5. Decisions fixed for this phase

| Concern           | Decision                                                                                        |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Workspace         | pnpm workspaces without Turborepo/Nx                                                            |
| Language          | Strict TypeScript everywhere                                                                    |
| Module system     | ESM-compatible packages; each runtime's configuration must be explicit                          |
| Web               | Next.js App Router                                                                              |
| API               | Express application separated from the listening server                                         |
| Shared package    | Source-first contracts package with a narrow public export                                      |
| Server state      | TanStack Query provider installed and wired, with no business queries yet                       |
| Tests             | Vitest as the initial unit-test runner                                                          |
| Formatting        | Prettier                                                                                        |
| Linting           | ESLint with TypeScript and Next.js-aware rules                                                  |
| Dev orchestration | One root command runs web and API; no task-runner platform                                      |
| Package versions  | Resolve current mutually compatible stable versions at execution time, then commit the lockfile |

If current tool compatibility requires changing one of these decisions, record the change in `docs/DECISIONS.md` before proceeding.

## 6. Target repository shape after Phase 1

```text
crossval/
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── app.ts
│   │   │   ├── index.ts
│   │   │   └── server.ts
│   │   ├── tests/
│   │   │   └── health.test.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/
│       ├── app/
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── components/
│       │   └── providers/
│       │       └── query-provider.tsx
│       ├── public/
│       ├── next-env.d.ts
│       ├── next.config.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   └── contracts/
│       ├── src/
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
├── docs/
├── .editorconfig
├── .env.example
├── .gitignore
├── .node-version
├── .prettierignore
├── .prettierrc.json
├── eslint.config.mjs
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

Exact framework-generated filenames may differ when the current stable Next.js scaffold requires it. Do not retain unused starter assets or instructional content.

## 7. Work sequence

### Step 1 — Preflight and compatibility resolution

Actions:

1. Confirm the workspace contains no user code or hidden local instructions that change the plan.
2. Verify current stable versions and compatibility for Node.js, pnpm, Next.js, React, Express, TypeScript, TanStack Query, Vitest, ESLint, and Prettier using primary documentation/package metadata.
3. Select a currently supported Node.js LTS release.
4. Select one pnpm version compatible with that runtime.
5. Record the Node version in `.node-version` and the pnpm version in the root `packageManager` field.
6. Record any compatibility-driven architecture change in `docs/DECISIONS.md`.

Outputs:

- Runtime version decision.
- Package-manager version decision.
- Dependency compatibility list for the three packages.

Gate:

- No package installation begins until the chosen versions are mutually compatible.

### Step 2 — Initialize repository metadata

Actions:

1. Initialize Git only if the workspace is still not a Git repository.
2. Create `.gitignore` for dependencies, build outputs, caches, coverage, environment secrets, OS/editor files, database artifacts where applicable later, and Playwright artifacts.
3. Create `.editorconfig` for UTF-8, final newlines, spaces, and consistent indentation.
4. Create `.env.example` containing names and safe placeholders only.
5. Confirm the assignment PDF and documentation remain tracked candidates.

Initial environment names:

| Variable                    | Consumer | Phase 1 purpose                           |
| --------------------------- | -------- | ----------------------------------------- |
| `API_PORT`                  | API      | Local listener port                       |
| `WEB_ORIGIN`                | API      | Future same-origin/CORS seam              |
| `NEXT_PUBLIC_API_BASE_PATH` | Web      | Browser API base path, expected `/api/v1` |

Database and session variables are added in their owning phases rather than speculated here.

Gate:

- `git status` shows only intentional Phase 1 and existing documentation files.
- No `.env` containing real values is trackable.

### Step 3 — Create the root workspace

Actions:

1. Create a private root `package.json`.
2. Define `packageManager` and `engines` consistently with Step 1.
3. Create `pnpm-workspace.yaml` covering `apps/*` and `packages/*`.
4. Create strict `tsconfig.base.json` with no emitted JavaScript at the root.
5. Add root commands that delegate to workspaces.

Required root commands:

| Command             | Responsibility                              |
| ------------------- | ------------------------------------------- |
| `pnpm dev`          | Run web and API together                    |
| `pnpm dev:web`      | Run only Next.js                            |
| `pnpm dev:api`      | Run only Express                            |
| `pnpm build`        | Build all packages in dependency-safe order |
| `pnpm typecheck`    | Type-check every package                    |
| `pnpm lint`         | Lint every package                          |
| `pnpm format`       | Format supported repository files           |
| `pnpm format:check` | Check formatting without writes             |
| `pnpm test`         | Run all current tests once                  |
| `pnpm test:watch`   | Run relevant unit tests in watch mode       |

Use pnpm recursive filters and a lightweight concurrent-process helper. Do not add a monorepo build platform unless actual performance or dependency-graph needs justify it later.

Gate:

- pnpm recognizes exactly the expected workspace packages.
- Root commands fail clearly when a child command fails.

### Step 4 — Establish shared TypeScript, lint, and formatting policy

Actions:

1. Enable strict TypeScript settings, including safe indexed access and exact optional-property behavior where compatible with framework types.
2. Let each package declare its runtime-specific module, library, JSX, and emit settings.
3. Configure ESLint for TypeScript source and Next.js source without duplicate/conflicting rule engines.
4. Configure Prettier once at the root.
5. Exclude generated and build outputs without excluding authored source.
6. Make lint, format, and type checks non-interactive and CI-compatible.

TypeScript baseline intent:

- strict null checks;
- no implicit `any`;
- no unchecked indexed assumptions;
- consistent casing;
- no emit during type checks;
- modern target supported by the selected Node.js release and browsers through Next.js.

Gate:

- Deliberate lint/type errors fail the appropriate command during setup validation, then are removed.
- No package weakens strictness without a documented framework-specific reason.

### Step 5 — Scaffold the contracts package

Actions:

1. Create `@crossval/contracts` as a private workspace package.
2. Give it a narrow `src/index.ts` public entry point.
3. Configure it to type-check and build independently.
4. Keep it runtime-neutral so both browser and API can import it.
5. Add no MongoDB driver, Express, React, Node-only, or browser-only imports.
6. Avoid defining order/payment contracts before their owning phase confirms implementation details.

The package may export only a harmless foundation marker or no business symbols initially. Its successful consumption from both applications is more important than filling it prematurely.

Gate:

- The package builds before dependent applications.
- Web and API resolve it through the workspace, not through relative cross-application imports.

### Step 6 — Scaffold the Express API shell

Actions:

1. Create a typed Express application in `app.ts` without binding a port.
2. Put local listener startup in `server.ts`.
3. Provide a deployment-compatible application export through `index.ts`.
4. Add JSON parsing with a conservative body-size limit.
5. Add only a liveness route such as `GET /health` returning a static safe response.
6. Add terminal not-found and safe unexpected-error responses only to the extent necessary for a valid shell.
7. Add graceful local shutdown handling if it remains small and testable.
8. Add one integration-style health test against the in-process Express application.

The API shell must not include fake authentication, mock orders, in-memory persistence, or placeholder payment behavior.

Gate:

- The API starts on its configured local port.
- `GET /health` returns the documented success status and body.
- An unknown route returns structured JSON rather than HTML.
- Importing `app.ts` in a test does not start a listener.

### Step 7 — Scaffold the Next.js web shell

Actions:

1. Scaffold the App Router with TypeScript.
2. Remove sample marketing content, unused assets, and framework tutorial copy.
3. Create a minimal semantic page identifying the project and foundation status.
4. Keep styling intentionally minimal; do not begin dashboard design.
5. Add TanStack Query and a client-side `QueryProvider` boundary.
6. Instantiate one browser `QueryClient` with neutral defaults consistent with `docs/FRONTEND.md`.
7. Mount the provider at the narrowest practical application boundary.
8. Add no business queries, mutation hooks, mock order data, or cache keys yet.
9. Configure the local `/api` rewrite/proxy only if it is stable in both development and production builds; otherwise document it as the first task of the API-integration phase.

Gate:

- The root page renders without console errors.
- The application builds as a production Next.js application.
- React Query Devtools are not bundled into production unintentionally.
- The web app resolves `@crossval/contracts` without importing API code.

### Step 8 — Add package-level build and test commands

Actions:

1. Give every package explicit `build`, `typecheck`, and `lint` commands.
2. Give packages with tests explicit non-watch `test` commands.
3. Configure Vitest for API and pure packages without requiring a browser.
4. Add frontend component-test infrastructure only if it can be configured cleanly without beginning Phase 6/7 work; otherwise defer Testing Library/MSW setup and record that boundary.
5. Ensure tests exit successfully and do not hang because a server or watcher remains open.

Gate:

- Root scripts exercise all applicable packages.
- There are no fake passing scripts such as commands that only print success.

### Step 9 — Install, lock, and normalize

Actions:

1. Install dependencies through pnpm.
2. Commit one root `pnpm-lock.yaml` during the eventual implementation change.
3. Remove redundant package dependencies and unused scaffold packages.
4. Confirm there is a single resolved TypeScript toolchain unless a framework requires otherwise.
5. Confirm package imports use declared workspace dependencies.
6. Run formatting once, then use check mode for verification.

Dependency categories:

| Location  | Runtime dependencies                                                    | Development dependencies                                                     |
| --------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Root      | None expected                                                           | TypeScript, ESLint stack, Prettier, concurrent command helper                |
| Web       | Next.js, React, React DOM, TanStack Query, contracts workspace          | Framework/types/lint integration                                             |
| API       | Express, contracts workspace                                            | Node/Express types, TypeScript runner/build tool, Vitest/request test helper |
| Contracts | Zod only if the first real shared boundary needs it now; otherwise none | TypeScript/build/test support                                                |

React Hook Form, the MongoDB driver, Argon2, cookie/session utilities, Align UI dependencies, Playwright, and database tooling should be installed in the phase that first uses them unless installation compatibility needs to be proven earlier.

Gate:

- A clean frozen-lockfile install succeeds after removing `node_modules` in a safe disposable verification environment.
- The lockfile has no second package manager's artifacts.

### Step 10 — Documentation reconciliation

Actions:

1. Replace planned repository-tree language in `README.md` with the actual Phase 1 shape.
2. Record exact runtime/tool versions and commands.
3. Update `ROADMAP.md` Phase 1 status only after every exit criterion passes.
4. Update `ARCHITECTURE.md` if the scaffold requires a different application entry point or package boundary.
5. Add any compatibility-driven decisions to `docs/DECISIONS.md`.
6. Keep Phase 2 marked not started.

Gate:

- A new contributor can identify the applications, commands, runtime requirements, and current phase without inspecting package internals.

## 8. Dependency ordering

```text
Runtime/version resolution
        ↓
Root workspace and shared tooling
        ↓
Contracts package
       ↙ ↘
API shell   Web shell + React Query provider
       ↘ ↙
Root orchestration and verification
        ↓
Documentation reconciliation
```

The API and web scaffolds can be built independently after the root and contracts package are stable.

## 9. Planned implementation batches

Keep the eventual work reviewable in these batches:

### Batch A — Repository and workspace

- Git metadata and ignore policy.
- Root package/workspace configuration.
- Shared TypeScript, ESLint, and Prettier configuration.

Verification: workspace discovery, format check, and configuration inspection.

### Batch B — Contracts and API foundation

- Contracts package.
- Express composition/listener split.
- Liveness route and API shell test.

Verification: contracts build, API typecheck, test, and local health request.

### Batch C — Web foundation

- Minimal Next.js application.
- React Query provider.
- Workspace contract import.

Verification: web lint, typecheck, production build, and browser console inspection.

### Batch D — Integrated workflow

- Root scripts and concurrent development command.
- Frozen-lockfile clean-install rehearsal.
- Full checks and documentation updates.

Verification: execute the complete Phase 1 command matrix.

These batches describe review units; they do not require separate commits unless the user asks for commits.

## 10. Verification matrix

| Check                 | Expected result                                                       |
| --------------------- | --------------------------------------------------------------------- |
| Runtime version check | Node and pnpm match pinned metadata                                   |
| Workspace listing     | Exactly web, API, and contracts packages appear                       |
| Clean install         | Lockfile installation completes without mutation                      |
| `pnpm format:check`   | All authored supported files pass                                     |
| `pnpm lint`           | All workspaces pass with no suppressed scaffold errors                |
| `pnpm typecheck`      | All workspaces pass strict checking                                   |
| `pnpm test`           | Health/foundation tests pass and process exits                        |
| `pnpm build`          | Contracts, API, and web production builds pass                        |
| `pnpm dev`            | Web and API run concurrently and stop cleanly                         |
| API health request    | Safe success JSON from the expected local URL                         |
| Web smoke check       | Minimal page renders without console/network errors                   |
| File audit            | No database, auth, order, payment, or dashboard implementation exists |
| Secret audit          | No real secret or local `.env` file is tracked                        |

## 11. Failure and recovery policy

- If the scaffold generator creates unexpected files, inspect and remove only confirmed unused generated content.
- If dependency installation fails because current versions are incompatible, change versions deliberately and document the resolved set; do not bypass peer-dependency safety flags without analysis.
- If lint tools conflict, prefer one authoritative rule pipeline rather than globally disabling rules.
- If ESM/CJS behavior is inconsistent, correct package boundaries and runtime configuration rather than adding scattered file-extension hacks.
- If the root dev command leaks child processes, fix signal handling before calling the phase complete.
- If React Query requires broader client rendering than expected, keep the provider client-side while preserving server components outside interactive boundaries.
- Never delete broad directories or user files while rehearsing a clean install; use a validated temporary copy or remove only generated dependency/build directories.

## 12. Exit criteria

Phase 1 is complete only when all statements are true:

- Git and ignore rules are initialized correctly.
- Node.js and pnpm versions are pinned and documented.
- One pnpm lockfile describes all three packages.
- Web, API, and contracts are independent workspace packages with declared dependencies.
- The API application can be imported without starting a listener.
- The API liveness endpoint passes an automated test.
- The Next.js shell renders and includes the React Query provider boundary.
- Root `dev`, `build`, `lint`, `format:check`, `typecheck`, and `test` commands work.
- A clean frozen-lockfile install succeeds.
- No business/domain behavior or persistence has been implemented.
- Documentation matches the resulting scaffold.
- Phase 2 can add MongoDB and the official Node.js driver without reorganizing Phase 1 foundations.

## 13. Handoff to Phase 2

The Phase 1 handoff should report:

- exact selected runtime and package versions;
- every created configuration and package boundary;
- commands executed and their results;
- any warnings intentionally accepted;
- whether the local API rewrite is already active;
- whether frontend component-test tooling was installed or deliberately deferred;
- confirmation that no domain behavior exists;
- the first Phase 2 task: establish MongoDB development/test environments and collection/driver ownership inside `apps/api`.
