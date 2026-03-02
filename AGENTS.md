# AGENTS Guide
This guide is for autonomous coding agents working in this repository.
Apply these conventions by default unless a user request explicitly overrides them.
## Project Snapshot
- Full-stack monorepo.
- Frontend: React (CRA) + Tailwind at repo root (`src/`, `public/`).
- Backend: Spring Boot + Kotlin in `backend/`.
- API path convention: `/api/v1/*`.
- Local infra: PostgreSQL + RabbitMQ via `docker-compose.yml`.
## Rules Files Found
- Cursor rules: none found (`.cursor/rules/` and `.cursorrules` are absent).
- Copilot rules: found at `.github/copilot-instructions.md`.
- This AGENTS file incorporates that Copilot guidance and current code patterns.
## Core Agent Rules
- Make minimal, targeted edits; avoid broad refactors unless requested.
- Preserve existing architecture and naming conventions.
- Keep frontend/backend contracts aligned (fields, validation, and error shapes).
- Never commit `.env` files, tokens, passwords, or credential-bearing artifacts.
- Prefer existing dependencies/utilities before adding new packages.
## Setup and Toolchain
- Node.js: CI uses Node 20.
- Java: JDK 17.
- Kotlin: 1.9.x with `-Xjsr305=strict`.
- Spring Boot: 3.5.x.
Initial setup (run from repo root):
```bash
npm ci
docker compose up -d
```
## Build, Lint, and Test Commands
Run from repo root unless noted otherwise.
### Frontend Commands (root)
```bash
npm ci
npm start
npm run build
npm test
npx eslint src/ --max-warnings=0
npm test -- --watchAll=false --ci --coverage
```
Run a single frontend test file:
```bash
npm test -- --watchAll=false --runTestsByPath src/__tests__/LoginForm.test.js
```
Run a single frontend test by name:
```bash
npm test -- --watchAll=false --testNamePattern="renders sign in button"
```
### Backend Commands (`backend/`)
Linux/macOS:
```bash
cd backend
./gradlew bootRun
./gradlew test --no-daemon
./gradlew build
./gradlew check
```
Windows:
```bash
cd backend
gradlew.bat bootRun
gradlew.bat test --no-daemon
gradlew.bat build
gradlew.bat check
```
Run a single backend test class:
```bash
./gradlew test --tests "com.golinks.golinks.service.AuthServiceTest"
```
Run a single backend test method (best effort):
```bash
./gradlew test --tests "*AuthServiceTest.login*"
```
Notes for single backend tests:
- Kotlin backtick test names can be difficult to match with `--tests`.
- If method-level filtering fails, run the class-level command.
### Local Infrastructure
```bash
docker compose up -d
docker compose down
```
Useful local ports: Postgres `5432`, RabbitMQ `5672`, RabbitMQ UI `15672`.
## Frontend Style Guide
### Language, Naming, and File Layout
- JavaScript-first repo; do not introduce TypeScript unless requested.
- Components and component files use `PascalCase`.
- Hooks use `use*` with `camelCase`.
- Service wrappers use `*Service.js` naming.
- Shared endpoints/constants belong in `src/utils/constants.js`.
### Imports and Formatting
- Import order: third-party imports, blank line, then local imports.
- Prefer named imports where exports are named.
- Match surrounding format:
  - 2-space indentation,
  - single quotes,
  - semicolons,
  - trailing commas where used nearby.

### Types, Validation, and Data Flow
- Use Zod schemas in `src/schemas/` for runtime typing/validation.
- Use `react-hook-form` with Zod resolver for form handling.
- Keep network requests inside `src/services/*` modules.
- Use React Query for server state and invalidate relevant query keys after mutations.

### Styling and UX
- Use Tailwind utility classes.
- Prefer semantic design tokens from `tailwind.config.js` over raw hex values.
- Use `lucide-react` for icons.
- Use `framer-motion` where motion adds clarity, not noise.
- Preserve existing dark-theme visual language unless redesign is requested.

### Frontend Error Handling
- Inspect `err.response?.status` and backend payloads.
- Surface user feedback using `react-hot-toast`.
- Preserve interceptor behavior in `src/services/api.js`:
  - 401 may trigger refresh logic,
  - 429 should surface retry guidance,
  - 403 should not trigger refresh retry.

## Backend Style Guide
### Architecture and Naming
- Follow layered architecture: controller -> service -> repository.
- Keep DTOs in `dto`, entities in `entity`, exceptions in `exception`.
- Keep business logic in services, not controllers.
- Use explicit, domain-specific class and method names.

### Kotlin, Validation, and Transactions
- Prefer non-null types by default; nullable only when required.
- Write small cohesive functions with descriptive names.
- Keep request/response naming consistent (`*Request`, `*Response`).
- Apply Jakarta validation annotations to request DTO fields.
- Use `@Valid` on controller request bodies.
- Place transactional boundaries in services with `@Transactional`.

### Persistence, Errors, and Logging
- Keep entity changes synchronized with Flyway migrations.
- Flyway naming pattern: `V{version}__{description}.sql`.
- Throw domain exceptions from services.
- Map API errors in `GlobalExceptionHandler` with stable response shapes.
- Return correct HTTP status codes for each failure mode.
- Log contextual IDs/operations, never secrets/passwords/tokens.

## Cross-Cutting Contracts
- API base path: `/api/v1`.
- Frontend API env var: `REACT_APP_API_URL` (default `/api/v1`).
- Active workspace key: `golinks_active_workspace_id`.
- Workspace request header: `X-Workspace-Id`.
- Auth model: bearer access token + HTTP-only refresh cookie (`/auth/refresh`).

## Testing Conventions
- Frontend: Jest + React Testing Library under `src/__tests__/`.
- Backend: Spring Boot + JUnit 5 under `backend/src/test/kotlin/`.
- Backend integration tests should use `@ActiveProfiles("test")`.
- Prefer deterministic tests; avoid network-dependent unit tests.

## Agent Checklist
- Before edits: inspect related module, service, schema/DTO, and tests.
- After edits: run targeted tests first, then broader lint/build as needed.
- If blocked, report the exact failing command and error, then propose next steps.
- Never commit `.env` files or any credential-bearing artifacts.
