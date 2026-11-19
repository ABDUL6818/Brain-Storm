# API Reference

This document is the OpenAPI reference for external consumers of the `apps/backend` API. It captures the context, decisions, and consequences of the API surface so new contributors and integrators can onboard without tribal knowledge.

## Context

`apps/backend` exposes a versioned REST API consumed by the web frontend, mobile clients, and third-party integrations. The API is described by an OpenAPI 3.0 specification that is generated from the backend controllers and DTOs. This document summarizes the key decisions and provides runnable examples.

- **Specification source of truth:** the generated OpenAPI spec served by the backend and rendered at [`docs/api/swagger-ui.html`](./api/swagger-ui.html).
- **Validation:** the spec is validated in CI by `scripts/check-openapi-spec.sh`.

## Decision

### Base URL

All endpoints are served under a single versioned base URL:

```
https://api.example.com/v1
```

For local development the backend listens on:

```
http://localhost:3000/v1
```

### Versioning

- The API version is part of the URL path (`/v1`).
- Breaking changes are introduced in a new path version (`/v2`) while the previous version remains available during a deprecation window.
- Additive, non-breaking changes (new optional fields, new endpoints) are made within the current version.
- Deprecated endpoints and fields are marked in the OpenAPI spec with `deprecated: true` and announced in release notes.

### Authentication

The API supports two authentication mechanisms. All authenticated requests must use HTTPS.

#### JWT (user sessions)

Obtain a token by authenticating, then send it as a bearer token:

```
Authorization: Bearer <jwt>
```

JWT claims carry the subject (`sub`) and the user's roles (`roles`). Tokens expire and must be refreshed using the refresh endpoint.

#### API key (server-to-server)

Service integrations authenticate with an API key sent in a header:

```
X-API-Key: <api-key>
```

API keys are scoped to a service account and inherit that account's roles.

#### Roles

Authorization is role-based. The roles referenced by the API are:

| Role | Description |
| --- | --- |
| `admin` | Full access to all resources and administrative endpoints. |
| `user` | Standard access to the caller's own resources. |
| `readonly` | Read-only access to permitted resources. |

Requests lacking the required role receive `403 Forbidden`.

### Pagination

List endpoints are paginated using query parameters:

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `page` | integer | `1` | 1-based page number. |
| `limit` | integer | `20` | Number of items per page (max `100`). |
| `sort` | string | endpoint-specific | Field to sort by, optionally prefixed with `-` for descending order. |

Paginated responses include a `meta` object:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

### Error envelope

All errors share a consistent envelope:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found.",
    "details": []
  }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `error.code` | string | Stable, machine-readable error code. |
| `error.message` | string | Human-readable description. |
| `error.details` | array | Optional field-level validation errors. |

Common status codes:

| Status | Meaning |
| --- | --- |
| `400` | Bad request / validation failure (`VALIDATION_ERROR`). |
| `401` | Missing or invalid credentials (`UNAUTHORIZED`). |
| `403` | Authenticated but not permitted (`FORBIDDEN`). |
| `404` | Resource not found (`RESOURCE_NOT_FOUND`). |
| `409` | Conflict (`CONFLICT`). |
| `429` | Rate limit exceeded (`RATE_LIMITED`). |
| `500` | Unexpected server error (`INTERNAL_ERROR`). |

### Endpoint groups

The API is organized into the following groups, derived from the backend controllers and DTOs. See the generated spec at [`docs/api/swagger-ui.html`](./api/swagger-ui.html) for the full request/response schemas.

| Group | Base path | Description |
| --- | --- | --- |
| Auth | `/v1/auth` | Login, token refresh, logout. |
| Users | `/v1/users` | User accounts and profiles. |
| Resources | `/v1/resources` | Core resource CRUD operations. |
| Health | `/v1/health` | Liveness and readiness probes. |

## Consequences

- Consumers can rely on the versioned base URL and stable error envelope to build resilient clients.
- The OpenAPI spec is the contract; changes are validated by `scripts/check-openapi-spec.sh` before merge.
- New endpoints and fields are additive within a version; breaking changes require a new version and a deprecation window.
- Authentication and role requirements are documented per endpoint in the spec, reducing integration guesswork.

## Runnable examples

The examples below assume a local backend at `http://localhost:3000/v1`. Each command has been verified against a running local backend.

### Health check

```bash
curl -s http://localhost:3000/v1/health
```

### Log in and capture a JWT

```bash
curl -s -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### Call an authenticated endpoint with a JWT

```bash
curl -s http://localhost:3000/v1/users/me \
  -H "Authorization: Bearer <jwt>"
```

### Call an endpoint with an API key

```bash
curl -s http://localhost:3000/v1/resources \
  -H "X-API-Key: <api-key>"
```

### Paginated list request

```bash
curl -s "http://localhost:3000/v1/resources?page=1&limit=20&sort=-createdAt" \
  -H "Authorization: Bearer <jwt>"
```

### Create a resource

```bash
curl -s -X POST http://localhost:3000/v1/resources \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Example"}'
```

### Observe the error envelope

```bash
curl -s http://localhost:3000/v1/resources/does-not-exist \
  -H "Authorization: Bearer <jwt>"
```

## Validating the specification

Run the spec validation script before submitting changes that touch controllers or DTOs:

```bash
./scripts/check-openapi-spec.sh
```

The rendered, interactive reference is available at [`docs/api/swagger-ui.html`](./api/swagger-ui.html).

## Related documents

- [README](../README.md)
- [CONTRIBUTING](../CONTRIBUTING.md)