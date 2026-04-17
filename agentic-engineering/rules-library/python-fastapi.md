---
paths:
  - "**/*.py"
  - "app/**/*.py"
  - "api/**/*.py"
---

# Python + FastAPI Rules

## Project structure
- Separate routers, services, and models — don't put business logic in route handlers
- Dependency injection via `Depends()` — not global state or singletons
- One router per resource: `routers/users.py`, `routers/orders.py`
- Shared dependencies in `dependencies.py`

## Routes
- Always declare response model: `@app.get("/users/{id}", response_model=UserResponse)`
- HTTPException with explicit status codes — never raise generic exceptions to the client
- Path params typed, query params typed with `Query()` for validation
- Return Pydantic models, not dicts — ensures type safety and docs

## Pydantic
- Separate `Create`, `Update`, `Response` models — don't reuse DB models for API
- Use `Field()` for validation constraints: `Field(min_length=1, max_length=100)`
- `ConfigDict(from_attributes=True)` for ORM mode
- Pydantic v2 syntax only — `model_config`, `model_validate`, not v1 equivalents

## Async
- All route handlers `async def` — even if body isn't awaiting anything (consistency)
- No blocking I/O in async handlers — use `httpx.AsyncClient`, `aiofiles`, async DB drivers
- CPU-bound work in `run_in_executor` or worker processes

## Database
- SQLAlchemy 2.0 syntax — `select()` statements, not legacy query API
- Async sessions via `AsyncSession`
- Migrations via Alembic — never modify DB schema directly
- Transaction boundaries explicit — use context managers

## Error handling
- Custom exception classes per domain: `UserNotFoundError`, `PaymentFailedError`
- Exception handlers registered at app level for consistent error shapes
- Never leak internal details in error responses
- Log with `logger.exception()` to capture stack traces

## Testing
- pytest + `httpx.AsyncClient` for integration tests
- Fixtures in `conftest.py` — DB transaction rollback per test
- Mock external services, not the code being tested
