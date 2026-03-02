# Project Guidelines

## Architecture

Full-stack monorepo: React frontend at root, Spring Boot Kotlin backend in `backend/`.

- **Frontend**: React 19 (CRA) + Tailwind CSS 3 + React Router 7 + React Query + axios + react-hook-form/zod
- **Backend**: Spring Boot 3.5 + Kotlin 1.9 (JVM 17) + Spring Data JPA + PostgreSQL + Flyway + Spring Security (OAuth2/JWT) + RabbitMQ
- **Communication**: REST JSON APIs via axios → Spring MVC controllers. React Query manages server state. Auth uses JWT tokens stored in cookies (`js-cookie` + `jwt-decode`).
- **Validation**: Dual — Zod schemas on frontend, Jakarta Bean Validation on backend.

## Code Style

- **Frontend**: ESLint extends `react-app` + `react-app/jest` (configured in `package.json`). Use functional components with hooks.
- **Backend**: Kotlin with `-Xjsr305=strict` for null-safety. JPA entities use `allOpen` plugin (see `build.gradle.kts`).
- **Styling**: Tailwind utility classes only. Custom design tokens defined in `tailwind.config.js` — use semantic color names (`primary`, `dark`, `success`, `danger`, etc.) instead of raw hex values. Dark Spotify-inspired theme with green `#1DB954` accent.
- **Icons**: Use `lucide-react`. **Animations**: Use `framer-motion`.

## Build and Test

### Frontend (run from repo root)
```
npm install          # install dependencies
npm start            # dev server on port 3000
npm test             # Jest + React Testing Library (watch mode)
npm run build        # production bundle
```

### Backend (run from `backend/`)
```
./gradlew bootRun    # run Spring Boot app
./gradlew build      # compile + test + build JAR
./gradlew test       # JUnit 5 tests
```

**Prerequisites**: PostgreSQL and RabbitMQ must be running. Configure connection details in `backend/src/main/resources/application.properties`.

## Project Conventions

- **DB migrations**: Flyway in `backend/src/main/resources/db/migration/` using naming `V{version}__{description}.sql` (e.g., `V1__create_links_table.sql`)
- **Frontend entry**: `src/index.js` renders `<App />` inside `<React.StrictMode>` to `#root`
- **Tailwind content**: Scans `./index.html` and `./src/**/*.{js,ts,jsx,tsx}` — new component directories must match this glob
- **Backend entry**: `GolinksApplication.kt` — standard `@SpringBootApplication` + `runApplication<>()`
- **Testing**: Frontend uses `@testing-library/react` + `jest-dom`; Backend uses `@SpringBootTest` + JUnit 5 + `spring-security-test` + `spring-rabbit-test`
- **Notifications**: Use `react-hot-toast`. **Charts**: Use `recharts`. **QR codes**: Use `qrcode.react`.

## Integration Points

- **API prefix**: All REST endpoints use `/api/v1/` prefix (e.g., `/api/v1/links`, `/api/v1/auth`).
- **OAuth2**: Google and GitHub providers. Backend acts as both OAuth2 client and resource server. Configure `spring.security.oauth2.client.registration.google.*` and `spring.security.oauth2.client.registration.github.*` in `application.properties`. Frontend decodes JWTs client-side for UI logic but never trusts them for authorization.
- **RabbitMQ**: Used for async backend processing (e.g., click analytics). Spring AMQP handles message production/consumption.
- **Caching**: Spring Cache enabled — use `@Cacheable` on frequently accessed link lookups.
- **Monitoring**: Spring Actuator available at `/actuator` endpoints.

## Deployment

Docker Compose manages local infrastructure. Run from repo root:
```
docker-compose up -d   # start PostgreSQL + RabbitMQ
docker-compose down    # stop and remove containers
```
Services:
- **PostgreSQL**: `localhost:5432`, db `golinks`, user `golinks`, password `golinks`
- **RabbitMQ**: `localhost:5672` (AMQP), `localhost:15672` (management UI), user `guest`/`guest`
