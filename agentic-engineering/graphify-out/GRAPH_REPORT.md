# Graph Report - .  (2026-05-19)

## Corpus Check
- 113 files · ~47,087 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 601 nodes · 846 edges · 50 communities detected
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 135 edges (avg confidence: 0.86)
- Token cost: 34,712 input · 8,678 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Workflow Roles (README diagram)|Workflow Roles (README diagram)]]
- [[_COMMUNITY_5-Agent Review Subsystem|5-Agent Review Subsystem]]
- [[_COMMUNITY_UX Fidelity & Accessibility|UX Fidelity & Accessibility]]
- [[_COMMUNITY_Git Commit & PR Conventions|Git Commit & PR Conventions]]
- [[_COMMUNITY_REST API Design|REST API Design]]
- [[_COMMUNITY_Mobile Security (AndroidFlutter)|Mobile Security (Android/Flutter)]]
- [[_COMMUNITY_API Security & Authorization|API Security & Authorization]]
- [[_COMMUNITY_Authentication & Cryptography|Authentication & Cryptography]]
- [[_COMMUNITY_File & Path Security|File & Path Security]]
- [[_COMMUNITY_Test Coverage Principles|Test Coverage Principles]]
- [[_COMMUNITY_Go Conventions|Go Conventions]]
- [[_COMMUNITY_CSRF & CORS Misconfiguration|CSRF & CORS Misconfiguration]]
- [[_COMMUNITY_Plugin Authoring Internals|Plugin Authoring Internals]]
- [[_COMMUNITY_Flutter Conventions|Flutter Conventions]]
- [[_COMMUNITY_Node & Express Conventions|Node & Express Conventions]]
- [[_COMMUNITY_Injection & Modern Threats|Injection & Modern Threats]]
- [[_COMMUNITY_Python Bug Patterns|Python Bug Patterns]]
- [[_COMMUNITY_Type & Numeric Bugs|Type & Numeric Bugs]]
- [[_COMMUNITY_State Mutation Bugs|State Mutation Bugs]]
- [[_COMMUNITY_XSS & JS Security|XSS & JS Security]]
- [[_COMMUNITY_Deserialization Risks|Deserialization Risks]]
- [[_COMMUNITY_Race Condition on Shared Map  Context Usage  Defer Bugs|Race Condition on Shared Map / Context Usage / Defer Bugs]]
- [[_COMMUNITY_asyncawait in forEach Wrong C  forEach With Async  JavaSc|async/await in forEach Wrong C / forEach With Async / JavaSc]]
- [[_COMMUNITY_Logic Bugs  Boolean Logic Inversion  Mutating Collection W|Logic Bugs / Boolean Logic Inversion / Mutating Collection W]]
- [[_COMMUNITY_Test Coverage Reviewer (ae-tes  Test Golden Rule tests tha|Test Coverage Reviewer (ae-tes / Test Golden Rule: tests tha]]
- [[_COMMUNITY_Keychain Storage  EAS Build  Expo Managed Workflow|Keychain Storage / EAS Build / Expo Managed Workflow]]
- [[_COMMUNITY_Async  Concurrency Bugs  Deadlock Patterns  Goroutine Lea|Async / Concurrency Bugs / Deadlock Patterns / Goroutine Lea]]
- [[_COMMUNITY_Error Handling Bugs  Exception in Cleanup Code  Fail-Open|Error Handling Bugs / Exception in Cleanup Code / Fail-Open ]]
- [[_COMMUNITY_Mock Time  Fake Timers  Flutter Three Levels (unitwid  J|Mock Time / Fake Timers / Flutter Three Levels (unit/wid / J]]
- [[_COMMUNITY_Jetpack Compose  iOS asyncawait  @MainActor|Jetpack Compose / iOS async/await / @MainActor]]
- [[_COMMUNITY_Coroutines runTest  Rust cfg(test) mod tests  Drop trai|Coroutines runTest / Rust #[cfg(test)] mod tests / Drop trai]]
- [[_COMMUNITY_Fake  Mock  Over-Mocking Anti-Pattern|Fake / Mock / Over-Mocking Anti-Pattern]]
- [[_COMMUNITY_Missing pytest-asyncio Marker  Table-Driven Tests  JUnit P|Missing pytest-asyncio Marker / Table-Driven Tests / JUnit P]]
- [[_COMMUNITY_Django Apps and Models  Python + Django Rules  DRF Seriali|Django Apps and Models / Python + Django Rules / DRF Seriali]]
- [[_COMMUNITY_iOS Accessibility  iOS Architecture  Auto Layout|iOS Accessibility / iOS Architecture / Auto Layout]]
- [[_COMMUNITY_Next.js Data Fetching  Env Variable Validation  Next.js Fi|Next.js Data Fetching / Env Variable Validation / Next.js Fi]]
- [[_COMMUNITY_Android Native Development Rul  Kotlin Coroutines  Hilt De|Android Native Development Rul / Kotlin Coroutines / Hilt De]]
- [[_COMMUNITY_Go t.Parallel() Isolation  Race Conditions and Order Depe|Go t.Parallel() Isolation / Race Conditions and Order Depe /]]
- [[_COMMUNITY_mocktail vs mockito  pump() vs pumpAndSettle()  Flutter Te|mocktail vs mockito / pump() vs pumpAndSettle() / Flutter Te]]
- [[_COMMUNITY_CICD Pipeline Injection  Dependency Confusion (package|CI/CD Pipeline Injection / Dependency Confusion (package  / ]]
- [[_COMMUNITY_Security Reviewer (ae-sec)  ae-sec exclusion list  Report|Security Reviewer (ae-sec) / ae-sec exclusion list / Report ]]
- [[_COMMUNITY_analyze command  status command  Context Forking|analyze command / status command / Context Forking]]
- [[_COMMUNITY_Rules Library Overview  Rules Library  Stack Framework Rul|Rules Library Overview / Rules Library / Stack Framework Rul]]
- [[_COMMUNITY_bootstrap command|bootstrap command]]
- [[_COMMUNITY_plan-all command|plan-all command]]
- [[_COMMUNITY_note command|note command]]
- [[_COMMUNITY_doc command|doc command]]
- [[_COMMUNITY_doc-all command|doc-all command]]
- [[_COMMUNITY_Built-in Gotchas|Built-in Gotchas]]
- [[_COMMUNITY_Installation Options|Installation Options]]

## God Nodes (most connected - your core abstractions)
1. `Agentic Engineering SKILL.md` - 31 edges
2. `Security Reviewer (ae-sec)` - 28 edges
3. `ae-red Bug Hunter Agent` - 22 edges
4. `/ship command body` - 16 edges
5. `PROD Agent — PRD/Stories` - 15 edges
6. `Stack Framework Rules` - 13 edges
7. `Test Coverage Reviewer (ae-test)` - 13 edges
8. `ARCH Agent — Architecture` - 13 edges
9. `/feature command body` - 13 edges
10. `Agent Roster` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Context Management` --semantically_similar_to--> `On-Demand Command Loading`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Caveman Rules` --semantically_similar_to--> `Caveman Authoring Rules`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Table-Driven Tests` --semantically_similar_to--> `pytest parametrize`  [INFERRED] [semantically similar]
  rules-library/go.md → agents/ae-test/languages/pytest.md
- `Unsafe Block Discipline` --references--> `Rust Security Guide`  [EXTRACTED]
  rules-library/rust.md → agents/ae-sec/languages/rust.md
- `Forced Unwrap / Non-Null Assertion` --semantically_similar_to--> `TypeScript False Safety`  [INFERRED] [semantically similar]
  agents/ae-red/references/null-safety.md → agents/ae-red/languages/javascript.md

## Hyperedges (group relationships)
- **5-Agent Parallel Review Roster (EXTRACTED)** — aered_agent, aereq_agent, aetest_agent, aedoc_agent, aesec_agent [EXTRACTED 1.00]

## Communities (50 total, 7 thin omitted)

### Community 0 - "Workflow Roles (README diagram)"
Cohesion: 0.07
Nodes (71): ARCH Agent — Architecture, DOC Agent — Convention Alignment, FIXER Agent — Root Cause, GIT Agent — Commits/Branches/PRs, PROD Agent — PRD/Stories, RED Agent — Bug Hunt, REQ Agent — Requirements/Constitution, SCRIBE Agent — End-user Docs (+63 more)

### Community 1 - "5-Agent Review Subsystem"
Cohesion: 0.05
Nodes (57): ae-doc Consistency Guardian, app-docs vs docs/CLAUDE.md Distinction, ae-red Bug Hunter Agent, ae-red GOLDEN RULE: report only high-confidence bugs, Acceptance Criteria Check, ae-req Requirements + Constitution Auditor, Constitution Compliance Check, ae-scribe Product Docs Author (+49 more)

### Community 2 - "UX Fidelity & Accessibility"
Cohesion: 0.06
Nodes (41): Color and Contrast (WCAG AA), Keyboard Navigation, Motion and prefers-reduced-motion, Accessibility Reference, Screen Reader Support, Touch and Mobile Accessibility (44x44px), UX Fidelity Reviewer (ae-ux), BLOCKERS/POLISH/CLEAN Report Format (+33 more)

### Community 3 - "Git Commit & PR Conventions"
Cohesion: 0.06
Nodes (40): Branch Naming, Code Review Practice, Commit Granularity, Conventional Commits, Git Conventions, Git History Hygiene, Pull Request Format, Squash Merges (+32 more)

### Community 4 - "REST API Design"
Cohesion: 0.09
Nodes (23): API Design Rules, API Versioning, Bearer Token Authentication, OpenAPI Documentation, Pagination, Rate Limiting, Response Shape, REST Conventions (+15 more)

### Community 5 - "Mobile Security (Android/Flutter)"
Cohesion: 0.12
Nodes (22): Android Deep Link / Intent Handling, Android exported components / debuggable / backup, Android Insecure Storage (SharedPreferences), Android WebView Security (JsInterface), Cryptography, Encryption Issues (ECB, no auth, static IV), Insecure Random Number Generation, JWT Cryptography (algo confusion, weak secret) (+14 more)

### Community 6 - "API Security & Authorization"
Cohesion: 0.12
Nodes (20): Broken Object Level Authorization (BOLA/IDOR), GraphQL Security (introspection, field auth, DoS), Insecure Deserialization in APIs, API Key Exposure, Mass Assignment, Rate Limiting / Brute Force, API Security, Authorization & Access Control (+12 more)

### Community 7 - "Authentication & Cryptography"
Cohesion: 0.11
Nodes (19): Authentication & Session Management, Hardcoded Credentials, Insecure Password Reset, Insecure Session Configuration (cookies), OAuth / SSO Issues, Session Fixation, Weak Password Hashing, Data Protection & Secrets Exposure (+11 more)

### Community 8 - "File & Path Security"
Cohesion: 0.15
Nodes (19): File Security, Path Traversal, Symlink Attacks, Unrestricted File Upload, XXE (XML External Entity), Zip Slip, Go Security Guide, OS Command Injection (+11 more)

### Community 9 - "Test Coverage Principles"
Cohesion: 0.14
Nodes (15): Concurrent / Timing Scenarios, Edge Cases (empty/null/boundary), Error and Failure Paths, Happy Path Coverage, Invalid Input Coverage, Coverage Principles Reference, Delete-the-Implementation Mental Model, Test Independence (+7 more)

### Community 10 - "Go Conventions"
Cohesion: 0.17
Nodes (12): Go Concurrency, Context Propagation, Go Error Handling, Go Rules, Go Interfaces, Go Project Structure, Newtypes Pattern, Ownership and Borrowing (+4 more)

### Community 11 - "CSRF & CORS Misconfiguration"
Cohesion: 0.17
Nodes (12): Bypassing Existing CSRF Protection, CORS Misconfiguration Enabling CSRF, CSRF (Cross-Site Request Forgery), Double Submit Cookie Pattern, Missing CSRF Protection, CORS Misconfiguration, Misconfiguration, Exposed Admin Interfaces (+4 more)

### Community 12 - "Plugin Authoring Internals"
Cohesion: 0.22
Nodes (11): Agent File Layout, Agentic Engineering Plugin Internals, Caveman Authoring Rules, On-Demand Command Loading, Post-Install SKILL.md Patch, Rules Library Frontmatter Contract, SKILL.md Router, Test Non-Watch Rule (+3 more)

### Community 13 - "Flutter Conventions"
Cohesion: 0.18
Nodes (11): Async Futures Handling, Flutter Rules, ListView.builder Performance, Flutter State Management, StatelessWidget Default, Flutter Widget Tests, Functional Components Only, React Hooks (+3 more)

### Community 14 - "Node & Express Conventions"
Cohesion: 0.18
Nodes (11): Express Error Middleware, Helmet + CORS Defaults, Layered Structure, Node + Express Rules, Express Request Validation, FastAPI Async Handlers, FastAPI Dependency Injection, Python + FastAPI Rules (+3 more)

### Community 15 - "Injection & Modern Threats"
Cohesion: 0.2
Nodes (11): Injection Vulnerabilities, Header Injection (CRLF), LDAP Injection, NoSQL Injection (MongoDB), Template Injection (SSTI), Modern Threats, Supply Chain / Dependency Confusion (modern), Insecure Postmessage (+3 more)

### Community 16 - "Python Bug Patterns"
Cohesion: 0.2
Nodes (10): Asyncio Blocking Call, Async Python Bugs, Datetime Traps, Dictionary Gotchas, Django-Specific Bugs, Python Exception Handling, Generator / Iterator Exhaustion, Python Bug Patterns (+2 more)

### Community 17 - "Type & Numeric Bugs"
Cohesion: 0.2
Nodes (10): JavaScript Equality and Comparison, Type & Data Bugs, Division By Zero, Float Comparison, Integer Overflow, NaN Propagation, Off-By-One in Numeric Ranges, String/Bytes Confusion (+2 more)

### Community 18 - "State Mutation Bugs"
Cohesion: 0.2
Nodes (10): Python Mutable Defaults, State Bugs, Class vs Instance Variable Confusion, Closure Variable Capture Bug, Global State In Tests Bleeding Through, State Mutation in Immutable-Seeming Operations, Mutable Default Arguments (Python), Shared Mutable State Across Requests (+2 more)

### Community 19 - "XSS & JS Security"
Cohesion: 0.22
Nodes (10): JavaScript / TypeScript Security Guide, Prototype Pollution, Next.js API routes SSRF / open redirect, React unsafe HTML injection prop bypass, Context-specific Escaping, CSP Bypass Indicators, Cross-Site Scripting (XSS), DOM-based XSS (+2 more)

### Community 20 - "Deserialization Risks"
Cohesion: 0.22
Nodes (10): Timing Attacks on Authentication, Java Native Deserialization / Jackson / XStream, JS node-serialize / eval-based deserialization, Python unsafe deserialization (binary serialize / YAML unsafe load / shelve), Deserialization, Django security patterns (CSRF, DEBUG, ALLOWED_HOSTS), FastAPI / Pydantic security patterns, Flask security patterns (debug, secret_key, SSTI) (+2 more)

### Community 21 - "Race Condition on Shared Map / Context Usage / Defer Bugs"
Cohesion: 0.22
Nodes (9): Race Condition on Shared Map, Context Usage, Defer Bugs, Go Ignored Errors, Integer and Type Conversion (Go), Go Bug Patterns, Map Concurrency, Go Nil Pointer Dereference (+1 more)

### Community 22 - "async/await in forEach Wrong C / forEach With Async / JavaSc"
Cohesion: 0.22
Nodes (9): async/await in forEach Wrong Context, forEach With Async, JavaScript / TypeScript Bug Patterns, Missing await, Common Node.js Bugs, Object/Array Mutation, this Context Loss, TypeScript False Safety (+1 more)

### Community 23 - "Logic Bugs / Boolean Logic Inversion / Mutating Collection W"
Cohesion: 0.22
Nodes (9): Logic Bugs, Boolean Logic Inversion, Mutating Collection While Iterating, Off-By-One Errors, Regex Bugs, Sorting / Ordering Bugs, String Comparison Bugs, Wrong Comparison Operator (+1 more)

### Community 24 - "Test Coverage Reviewer (ae-tes / Test Golden Rule: tests tha"
Cohesion: 0.25
Nodes (9): Test Coverage Reviewer (ae-test), Test Golden Rule: tests that pass on broken code are not tests, TEST Coverage Report Format, Go httptest, Go Testing Guide, testify Assertions, XCTestExpectation, XCTest Guide (+1 more)

### Community 25 - "Keychain Storage / EAS Build / Expo Managed Workflow"
Cohesion: 0.25
Nodes (8): Keychain Storage, EAS Build, Expo Managed Workflow, FlatList over ScrollView, React Native Rules, SecureStore for Tokens, StyleSheet.create, Typed Navigation

### Community 26 - "Async / Concurrency Bugs / Deadlock Patterns / Goroutine Lea"
Cohesion: 0.29
Nodes (8): Async / Concurrency Bugs, Deadlock Patterns, Goroutine Leak, Promise.all Failure Handling, Thread Safety on Shared Mutable State, Unhandled Promise Rejection, WaitGroup Counter Wrong, Goroutine and Channel Bugs

### Community 27 - "Error Handling Bugs / Exception in Cleanup Code / Fail-Open "
Cohesion: 0.25
Nodes (8): Error Handling Bugs, Exception in Cleanup Code, Fail-Open Error Handling, Goroutine Panic Not Recovered, Retry Loops Hiding Persistent Errors, Return Value Not Checked, Swallowed Errors, Wrong Error Propagation

### Community 28 - "Mock Time / Fake Timers / Flutter Three Levels (unit/wid / J"
Cohesion: 0.25
Nodes (8): Mock Time / Fake Timers, Flutter Three Levels (unit/widget/integration), Jest Fake Timers, Jest / Vitest Guide, Jest Matchers (toBe/toEqual/toStrictEqual), Jest Module Mocking, React Testing Library Patterns, pytest-mock Patching

### Community 29 - "Jetpack Compose / iOS async/await / @MainActor"
Cohesion: 0.29
Nodes (7): Jetpack Compose, iOS async/await, @MainActor, NavigationStack, Observable Macro, State Property Wrappers, SwiftUI Rules

### Community 30 - "Coroutines runTest / Rust #[cfg(test)] mod tests / Drop trai"
Cohesion: 0.29
Nodes (7): Coroutines runTest, Rust #[cfg(test)] mod tests, Drop trait teardown, #[should_panic] with expected, Rust cargo test Guide, #[tokio::test] async, XCTest async/await

### Community 31 - "Fake / Mock / Over-Mocking Anti-Pattern"
Cohesion: 0.29
Nodes (7): Fake, Mock, Over-Mocking Anti-Pattern, Test Doubles Reference, Stub, When Mocking Is Appropriate, Testing Implementation Not Behavior

### Community 32 - "Missing pytest-asyncio Marker / Table-Driven Tests / JUnit P"
Cohesion: 0.29
Nodes (7): Missing pytest-asyncio Marker, Table-Driven Tests, JUnit Parameterized Tests, pytest-asyncio, pytest Fixtures with yield cleanup, pytest Guide, pytest parametrize

### Community 33 - "Django Apps and Models / Python + Django Rules / DRF Seriali"
Cohesion: 0.33
Nodes (6): Django Apps and Models, Python + Django Rules, DRF Serializers, Django Migrations, QuerySet Optimization, Django Settings Split

### Community 34 - "iOS Accessibility / iOS Architecture / Auto Layout"
Cohesion: 0.33
Nodes (6): iOS Accessibility, iOS Architecture, Auto Layout, iOS Native Development Rules, URLSession Networking, Weak Self Memory

### Community 35 - "Next.js Data Fetching / Env Variable Validation / Next.js Fi"
Cohesion: 0.33
Nodes (6): Next.js Data Fetching, Env Variable Validation, Next.js File Conventions, Next.js App Router Rules, Next.js SEO Metadata, Server Components Default

### Community 36 - "Android Native Development Rul / Kotlin Coroutines / Hilt De"
Cohesion: 0.33
Nodes (6): Android Native Development Rules, Kotlin Coroutines, Hilt Dependency Injection, MVVM Architecture, Retrofit Networking, Room Persistence

### Community 37 - "Go t.Parallel() Isolation / Race Conditions and Order Depe /"
Cohesion: 0.33
Nodes (6): Go t.Parallel() Isolation, Race Conditions and Order Dependency, Async Testing Reference, Unawaited Promise / Coroutine Bug, Go Subtests with t.Run, Flaky Test Patterns

### Community 38 - "mocktail vs mockito / pump() vs pumpAndSettle() / Flutter Te"
Cohesion: 0.33
Nodes (5): mocktail vs mockito, Flutter Testing Guide, AssertJ Fluent Assertions, JUnit 5 Guide, MockK for Kotlin

### Community 39 - "CI/CD Pipeline Injection / Dependency Confusion (package  / "
Cohesion: 0.33
Nodes (6): CI/CD Pipeline Injection, Dependency Confusion (package squatting), Install Scripts (preinstall/postinstall), Suspicious Package Sources, Unpinned Dependencies, Supply Chain Security

### Community 40 - "Security Reviewer (ae-sec) / ae-sec exclusion list / Report "
Cohesion: 0.4
Nodes (5): Security Reviewer (ae-sec), ae-sec exclusion list, Report only exploitable vulnerabilities (Golden Rule), Investigate, don't pattern-match, Severity guide (Critical/High/Medium/Low)

### Community 41 - "analyze command / status command / Context Forking"
Cohesion: 0.67
Nodes (3): analyze command, status command, Context Forking

### Community 42 - "Rules Library Overview / Rules Library / Stack Framework Rul"
Cohesion: 0.67
Nodes (3): Rules Library Overview, Rules Library, Stack Framework Rules

## Knowledge Gaps
- **277 isolated node(s):** `ARCH Agent`, `PROD Agent`, `UX Agent`, `bootstrap command`, `init command` (+272 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Stack Framework Rules` connect `Rules Library Overview / Rules Library / Stack Framework Rul` to `Django Apps and Models / Python + Django Rules / DRF Seriali`, `iOS Accessibility / iOS Architecture / Auto Layout`, `Next.js Data Fetching / Env Variable Validation / Next.js Fi`, `Android Native Development Rul / Kotlin Coroutines / Hilt De`, `Go Conventions`, `Flutter Conventions`, `Node & Express Conventions`, `Keychain Storage / EAS Build / Expo Managed Workflow`, `Jetpack Compose / iOS async/await / @MainActor`?**
  _High betweenness centrality (0.233) - this node is a cross-community bridge._
- **Why does `Rust Rules` connect `Go Conventions` to `Rules Library Overview / Rules Library / Stack Framework Rul`?**
  _High betweenness centrality (0.156) - this node is a cross-community bridge._
- **Why does `Rust Security Guide` connect `File & Path Security` to `Security Reviewer (ae-sec) / ae-sec exclusion list / Report `, `Go Conventions`, `Mobile Security (Android/Flutter)`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **What connects `ARCH Agent`, `PROD Agent`, `UX Agent` to the rest of the system?**
  _277 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Workflow Roles (README diagram)` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `5-Agent Review Subsystem` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `UX Fidelity & Accessibility` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._