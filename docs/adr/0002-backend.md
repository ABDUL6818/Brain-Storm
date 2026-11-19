# ADR 0002: Backend Module Boundaries and Error Strategy

- **Status:** Accepted
- **Date:** 2025-01-01
- **Deciders:** Backend Team
- **Related:** ADR 0001, Issue #1428, Issue #1

## Context

The backend lives in `apps/backend/src` and is built on NestJS within a monorepo. As the codebase has grown, several concerns have emerged:

- **Feature sprawl.** Business capabilities (authentication, access control, administration, analytics, auditing, caching, certificates, bookings, batch processing) were increasingly interleaved, making ownership and change impact unclear.
- **Cross-cutting concerns.** Guards, interceptors, pipes, and filters were being re-implemented or duplicated across features, leading to inconsistent behavior (e.g., different authorization checks, inconsistent logging).
- **Inconsistent error handling.** Errors were thrown as ad-hoc strings, generic `Error` instances, or HTTP exceptions in different places. API consumers could not rely on a stable error shape, and internal error types were not shared with the frontend or other packages.
- **Onboarding cost.** New contributors and API consumers had to reverse-engineer module structure and error semantics from the code ("tribal knowledge").

This ADR captures the decisions that resolve these problems so that new contributors and API consumers can onboard without tribal knowledge.

## Decision

### 1. Module boundaries

The backend is organized into feature modules under `apps/backend/src`, each owning a single business capability. The primary modules are:

| Module | Responsibility |
| --- | --- |
| `auth` | Authentication (login, token issuance/validation, session handling). |
| `access-control` | Authorization: roles, permissions, policies, and guards that enforce them. |
| `admin` | Administrative operations and management endpoints. |
| `analytics` | Usage/metrics collection and reporting. |
| `audit` | Audit logging of security- and business-relevant events. |
| `cache` | Caching infrastructure and cache-backed services. |
| `certificates` | Certificate lifecycle management. |
| `bookings` | Booking domain logic and endpoints. |
| `batch` | Batch/background job processing. |

Rules for module boundaries:

- **One capability per module.** A module exposes a public surface via its `*.module.ts` and services; other modules must not reach into a module's internals.
- **Depend through interfaces/services, not internals.** Cross-module interaction happens via exported providers (services) or shared contracts, never by importing another module's private files directly.
- **Shared, cross-cutting code lives outside feature modules.** Guards, interceptors, pipes, filters, and shared utilities are placed in common/shared locations and consumed by feature modules.
- **Shared types live in `packages/types`.** Contracts shared across apps/packages (including error types) belong in the shared types package, not in `apps/backend/src`.

### 2. Cross-cutting concerns

Cross-cutting behavior is implemented once and applied consistently:

- **Guards** enforce authentication and authorization (notably from `access-control`) and are applied at the controller or global level.
- **Interceptors** handle concerns such as response shaping, logging, and timing.
- **Pipes** handle validation and transformation of inputs.
- **Filters** handle exception translation (see error strategy below).

Feature modules should not re-implement these concerns; they compose the shared implementations.

### 3. Centralized error strategy

- **Canonical error types** are defined in `packages/types/src/error.types.ts`. These shared types define the stable error contract used across the backend and by API consumers.
- **Throw typed errors.** Backend code throws errors using the shared error types (or domain-specific errors that map to them) rather than ad-hoc strings or generic `Error` instances.
- **Exception filters translate errors.** NestJS exception filters convert thrown errors into a consistent HTTP response shape derived from the shared error types, so API consumers receive a predictable payload (e.g., a stable error code/message structure).
- **No leaking internals.** Filters ensure internal details (stack traces, implementation specifics) are not exposed to API consumers; unexpected errors are mapped to a generic error response while being logged for operators.
- **Consistency across modules.** All feature modules rely on the same filters and error types, so error behavior is uniform regardless of which module handles a request.

## Consequences

### Positive

- **Clear ownership and change impact.** Each module maps to a business capability, making it easier to locate code and assess the blast radius of changes.
- **Consistent behavior.** Centralized guards, interceptors, pipes, and filters eliminate duplicated cross-cutting logic.
- **Stable API error contract.** Shared error types plus exception filters give API consumers a predictable error shape and keep internal details private.
- **Lower onboarding cost.** Documented boundaries and error semantics replace tribal knowledge.

### Negative / Trade-offs

- **Upfront discipline required.** Contributors must place code in the correct module and use shared error types; reviewers must enforce this.
- **Shared package coupling.** Changes to `packages/types/src/error.types.ts` affect both backend and consumers and must be versioned/coordinated carefully.
- **Some indirection.** Cross-module interaction via services/contracts adds a layer compared to direct imports.

### Follow-ups

- Keep this ADR updated as modules are added, split, or removed.
- Ensure new modules follow the boundary and error rules above and are reflected in this document.

## Verified Commands

The following commands were run and verified as part of authoring this ADR:

- `npm run start:dev` — starts the backend in watch mode; verified the application boots with the documented module structure.
- `npm test` — runs the backend test suite; verified tests pass.
- `scripts/ci-local.sh` — runs the local CI pipeline (lint, build, tests); verified it completes successfully.

## References

- `apps/backend/src` — backend source and feature modules.
- `packages/types/src/error.types.ts` — canonical shared error types.
- ADR 0001 — prior architecture decision record.
- Issue #1428 — documentation request for backend module boundaries and error strategy.
- Issue #1 — related issue.
- `README.md` and `CONTRIBUTING.md` — link to this ADR for onboarding.