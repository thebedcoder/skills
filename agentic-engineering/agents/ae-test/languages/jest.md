# Jest / Vitest

## File and naming conventions

```
src/
  users/
    users.service.ts
    users.service.test.ts    ← co-located (preferred)
    users.service.spec.ts    ← also valid

__tests__/
  users.test.ts              ← alternative: separate tests dir

# Test names — be descriptive
describe('UserService', () => {
    describe('createUser', () => {
        it('returns user with generated id', ...)         ✓
        it('throws ValidationError for invalid email', ...) ✓
        it('test 1', ...)                                  ✗
    })
})
```

## Assertions — use the right matcher

```javascript
// Existence
expect(result).toBeDefined()          // not undefined
expect(result).not.toBeNull()         // not null
expect(result).toBeTruthy()           // truthy (catches 0, "", false — be careful)

// Equality
expect(result).toBe(42)               // strict equality (===)
expect(result).toEqual({ id: 1 })     // deep equality — use for objects/arrays
expect(result).toStrictEqual({...})   // deep + checks undefined properties

// Collections
expect(array).toHaveLength(3)
expect(array).toContain(item)
expect(array).toEqual(expect.arrayContaining([1, 2]))  // subset match

// Strings
expect(str).toMatch(/pattern/)
expect(str).toContain('substring')

// Numbers
expect(value).toBeCloseTo(3.14, 2)   // for floats

// Errors
await expect(asyncFn()).rejects.toThrow('error message')
expect(() => syncFn()).toThrow(TypeError)
```

## Async patterns

```javascript
// Always await async tests
it('fetches user', async () => {
    const user = await getUser(1)
    expect(user.id).toBe(1)
})

// Rejections — must await or return
it('throws on invalid id', async () => {
    await expect(getUser(-1)).rejects.toThrow('Invalid ID')
})

// Bug — no await, assertion may run before completion
it('saves user', () => {
    saveUser(data)             // not awaited
    expect(db.size).toBe(1)   // may be 0 still
})
```

## Mocking

```javascript
// Mock a module
jest.mock('../emailService')
import emailService from '../emailService'   // auto-mocked

// Mock a specific function
const mockSend = jest.fn().mockResolvedValue({ success: true })
emailService.send = mockSend

// Verify calls
expect(mockSend).toHaveBeenCalledTimes(1)
expect(mockSend).toHaveBeenCalledWith({
    to: 'user@example.com',
    subject: expect.stringContaining('Welcome')
})

// Reset between tests
beforeEach(() => {
    jest.clearAllMocks()     // clears call history
    jest.resetAllMocks()     // also resets implementations
    jest.restoreAllMocks()   // restores original implementations (spies)
})

// Spying on real implementation
const spy = jest.spyOn(service, 'save')
// ... do work ...
expect(spy).toHaveBeenCalled()
spy.mockRestore()   // restore original
```

## Timer mocking

```javascript
beforeEach(() => { jest.useFakeTimers() })
afterEach(() => { jest.useRealTimers() })

it('retries after delay', async () => {
    const promise = operationWithRetry()
    jest.advanceTimersByTime(3000)   // fast-forward
    await promise
    expect(mockFn).toHaveBeenCalledTimes(2)
})
```

## Setup / teardown

```javascript
// Shared setup
let db, service

beforeAll(async () => {
    db = await createTestDatabase()   // once for all tests in suite
})

afterAll(async () => {
    await db.close()
})

beforeEach(() => {
    service = new UserService(db)   // fresh per test
    jest.clearAllMocks()
})
```

## React Testing Library patterns

```javascript
// Query by role (most resilient)
const button = screen.getByRole('button', { name: /submit/i })
const input = screen.getByRole('textbox', { name: /email/i })

// Avoid querying by test-id unless necessary
// screen.getByTestId('submit-btn')   — couples test to implementation

// Async rendering
await waitFor(() => {
    expect(screen.getByText('Loaded!')).toBeInTheDocument()
})

// User events (prefer @testing-library/user-event over fireEvent)
await userEvent.click(button)
await userEvent.type(input, 'alice@example.com')
```

## What to flag

- `expect(result).toBeTruthy()` where specific value expected
- No `await` on async assertions
- `jest.fn()` with no assertion on how it was called
- `mockResolvedValue` used but actual integration never tested
- `beforeAll` mutating shared state that tests depend on
- Tests with `setTimeout` or `setInterval` without fake timers
- `console.error` expected in test but not suppressed (noisy output)
