# Review agent reference files

Each review agent loads reference files on demand, based on what the diff
contains. They live at `${CLAUDE_PLUGIN_ROOT}/references/<agent>/` — outside
`agents/`, because every `.md` under a plugin's `agents/<name>/` registers as its
own dispatchable subagent type.

No generic checklists, no pattern-matching noise — each reference defines what
"vulnerable", "broken", or "missing" looks like in that specific context, with
real code examples.

Paths below are relative to `${CLAUDE_PLUGIN_ROOT}/references/<agent>/`.

### 🔴 RED — Bug Hunter
```
  null-safety.md          null dereference, forced unwrap, map access
  async-concurrency.md    unhandled promises, goroutine bugs, deadlocks
  error-handling.md       swallowed errors, fail-open, wrong propagation
  type-data.md            overflow, float precision, NaN, coercion
  resource-management.md  file/connection/goroutine leaks
  logic-bugs.md           off-by-one, wrong comparators, mutation in loop
  state-bugs.md           mutable defaults, shared state, closure capture
languages/
  python.md  javascript.md  go.md  rust.md  swift.md  kotlin-java.md  dart.md
```

### 🧪 TEST — Coverage Reviewer
```
  coverage-principles.md  what to test, scenario types, regression thinking
  test-doubles.md         mocks/stubs/fakes and when each is right
  async-testing.md        async test patterns, fake timers, timing bugs
  test-quality.md         trivial tests, over-mocking, flaky patterns
languages/
  pytest.md  jest.md  go-test.md  rust-test.md  xctest.md  junit.md  flutter-test.md
```

### 🔐 SEC — Security Reviewer
```
  injection.md          SQL, NoSQL, OS command, LDAP, template
  xss.md                reflected, stored, DOM-based XSS
  authorization.md      IDOR, privilege escalation, JWT issues
  authentication.md     password hashing, sessions, OAuth flows
  cryptography.md       weak algorithms, insecure random, TLS
  data-protection.md    hardcoded secrets, PII, sensitive logging
  ssrf.md               server-side request forgery
  csrf.md               cross-site request forgery
  file-security.md      path traversal, file upload, XXE, zip slip
  api-security.md       mass assignment, GraphQL, rate limiting
  business-logic.md     race conditions, workflow bypass, numeric issues
  modern-threats.md     LLM injection, WebSocket, prototype pollution
  misconfiguration.md   debug mode, CORS, hardcoded config
  error-handling.md     verbose errors, fail-open patterns
  deserialization.md    pickle, YAML, Java ObjectInputStream
  supply-chain.md       dependency confusion, CI/CD injection
languages/
  python.md  javascript.md  go.md  rust.md  java.md  swift.md  kotlin.md  dart.md
```

### 🎨 UX — Fidelity Reviewer
Runs after frontend implementation — not in the parallel pass.
```
  interaction-states.md   loading, empty, error, disabled, success states
  forms-validation.md     input feedback, error messages, submission handling
  visual-consistency.md   spacing, hierarchy, color, typography
  copy-feedback.md        labels, error text, empty states, confirmations
  responsive.md           breakpoints, mobile behavior, touch targets
  accessibility.md        keyboard nav, screen readers, contrast, focus
```
