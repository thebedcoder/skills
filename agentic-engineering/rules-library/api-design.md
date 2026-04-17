---
paths:
  - "**/api/**"
  - "**/routes/**"
  - "**/controllers/**"
  - "**/handlers/**"
---

# API Design Rules

## REST conventions
- Resource nouns plural: `/users`, `/orders`, `/payments` — not `/getUser`
- Nested resources only 1-2 levels deep: `/users/123/orders` OK, `/users/123/orders/456/items/789` too deep
- HTTP methods match semantics: GET (read, idempotent), POST (create), PUT (replace), PATCH (update), DELETE
- Query params for filtering/pagination/sorting — never in path

## Status codes
- 200 OK — successful GET, PUT, PATCH
- 201 Created — successful POST that created a resource
- 204 No Content — successful DELETE, or PUT with no body to return
- 400 Bad Request — malformed request, validation failure
- 401 Unauthorized — not authenticated
- 403 Forbidden — authenticated but not allowed
- 404 Not Found — resource doesn't exist
- 409 Conflict — version conflict, duplicate key
- 422 Unprocessable — valid request shape but rejected for business reasons
- 429 Too Many Requests — rate limited
- 500 Server Error — unexpected, our problem
- 503 Service Unavailable — dependency down, maintenance

## Response shape
- Consistent across endpoints — don't vary structure per resource
- Errors: `{ "error": { "code": "USER_NOT_FOUND", "message": "...", "details": {...} } }`
- Collections: `{ "data": [...], "pagination": { "next": "...", "total": 100 } }`
- Singles: `{ "data": { ... } }` or just the object — pick and stick
- Timestamps ISO 8601 with timezone: `2026-04-16T14:30:00Z`

## Pagination
- Cursor-based for large datasets — stable with inserts/deletes
- Offset-based OK for small datasets with stable order
- Always return `next` / `prev` cursors — don't make client construct them
- Never return unbounded lists — default page size, max page size

## Versioning
- Version in URL (`/v1/...`) or in Accept header — pick one
- Breaking changes require new version — not silent changes
- Deprecate old versions with timeline — `Sunset` header

## Authentication
- Bearer tokens in Authorization header — not query params (leaks to logs)
- Tokens: JWT with short expiry + refresh, or opaque tokens checked against DB
- Never rotate secrets silently — publish rotation plan

## Rate limiting
- Return `429` with `Retry-After` header
- Document limits in API docs — don't surprise clients
- Rate limit auth endpoints specifically — login, registration, password reset

## Documentation
- OpenAPI spec or similar — generated from code where possible
- Examples for every endpoint — request and response
- Error codes enumerated — clients build handlers against them
- Breaking change log maintained
