---
paths:
  - "**/*.ts"
  - "**/*.js"
  - "src/**/*.ts"
  - "routes/**/*.ts"
---

# Node + Express Rules

## Structure
- Separate: `routes/` (wiring), `controllers/` (request handling), `services/` (business logic), `models/` (data access)
- No business logic in routes or controllers — services only
- One router per resource, mounted at base path in main app

## Middleware
- Error handler registered last — takes `(err, req, res, next)` signature
- `express-async-errors` or wrap handlers with `asyncHandler` — unhandled rejections are silent bugs
- Auth middleware before route handlers — never check auth inside handlers
- `helmet` and `cors` configured explicitly — never permissive defaults

## Request validation
- Validate every request body, query, and params — Zod or similar
- Reject on validation failure before reaching handler — 400 with structured errors
- Never trust `req.body` directly — always validated
- Types derived from schemas (not duplicated)

## Error handling
- Custom error classes with status codes: `class NotFoundError extends Error { statusCode = 404 }`
- `next(err)` for all errors — don't send responses from try/catch in middleware-style code
- Error handler returns consistent JSON shape: `{ error: { message, code } }`
- Log errors with context before responding — never leak stack traces in production

## Responses
- Always return JSON with consistent structure
- Status codes match semantics: 200, 201 for created, 204 for no content, 400 for validation, 401 auth, 403 forbidden, 404 not found, 409 conflict, 500 server
- Never mix `res.send`, `res.json`, `res.end` — pick one per project

## Async
- Async/await everywhere — no `.then()` chains in new code
- Never `await` in `for...of` when work is parallelizable — use `Promise.all`
- Always handle rejections — no floating promises

## Security
- Rate limiting on auth endpoints — `express-rate-limit`
- Secrets from env, never in code
- SQL via parameterized queries or ORM — never string concatenation
- CORS origins explicit — never `origin: '*'` with credentials
