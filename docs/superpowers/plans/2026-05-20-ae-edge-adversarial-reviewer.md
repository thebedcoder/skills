# `ae-edge` Adversarial Edge-Case Reviewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sixth read-only reviewer (`ae-edge`) to `/review`'s parallel batch that probes backend code for missing edge cases and emits failing test code + suggested fixes as part of the consolidated blocker list.

**Architecture:** New named subagent under `agents/ae-edge/` (directory shape — `AGENT.md` + 4 reference files). Wired into `commands/review.md`'s existing batched dispatch. Reads three reference files from `ae-test` via absolute path under `~/.claude/agents/` to avoid duplication. No new commands, no new phases, no mutation.

**Tech Stack:** Markdown agent prompts. Bash installer. No code, no tests in this repo — verification is installer round-trip + adapter round-trip + manual exercise after restart.

**Spec:** `docs/superpowers/specs/2026-05-20-edge-case-reviewer-design.md`

---

## File structure

**Create (5 files):**

```
agentic-engineering/agents/ae-edge/
  AGENT.md                              ← Step 1: agent contract
  references/
    boundary-null.md                    ← Step 2: probes for empty / null / boundary cases
    malformed-input.md                  ← Step 3: probes for type / encoding / malformed input
    resource-limits.md                  ← Step 4: probes for large-N / exhaustion / timeout
    error-paths.md                      ← Step 5: probes for dep misbehavior
```

**Modify (6 files):**

| File | Why |
|---|---|
| `agentic-engineering/install.sh` | Add `cp -r agents/ae-edge` line |
| `agentic-engineering/skills/agentic-engineering/commands/review.md` | "Five" → "Six"; add `ae-edge` to reviewer table; add `EDGE:` to per-reviewer summary line |
| `agentic-engineering/skills/agentic-engineering/SKILL.md` | Add EDGE row to Agent Roster; bump "5-agent" → "6-agent" in commands table |
| `agentic-engineering/agents/ae-test/AGENT.md` | One-line note: `ae-edge` reads `references/{async-testing,coverage-principles,test-quality}.md` and `languages/*.md` — coordinate before renaming |
| `agentic-engineering/adapters/AGENTS.md.template` | Paragraph inside `<!-- agentic-engineering:start v1 -->` marker block |
| `agentic-engineering/README.md` | One sentence in `/review` description |

**Do NOT modify:** `commands/ship.md`, `commands/ship-all.md`, `commands/feature.md`, `commands/fix.md`, `commands/implement.md`, `commands/design.md`, `commands/focus.md`, `commands/next.md`, `commands/status.md`, `USER_COMMANDS` array, `.claude-plugin/plugin.json`, marketplace.json, any wrapper file. The existing blocker-fix flow in `/ship` Phase 2 handles `[ae-edge]` blockers identically to `[ae-red]` / `[ae-sec]` blockers.

---

## Branch setup

- [ ] **Step 0: Create feature branch**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git checkout -b feat/agentic-engineering-ae-edge-reviewer
```

Verify: `git branch --show-current` prints `feat/agentic-engineering-ae-edge-reviewer`.

---

## Task 1: Create `ae-edge/AGENT.md`

**Files:**
- Create: `agentic-engineering/agents/ae-edge/AGENT.md`

- [ ] **Step 1: Create the directory**

```bash
mkdir -p /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/agents/ae-edge/references
```

- [ ] **Step 2: Write `AGENT.md` with the full agent contract**

Write to `agentic-engineering/agents/ae-edge/AGENT.md`:

````markdown
---
description: Adversarial edge-case prober for agentic engineering reviews. Probes backend code for missing edge cases — boundary values, null/empty inputs, race/concurrency, malformed input, resource limits, error paths — and emits failing test code + suggested fixes. Runs as the sixth parallel subagent during /review. Reports only cases the diff doesn't already handle.
model: claude-haiku-4-5
tools: Read, Glob, Grep, Bash(git diff:*)
color: orange
---

# Adversarial Edge Prober (ae-edge)

Senior engineer probing for what's *missing*. Job: surface backend edge cases the diff doesn't handle, with concrete failing-test proof.

**GOLDEN RULE: Generate failing tests that fail today against current code. Can't show concrete failure path → don't generate.**

**Peers in /review:** parallel with `ae-red` (bugs in existing code), `ae-req` (acceptance + constitution), `ae-test` (coverage gaps), `ae-doc` (convention drift), `ae-sec` (security). Security findings → defer to `ae-sec`. Frontend states (loading, empty, error UI) → defer to `ae-ux`. Output consolidated by `/review` into the unified blocker list.

---

## Step 1 — Get diff

```bash
git diff main...HEAD
```

Read changed files in full where diff lacks context.

---

## Step 2 — Scope check

Inspect the diff. Self-skip if:

- **Diff is empty** → emit `EDGE — Clean: no code to probe.` and exit.
- **Diff is docs-only** (only `.md`, `.mdx`, `.txt`, `app-docs/`, `docs/` changes) → emit `EDGE — Clean: docs-only diff, out of scope.` and exit.
- **Diff is frontend-only** (only `.tsx`, `.jsx`, `.vue`, `.svelte`, `.swiftui`, Jetpack Compose `.kt` UI files, no business logic) → emit `EDGE — Out of scope for this diff (frontend-only changes). ae-ux covers frontend states.` and exit.

Mixed diff (backend + frontend) → continue with backend portion only; ignore frontend files.

---

## Step 3 — Load references based on what's in the diff

| What you see | Load |
|---|---|
| numeric ranges, collection indexing, slice/array bounds, off-by-one risk | `references/boundary-null.md` |
| optional fields, null/None/nil access, empty collection handling | `references/boundary-null.md` |
| user input, JSON parsing, encoding, type coercion | `references/malformed-input.md` |
| loops over N records, file handles, connection pools, batch processing | `references/resource-limits.md` |
| try/catch, error returns, Result types, dep calls that can fail | `references/error-paths.md` |
| async/await, promises, goroutines, channels, threads, shared state | `~/.claude/agents/ae-test/references/async-testing.md` |

Plus shared concepts from `ae-test`:

| Concept | Source |
|---|---|
| Coverage scenario types | `~/.claude/agents/ae-test/references/coverage-principles.md` |
| Anti-patterns (don't write trivial tests) | `~/.claude/agents/ae-test/references/test-quality.md` |
| Language test framework idioms | `~/.claude/agents/ae-test/languages/<lang>.md` |

Detect language from file extensions and load matching guide:

| Extension / framework hint | Load |
|---|---|
| `.py`, `django`, `flask`, `fastapi` | `~/.claude/agents/ae-test/languages/pytest.md` |
| `.js`, `.ts`, `node`, `react`, `next` | `~/.claude/agents/ae-test/languages/jest.md` |
| `.go`, `go.mod` | `~/.claude/agents/ae-test/languages/go-test.md` |
| `.rs`, `Cargo.toml` | `~/.claude/agents/ae-test/languages/rust-test.md` |
| `.swift`, iOS | `~/.claude/agents/ae-test/languages/xctest.md` |
| `.kt`, `.java`, Android | `~/.claude/agents/ae-test/languages/junit.md` |
| `.dart`, Flutter | `~/.claude/agents/ae-test/languages/flutter-test.md` |

If a cross-reference file is missing (broken install), skip that category and proceed.

---

## Step 4 — Investigate before reporting

Per candidate edge case:

1. **Trace execution path** — what input / state / timing triggers the failure?
2. **Check if diff already handles it** — explicit null guard, validation, try/catch with right scope? Yes → not a finding.
3. **Check if a test already covers it** — grep test files for similar assertions. Yes → not a finding.
4. **Confirm failing test would actually fail** — mentally execute test against current implementation. Can you point at the line that throws / returns wrong / hangs? No → don't report.
5. **Check AC scope** — behavior probed implied by story AC or constitution? Story explicitly punts on it → not a finding.

**Do NOT report:**
- Cases already handled by diff
- Cases already covered by existing tests
- Security vulnerabilities (defer to `ae-sec`)
- Frontend states (defer to `ae-ux`)
- Performance issues unless they cause functional failure
- Stretch goals / behavior outside story AC
- Theoretical risks with no realistic trigger
- Code style, naming, formatting

---

## Step 5 — Report

```
EDGE — Edge Case Coverage: [story]

Blockers (will fail under realistic conditions):
1. [one-line description] — [file:line]
   Category: [boundary | null/empty | race | malformed | resource | error-path]
   Trigger: [exact input or state that exposes it]
   Failing test (proof):
     # [ae-edge:<category>] STORY-XXX
     [concrete test code in the project's test framework]
   Impact: [crash | wrong result | silent corruption | hang | leak]
   Suggested fix: [specific code change — not "handle the error"]

Should-cover (real but lower priority):
1. [...]

Won't-cover (logged here, not actioned):
1. [edge case considered but out of AC scope] — [reason]

Clean: [scope checked + no adversarial cases found in <categories>]
```

Test code in the report is **inert text** — do not write it to a file. Blocker-fix flow downstream copies it into project test files.

Tag each failing test with a header comment in project's comment syntax — `# [ae-edge:<category>] STORY-XXX` (Python / Ruby / shell) or `// [ae-edge:<category>] STORY-XXX` (JavaScript / TypeScript / Go / Java / Kotlin / Swift / Rust / Dart). Tag makes findings parseable for future coverage matrix work.

Nothing found → say so explicitly. Clean report is meaningful signal: `Clean: probed for <categories listed> — no adversarial cases found.`

---

## Reference files (this directory)

- `references/boundary-null.md` — boundary values + null/empty
- `references/malformed-input.md` — type mismatch, encoding, oversized payload, malformed JSON/dates
- `references/resource-limits.md` — large-N, exhaustion, timeout, pagination edges
- `references/error-paths.md` — dep throws, returns wrong shape, returns empty, times out

## Cross-agent references (read via absolute path)

- `~/.claude/agents/ae-test/references/coverage-principles.md`
- `~/.claude/agents/ae-test/references/async-testing.md`
- `~/.claude/agents/ae-test/references/test-quality.md`
- `~/.claude/agents/ae-test/languages/*.md`

These belong to `ae-test`. Read-only. If renamed or moved upstream, this agent's references break silently — skip that category and continue.
````

- [ ] **Step 3: Verify the file**

```bash
test -f /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/agents/ae-edge/AGENT.md && \
  head -5 /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/agents/ae-edge/AGENT.md
```

Expected: first 5 lines show the frontmatter with `description:`, `model: claude-haiku-4-5`, `tools: Read, Glob, Grep, Bash(git diff:*)`, `color: orange`.

```bash
grep -c "GOLDEN RULE" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/agents/ae-edge/AGENT.md
```

Expected: `1`.

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/agents/ae-edge/AGENT.md
git commit -m "feat(agentic-engineering): add ae-edge agent contract"
```

---

## Task 2: Create `boundary-null.md` reference

**Files:**
- Create: `agentic-engineering/agents/ae-edge/references/boundary-null.md`

- [ ] **Step 1: Write the reference file**

Write to `agentic-engineering/agents/ae-edge/references/boundary-null.md`:

````markdown
# Boundary Values + Null / Empty

Adversarial probes for diff that operates on collections, numeric ranges, or optional fields.

## Empty collection probes

```python
# probe: empty list crashes a function that assumes content
def test_process_orders_empty_list():
    result = processOrders([])
    assert result == []   # currently raises IndexError: list index out of range
```

```javascript
// probe: empty object access on a function that assumes a populated map
test('parseConfig empty object', () => {
  expect(() => parseConfig({})).not.toThrow()   // currently: TypeError reading undefined.length
})
```

## Single-element collection probes

```python
# probe: off-by-one in pagination / slice / fold when there's exactly one item
def test_paginate_single_item():
    pages = paginate(['only'], per_page=10)
    assert pages == [['only']]   # currently returns [] because of `if len > 1` guard
```

## Exact-at-limit probes

```python
# probe: function fails at exactly the documented max
def test_username_at_max_length():
    name = 'a' * 32   # spec says max=32
    assert validate_username(name) is True   # currently fails — uses < instead of <=
```

## One-past-limit probes

```python
# probe: function silently truncates instead of rejecting
def test_username_over_max_length():
    name = 'a' * 33
    with pytest.raises(ValidationError):
        validate_username(name)   # currently truncates instead of raising
```

## Zero / negative probes

```python
# probe: zero where positive expected
def test_create_user_zero_age():
    with pytest.raises(ValidationError):
        create_user(age=0)   # currently accepts 0 silently
```

## Null in assumed-populated field

```python
# probe: optional field is None at point that assumes populated
def test_get_profile_handles_null_email():
    user = User(id=1, email=None)
    profile = get_profile(user)
    assert profile.email_display == "(not provided)"   # currently: AttributeError on None.lower()
```

## Whitespace-only strings

```python
# probe: " " or "\n" or "\t" pass naive truthiness check but fail business logic
def test_create_post_whitespace_title():
    with pytest.raises(ValidationError):
        create_post(title="   ")   # currently accepts because bool("   ") == True
```

## Default-value collisions

Empty string treated as "no value" when `""` is a valid distinct value.

```python
def test_set_nickname_empty_string():
    user.set_nickname("")
    assert user.nickname == ""   # currently treats "" as None and skips update
```

## Cross-language reminders

- Python: `None`, `[]`, `{}`, `""`, `0`
- JavaScript: `null`, `undefined`, `[]`, `{}`, `""`, `0`, `NaN`
- Go: zero values — `nil` slice vs empty slice — empty `string` vs unset pointer
- Rust: `None`, `Some(default)`, empty `Vec`
- Swift: `nil`, empty `[]`, `Optional.none`
- Kotlin: `null`, empty `listOf()`

## Anti-pattern reminders

- Probe must show a concrete failure on current code. If the diff already guards against the case, don't generate a probe.
- "What if the input is malicious?" — defer to `ae-sec`.
- Numeric overflow at the *correctness* layer belongs here; at the *security* layer (e.g. integer wraparound bypassing a check) belongs to `ae-sec`.
````

- [ ] **Step 2: Verify**

```bash
test -f /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/agents/ae-edge/references/boundary-null.md && \
  wc -l /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/agents/ae-edge/references/boundary-null.md
```

Expected: file exists, ~80–90 lines.

- [ ] **Step 3: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/agents/ae-edge/references/boundary-null.md
git commit -m "feat(agentic-engineering): ae-edge boundary-null reference"
```

---

## Task 3: Create `malformed-input.md` reference

**Files:**
- Create: `agentic-engineering/agents/ae-edge/references/malformed-input.md`

- [ ] **Step 1: Write the reference file**

Write to `agentic-engineering/agents/ae-edge/references/malformed-input.md`:

````markdown
# Malformed Input

Adversarial probes for diff that accepts user-controlled or external input. Correctness layer — not security exploitation. Defer SQL injection / XSS / SSRF to `ae-sec`.

## Type mismatch probes

```python
# probe: function blindly trusts type of dict value
def test_calculate_total_string_amount():
    with pytest.raises(ValidationError):
        calculate_total({"amount": "5"})   # currently: TypeError unsupported * operator for str
```

```javascript
// probe: API endpoint accepts wrong type silently
test('POST /users rejects numeric name', async () => {
  const res = await client.post('/users', { name: 12345 })
  expect(res.status).toBe(400)   // currently 200 — stores number as username
})
```

## Encoding probes

```python
# probe: UTF-8 with surrogate pairs crashes serialization
def test_save_post_emoji_with_surrogate():
    post = Post(title="hello 😀 world")   # paired surrogate U+D83D U+DE00
    post.save()   # currently raises UnicodeEncodeError during db write
```

```python
# probe: NFC vs NFD normalization mismatch causes lookup miss
def test_username_lookup_normalization():
    user = User.create(username="café")   # NFC: é
    found = User.find_by_username("café")   # NFD: e + combining acute
    assert found == user   # currently returns None — strings compare unequal
```

## Oversized payload probes (correctness, not perf)

```python
# probe: 10 MB JSON body causes parser OOM in worker
def test_upload_huge_json():
    payload = '{"items":[' + ','.join(['{}'] * 1_000_000) + ']}'
    with pytest.raises(PayloadTooLarge):
        parse_request(payload)   # currently OOMs the worker — no size guard
```

## Malformed JSON probes

```python
# probe: truncated JSON exposes raw parser error to client
def test_parse_truncated_json():
    with pytest.raises(ParseError):
        parse_user('{"name": "alice"')   # currently raises JSONDecodeError with traceback in response
```

## Malformed dates / numbers / regex

```python
# probe: ISO-8601 with timezone offset that exists but is unusual
def test_parse_event_date_chatham_islands():
    parse_event_date("2026-01-15T10:30:00+12:45")   # +12:45 is real (Chatham Islands)
    # currently: ValueError — naive impl assumes hour-only offsets
```

## Mixed-case header / content-type variants

```python
# probe: case-insensitive matching missing for incoming headers
def test_request_content_type_lowercase():
    res = client.post('/api', data='{}', headers={'content-type': 'application/json'})
    assert res.status_code == 200   # currently 415 — code checks 'Content-Type' literally
```

## Leading / trailing whitespace probes

```python
# probe: email comparison fails because input has trailing space
def test_login_email_trailing_space():
    user = User.create(email="alice@example.com")
    assert authenticate("alice@example.com ", "pw") == user   # currently None — no .strip()
```

## Anti-pattern reminders

- Don't conflate malformed with security. Defer injection-class issues (SQLi, XSS, command injection) to `ae-sec`.
- Probes must show a concrete failure today on current code.
- Don't generate probes for behavior the story explicitly doesn't promise (e.g. probing for "what if input is Cyrillic" on a feature whose AC restricts to ASCII).
````

- [ ] **Step 2: Verify**

```bash
test -f /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/agents/ae-edge/references/malformed-input.md
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/agents/ae-edge/references/malformed-input.md
git commit -m "feat(agentic-engineering): ae-edge malformed-input reference"
```

---

## Task 4: Create `resource-limits.md` reference

**Files:**
- Create: `agentic-engineering/agents/ae-edge/references/resource-limits.md`

- [ ] **Step 1: Write the reference file**

Write to `agentic-engineering/agents/ae-edge/references/resource-limits.md`:

````markdown
# Resource Limits

Adversarial probes for *correctness under load* — not perf benchmarks. Probes target the threshold where logic breaks.

## Large-N probes — threshold finding

```python
# probe: function works for 10 records but breaks at 10_000 (recursive call hits stack depth)
def test_compute_dependency_tree_10k_nodes():
    nodes = [Node(id=i, parent=i-1 if i > 0 else None) for i in range(10_000)]
    result = compute_tree(nodes)
    assert len(result.depth_map) == 10_000   # currently: RecursionError
```

## File handle / connection exhaustion

```python
# probe: loop opens file/connection per item, never closes — exhausts handles at N items
def test_process_batch_closes_handles():
    files = ['/tmp/f' + str(i) for i in range(1024)]
    process_batch(files)   # currently: OSError: too many open files
    # fix: process_batch should use context manager / `with` per item
```

## Large single payload probes

```python
# probe: streaming-vs-buffered handler choice — 100 MB upload buffers all in RAM
def test_upload_100mb_file_streams():
    with open('/tmp/100mb', 'wb') as f:
        f.write(b'x' * (100 * 1024 * 1024))
    client.upload('/tmp/100mb')
    # currently: worker memory spikes to 100 MB — no streaming
```

## Timeout probes

```python
# probe: dep call has no timeout — slow upstream hangs entire request
def test_external_api_call_has_timeout():
    with mock.patch('requests.get') as m:
        m.side_effect = lambda *_, **kw: time.sleep(60)
        with pytest.raises(TimeoutError):
            fetch_remote_data()   # currently hangs forever — no timeout kwarg
```

## Pagination edge probes

```python
# probe: page exactly equal to total — last page has 0 items but cursor says "more"
def test_paginate_exact_multiple():
    items = list(range(100))   # exactly 10 pages of 10
    pages = list(paginate(items, per_page=10))
    assert len(pages[-1]) == 10   # currently: returns extra empty page after
```

## Empty last page probes

```python
# probe: cursor token returns empty result; current code treats as "still more"
def test_pagination_terminates_on_empty():
    pages = list(paginate_remote('cursor-at-end'))
    assert pages[-1].items == []
    assert pages[-1].next_cursor is None   # currently loops forever — cursor not None
```

## Anti-pattern reminders

- This isn't perf testing. Probes show *correctness failure* under load — wrong result, crash, hang, leak. If "it's just slow" → defer.
- Threshold finding: probe at 1, 10, 100, 10_000, 1_000_000. Report the lowest N that breaks.
- Don't generate probes that require external infrastructure (real DB at scale, real network) unless the project's tests already do.
````

- [ ] **Step 2: Verify**

```bash
test -f /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/agents/ae-edge/references/resource-limits.md
```

Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/agents/ae-edge/references/resource-limits.md
git commit -m "feat(agentic-engineering): ae-edge resource-limits reference"
```

---

## Task 5: Create `error-paths.md` reference

**Files:**
- Create: `agentic-engineering/agents/ae-edge/references/error-paths.md`

- [ ] **Step 1: Write the reference file**

Write to `agentic-engineering/agents/ae-edge/references/error-paths.md`:

````markdown
# Error Paths

Adversarial probes for diff that calls dependencies. What happens when the dep misbehaves?

## Dep throws probes

```python
# probe: caller doesn't handle the documented exception
def test_load_config_handles_file_not_found():
    config = load_config('/nonexistent/path')
    assert config == DEFAULT_CONFIG   # currently: FileNotFoundError propagates uncaught
```

## Dep returns wrong shape

```python
# probe: API response missing expected key
def test_parse_user_response_missing_email():
    raw = {"id": 1, "name": "alice"}   # no email field
    user = parse_user(raw)
    assert user.email is None   # currently: KeyError 'email'
```

```python
# probe: API response has extra fields that current code rejects
def test_parse_user_response_extra_field():
    raw = {"id": 1, "name": "alice", "email": "a@b", "experimental_flag": True}
    user = parse_user(raw)
    assert user.id == 1   # currently: ValidationError "unexpected field"
```

## Dep returns empty when populated expected

```python
# probe: empty list returned where caller assumes at least one item
def test_get_user_groups_empty_handled():
    db.set_user_groups(user_id=1, groups=[])
    primary = get_primary_group(user_id=1)
    assert primary is None   # currently: IndexError on groups[0]
```

## Dep returns partial result

```python
# probe: batch dep returns 3 of 5 requested items silently
def test_bulk_fetch_partial_result_flagged():
    items, missing = bulk_fetch(ids=[1, 2, 3, 4, 5])
    assert len(items) == 3
    assert missing == [4, 5]   # currently: returns 3 items, caller silently treats as success
```

## Dep times out

```python
# probe: timeout from dep — does the caller retry, fail, or hang?
def test_fetch_user_dep_timeout():
    with mock.patch('http.get', side_effect=Timeout):
        with pytest.raises(UpstreamUnavailable):
            fetch_user(1)   # currently: Timeout exception bubbles up with stack trace in response
```

## Dep returns success with invalid content

```python
# probe: 200 OK but body is HTML error page (provider behaved badly)
def test_fetch_user_invalid_json_body():
    with mock.patch('http.get', return_value=Response(200, '<html>error</html>')):
        with pytest.raises(UpstreamMalformed):
            fetch_user(1)   # currently: JSONDecodeError, no graceful handling
```

## Network probes

```python
# probe: 4xx — does the caller distinguish from 5xx?
def test_fetch_user_404_returns_none():
    with mock.patch('http.get', return_value=Response(404, '')):
        assert fetch_user(99) is None   # currently: raises generic HTTPError
```

```python
# probe: connection reset / DNS failure
def test_fetch_user_connection_error():
    with mock.patch('http.get', side_effect=ConnectionError):
        with pytest.raises(UpstreamUnavailable):
            fetch_user(1)   # currently: ConnectionError leaks with traceback
```

## DB probes

```python
# probe: unique-constraint violation handled with clear error
def test_create_user_duplicate_email():
    User.create(email="a@b")
    with pytest.raises(DuplicateEmailError):
        User.create(email="a@b")   # currently: raw IntegrityError leaks to caller
```

```python
# probe: deadlock retry path
def test_transfer_retries_on_deadlock():
    with mock.patch('db.commit', side_effect=[DeadlockError, None]):
        transfer(from_id=1, to_id=2, amount=100)
        assert db.commit.call_count == 2   # currently: no retry — first deadlock aborts
```

## Anti-pattern reminders

- Generate the probe only if the caller's behavior on the failure path is unspecified or wrong today.
- If the diff explicitly catches and handles the failure, the probe is satisfied — don't report.
- Don't fabricate dependencies the diff doesn't call. Probe real dep boundaries visible in the diff.
````

- [ ] **Step 2: Verify**

```bash
test -f /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/agents/ae-edge/references/error-paths.md
ls /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/agents/ae-edge/references/
```

Expected: all 4 reference files listed.

- [ ] **Step 3: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/agents/ae-edge/references/error-paths.md
git commit -m "feat(agentic-engineering): ae-edge error-paths reference"
```

---

## Task 6: Wire `ae-edge` into the installer

**Files:**
- Modify: `agentic-engineering/install.sh` (after line 47, where `ae-ux` is copied)

- [ ] **Step 1: Edit `install.sh`**

In `agentic-engineering/install.sh`, find this block:

```bash
# ae-red, ae-test, ae-sec, ae-ux are full directories (references + languages)
cp -r "$SCRIPT_DIR/agents/ae-red" ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/ae-test" ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/ae-sec" ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/ae-ux" ~/.claude/agents/
```

Replace with:

```bash
# ae-red, ae-test, ae-sec, ae-ux, ae-edge are full directories (references + languages)
cp -r "$SCRIPT_DIR/agents/ae-red" ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/ae-test" ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/ae-sec" ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/ae-ux" ~/.claude/agents/
cp -r "$SCRIPT_DIR/agents/ae-edge" ~/.claude/agents/
```

- [ ] **Step 2: Run the installer**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering
bash install.sh
```

Expected: "✅ Done. Restart Claude Code to pick up the changes."

- [ ] **Step 3: Verify install destination**

```bash
ls ~/.claude/agents/ae-edge/
ls ~/.claude/agents/ae-edge/references/
```

Expected: `AGENT.md` and `references/` in the first listing; 4 markdown files (`boundary-null.md`, `error-paths.md`, `malformed-input.md`, `resource-limits.md`) in the second.

- [ ] **Step 4: Verify cross-references resolve (paths exist post-install)**

```bash
test -f ~/.claude/agents/ae-test/references/coverage-principles.md && \
test -f ~/.claude/agents/ae-test/references/async-testing.md && \
test -f ~/.claude/agents/ae-test/references/test-quality.md && \
ls ~/.claude/agents/ae-test/languages/ | head -5
```

Expected: all three `test -f` succeed; languages dir lists `flutter-test.md`, `go-test.md`, etc.

- [ ] **Step 5: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/install.sh
git commit -m "feat(agentic-engineering): install.sh copies ae-edge agent dir"
```

---

## Task 7: Update `commands/review.md` to dispatch 6 reviewers

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/commands/review.md`

- [ ] **Step 1: Change "Five" → "Six" in the header**

In `agentic-engineering/skills/agentic-engineering/commands/review.md` change:

```
**Goal:** Consolidated fix list for current story. Five specialist reviewers run parallel on changed code.
```

To:

```
**Goal:** Consolidated fix list for current story. Six specialist reviewers run parallel on changed code.
```

- [ ] **Step 2: Add `ae-edge` row to the reviewer table**

Find this table:

```
### The five reviewers

| Agent | Receives | Looks for |
|---|---|---|
| **ae-red** | changed impl files + git diff | runtime errors, null safety, async bugs, logic, resource leaks |
| **ae-req** | STORIES.md + CONSTITUTION.md + changed files | acceptance criteria met, constitution violations |
| **ae-test** | changed files + test files | coverage gaps, tests that wouldn't catch regressions |
| **ae-doc** | CLAUDE.md + changed files + related app-docs | convention drift, docs needing update |
| **ae-sec** | changed impl files + git diff | high-confidence exploitable vulnerabilities |
```

Replace with:

```
### The six reviewers

| Agent | Receives | Looks for |
|---|---|---|
| **ae-red** | changed impl files + git diff | runtime errors, null safety, async bugs, logic, resource leaks |
| **ae-req** | STORIES.md + CONSTITUTION.md + changed files | acceptance criteria met, constitution violations |
| **ae-test** | changed files + test files | coverage gaps, tests that wouldn't catch regressions |
| **ae-doc** | CLAUDE.md + changed files + related app-docs | convention drift, docs needing update |
| **ae-sec** | changed impl files + git diff | high-confidence exploitable vulnerabilities |
| **ae-edge** | changed impl files + tests + AC + CONSTITUTION | adversarial backend edge cases the diff doesn't handle (boundary, null, race, malformed, resource, error-path) |
```

- [ ] **Step 3: Update the "Constraints" section — note 6 agents**

Find:

```
**Constraints:**
- All five subagents dispatched **in single tool-call batch** — not sequentially
```

Replace with:

```
**Constraints:**
- All six subagents dispatched **in single tool-call batch** — not sequentially
```

- [ ] **Step 4: Add `EDGE:` line to the per-reviewer summary in Output section**

Find:

```
Clean areas:
- RED: [scope checked and clear]
- REQ: X/Y criteria met. Constitution: N compliant, M violations.
- TEST: [verdict]
- DOC: [aligned / drifts noted]
- SEC: [Clean / X findings — Critical: N, High: N, Medium: N]
```

Replace with:

```
Clean areas:
- RED: [scope checked and clear]
- REQ: X/Y criteria met. Constitution: N compliant, M violations.
- TEST: [verdict]
- DOC: [aligned / drifts noted]
- SEC: [Clean / X findings — Critical: N, High: N, Medium: N]
- EDGE: [Clean / X cases — Blockers: N, Should-cover: M, Won't-cover: K]
```

- [ ] **Step 5: Update the Gotchas — "Sequential dispatch" still applies but 6 agents**

Find:

```
- **Sequential dispatch = failure.** Five subagents in one batched tool call. Never spawn-wait-spawn. 5 separate calls → re-batch.
```

Replace with:

```
- **Sequential dispatch = failure.** Six subagents in one batched tool call. Never spawn-wait-spawn. 6 separate calls → re-batch.
```

- [ ] **Step 6: Add an `ae-edge`-specific gotcha**

After the gotcha list in `commands/review.md`, append a new bullet:

```
- **ae-edge is read-only.** Despite emitting failing test code, ae-edge does NOT write files. Test code lives in the report as inert text; blocker-fix flow downstream copies it into project test files. If ae-edge writes a file, that's a bug.
- **ae-edge defers frontend.** If diff is frontend-only, ae-edge emits "out of scope" and exits. Don't expect findings on `.tsx`/`.vue`/`.swiftui` changes — that's `ae-ux`'s beat.
```

- [ ] **Step 7: Verify all edits landed**

```bash
grep -c "Six specialist" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/skills/agentic-engineering/commands/review.md
grep -c "ae-edge" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/skills/agentic-engineering/commands/review.md
grep -c "EDGE:" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/skills/agentic-engineering/commands/review.md
grep "Five specialist\|five reviewers\|five subagents" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/skills/agentic-engineering/commands/review.md
```

Expected: first three counts ≥ 1; the last grep prints nothing (no stale "five" references).

- [ ] **Step 8: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/skills/agentic-engineering/commands/review.md
git commit -m "feat(agentic-engineering): /review dispatches 6 reviewers including ae-edge"
```

---

## Task 8: Update `SKILL.md` Agent Roster and `/review` description

**Files:**
- Modify: `agentic-engineering/skills/agentic-engineering/SKILL.md`

- [ ] **Step 1: Bump `/review` description in the Command → File Map**

In `agentic-engineering/skills/agentic-engineering/SKILL.md` find this row:

```
| `/review` | `commands/review.md` | 5-agent parallel review |
```

Replace with:

```
| `/review` | `commands/review.md` | 6-agent parallel review |
```

- [ ] **Step 2: Add EDGE entry to the Agent Roster**

Find the Agent Roster table. After the `🧪 TEST` row, before `📖 DOC`, insert:

```
| 🔍 **EDGE** | Adversarial edge-case probe — boundary, null, race, malformed, resource, error-path | Probes for what's *missing*, not what's wrong |
```

(Place adjacent to TEST because they're peer testing-domain agents — TEST evaluates coverage, EDGE probes for gaps.)

- [ ] **Step 3: Verify**

```bash
grep -c "6-agent parallel" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/skills/agentic-engineering/SKILL.md
grep -c "EDGE" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/skills/agentic-engineering/SKILL.md
grep -c "5-agent parallel" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/skills/agentic-engineering/SKILL.md
```

Expected: first count ≥ 1; second count ≥ 1 (EDGE roster entry); third count = 0 (no stale "5-agent" string).

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/skills/agentic-engineering/SKILL.md
git commit -m "feat(agentic-engineering): SKILL.md lists EDGE in roster, /review is 6-agent"
```

---

## Task 9: Document cross-agent dependency in `ae-test/AGENT.md`

**Files:**
- Modify: `agentic-engineering/agents/ae-test/AGENT.md`

- [ ] **Step 1: Add a one-line dependency note after the Peers line**

In `agentic-engineering/agents/ae-test/AGENT.md` find:

```
**Peers in /review:** parallel with `ae-red` (bugs), `ae-req` (acceptance + constitution), `ae-doc` (convention drift), `ae-sec` (security). Tests come from `/implement`. Output consolidated by `/ship` before `ae-scribe`.
```

Replace with:

```
**Peers in /review:** parallel with `ae-red` (bugs), `ae-req` (acceptance + constitution), `ae-doc` (convention drift), `ae-sec` (security), `ae-edge` (adversarial edge probes). Tests come from `/implement`. Output consolidated by `/ship` before `ae-scribe`.

**Cross-agent consumer:** `ae-edge` reads `references/{async-testing,coverage-principles,test-quality}.md` and `languages/*.md` from this directory via absolute path. Coordinate before renaming any of those files — silent breakage in `ae-edge`'s scope detection.
```

- [ ] **Step 2: Verify**

```bash
grep -c "ae-edge" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/agents/ae-test/AGENT.md
```

Expected: ≥ 2.

- [ ] **Step 3: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/agents/ae-test/AGENT.md
git commit -m "docs(agentic-engineering): ae-test notes ae-edge consumes its references"
```

---

## Task 10: Update `adapters/AGENTS.md.template`

**Files:**
- Modify: `agentic-engineering/adapters/AGENTS.md.template`

- [ ] **Step 1: Locate the marker block**

```bash
grep -n "agentic-engineering:start\|agentic-engineering:end" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/adapters/AGENTS.md.template
```

Expected: two lines printed — start and end marker positions. Note them; the new paragraph goes between them.

- [ ] **Step 2: Add a paragraph documenting `ae-edge`**

In `agentic-engineering/adapters/AGENTS.md.template`, find the section that documents the `/review` workflow inside the `<!-- agentic-engineering:start v1 -->` … `<!-- agentic-engineering:end -->` block. Right after the existing description of the parallel reviewers (look for text mentioning `ae-red`, `ae-req`, `ae-test`, `ae-doc`, `ae-sec`), insert this paragraph:

```
Code review (`/review`) now dispatches **six** parallel specialist reviewers. The sixth is `ae-edge`, which probes the backend diff for adversarial edge cases (boundary values, null/empty inputs, race/concurrency, malformed input, resource limits, error paths) and emits failing test code + suggested fixes as part of the consolidated blocker list. `ae-edge` is read-only — it reports findings; the downstream blocker-fix flow implements them. Frontend states (empty / loading / error UI, responsive, accessibility) remain `ae-ux`'s responsibility, not `ae-edge`'s. If the diff is frontend-only, `ae-edge` self-skips with "out of scope."
```

If the existing template already says "five parallel reviewers" anywhere, update that occurrence to "six parallel reviewers."

- [ ] **Step 3: Verify markers are intact and paragraph landed inside them**

```bash
grep -c "agentic-engineering:start v1" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/adapters/AGENTS.md.template
grep -c "agentic-engineering:end" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/adapters/AGENTS.md.template
grep -c "ae-edge" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/adapters/AGENTS.md.template
grep -c "five parallel reviewers" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/adapters/AGENTS.md.template
```

Expected: first two counts = 1 (markers intact, not duplicated, not removed); third ≥ 1 (paragraph added); fourth = 0 (no stale "five parallel reviewers" text).

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/adapters/AGENTS.md.template
git commit -m "docs(agentic-engineering): AGENTS.md template documents ae-edge for non-Claude tools"
```

---

## Task 11: Update `README.md`

**Files:**
- Modify: `agentic-engineering/README.md`

- [ ] **Step 1: Locate `/review` description**

```bash
grep -n "review" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/README.md | head -10
```

Look for the line(s) that describe `/review` to end users (likely "5-agent parallel review" or "five specialist reviewers" phrasing).

- [ ] **Step 2: Update the `/review` description**

Replace any string of the form "5-agent parallel review" with "6-agent parallel review". Replace "five specialist reviewers" with "six specialist reviewers." Add a single sentence after the existing `/review` description:

```
Now includes `ae-edge`, which adversarially probes backend code for missing edge cases (boundary, null, race, malformed, resource, error-path) and emits failing test code + suggested fixes into the consolidated blocker list.
```

- [ ] **Step 3: Verify**

```bash
grep -c "ae-edge" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/README.md
grep -c "5-agent\|five specialist reviewers" /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering/README.md
```

Expected: first ≥ 1; second = 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/README.md
git commit -m "docs(agentic-engineering): README documents ae-edge in /review"
```

---

## Task 12: Installer round-trip verification (idempotent re-run)

**Goal:** Confirm install.sh is idempotent — re-running doesn't break ae-edge install, doesn't leave stale files.

- [ ] **Step 1: Re-run the installer**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering
bash install.sh
```

Expected: "✅ Done. Restart Claude Code to pick up the changes." — no errors.

- [ ] **Step 2: Verify all five ae-edge files in place**

```bash
ls -la ~/.claude/agents/ae-edge/
ls -la ~/.claude/agents/ae-edge/references/
```

Expected: `AGENT.md` and `references/` in first; 4 files (`boundary-null.md`, `error-paths.md`, `malformed-input.md`, `resource-limits.md`) in second.

- [ ] **Step 3: Verify the installed SKILL.md got the `user-invocable: false` patch**

```bash
grep "user-invocable" ~/.claude/skills/agentic-engineering/SKILL.md
```

Expected: `user-invocable: false`.

- [ ] **Step 4: Verify the new `/review` description landed in installed SKILL.md and review.md**

```bash
grep "6-agent\|EDGE" ~/.claude/skills/agentic-engineering/SKILL.md
grep -c "ae-edge" ~/.claude/skills/agentic-engineering/commands/review.md
```

Expected: first prints lines mentioning `6-agent` and `EDGE`; second count ≥ 1.

(No commit — verification only.)

---

## Task 13: Adapter round-trip verification (multi-tool installer)

**Goal:** Confirm the multi-tool installer at the repo root writes the ae-edge paragraph correctly into a non-Claude tool's `AGENTS.md`, and the marker block stays idempotent on re-run.

- [ ] **Step 1: Set up a scratch directory**

```bash
rm -rf /tmp/ae-edge-adapter-test
mkdir -p /tmp/ae-edge-adapter-test
cd /tmp/ae-edge-adapter-test
```

- [ ] **Step 2: Run the multi-tool installer targeting cursor**

```bash
bash /Users/getman/DevWorkspaces/bedcode/skills/install.sh --tool=cursor --skill=agentic-engineering
```

Expected: installer reports writing rules and AGENTS.md (or `.cursor/rules/` equivalent — varies by tool surface).

- [ ] **Step 3: Verify the marker block contains the ae-edge paragraph**

```bash
ls /tmp/ae-edge-adapter-test/
find /tmp/ae-edge-adapter-test -name 'AGENTS.md' -o -name '*.mdc' -o -path '*.cursor/rules*' 2>/dev/null
```

```bash
grep -l "agentic-engineering:start v1" /tmp/ae-edge-adapter-test/AGENTS.md 2>/dev/null && \
  grep -c "ae-edge" /tmp/ae-edge-adapter-test/AGENTS.md
```

Expected: marker file found; ae-edge mention count ≥ 1.

- [ ] **Step 4: Re-run the installer (idempotency check)**

```bash
cd /tmp/ae-edge-adapter-test
bash /Users/getman/DevWorkspaces/bedcode/skills/install.sh --tool=cursor --skill=agentic-engineering
```

```bash
grep -c "agentic-engineering:start v1" /tmp/ae-edge-adapter-test/AGENTS.md
grep -c "agentic-engineering:end" /tmp/ae-edge-adapter-test/AGENTS.md
```

Expected: each count = 1 (markers not duplicated on re-install — proves idempotent replace).

- [ ] **Step 5: Clean up**

```bash
rm -rf /tmp/ae-edge-adapter-test
```

(No commit — verification only.)

---

## Task 14: Update graphify knowledge graph

**Goal:** Keep the graph current after adding a new agent + reference files. The plugin's CLAUDE.md mandates `graphify update .` after modifying code files.

- [ ] **Step 1: Run graphify update**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills/agentic-engineering
graphify update .
```

Expected: graph updates; no API cost (AST-only). New nodes for `ae-edge` AGENT and references appear in the graph.

- [ ] **Step 2: Verify graph mentions ae-edge**

```bash
grep -c "ae-edge" graphify-out/GRAPH_REPORT.md
```

Expected: ≥ 1.

- [ ] **Step 3: Commit graph artifacts (per existing convention in repo)**

```bash
cd /Users/getman/DevWorkspaces/bedcode/skills
git add agentic-engineering/graphify-out/
git commit -m "chore(agentic-engineering): refresh graphify snapshot for ae-edge"
```

(Skip this task entirely if `graphify` binary is not available — it's a developer-local tool, not a CI gate.)

---

## Task 15: Live /review dispatch sanity check (deferred — needs restart)

**Goal:** After restarting Claude Code in a real project, confirm `/review` includes ae-edge in its parallel batch and ae-edge produces a structured `EDGE — Edge Case Coverage:` report.

This task cannot be automated from inside this session — Claude Code must be restarted to pick up the new agent. Defer to the user.

**Steps for the user to run manually after restart:**

- [ ] **Step 1: Restart Claude Code**

Exit and re-launch Claude Code so it re-reads `~/.claude/agents/` and `~/.claude/skills/`.

- [ ] **Step 2: Pick or create a scratch project with an obvious edge gap**

Suggested scratch fixture:

```bash
mkdir -p /tmp/edges-e2e
cd /tmp/edges-e2e
git init -q
mkdir -p src tests docs
cat > src/divide.py <<'EOF'
def divide(a, b):
    return a / b
EOF
cat > tests/test_divide.py <<'EOF'
def test_divide_happy():
    assert divide(10, 2) == 5
EOF
mkdir -p docs/features/calc
cat > docs/features/calc/STORIES.md <<'EOF'
- [x] STORY-001: Divide two numbers
  Acceptance: returns float result for valid inputs; raises clear error on division by zero
EOF
git add -A
git commit -q -m "scratch: divide fixture for ae-edge e2e"
```

- [ ] **Step 3: Run `/review` in this scratch project**

In Claude Code (in `/tmp/edges-e2e`):

```
/review
```

- [ ] **Step 4: Verify ae-edge participated in the batch**

Look at the consolidated review output. Expected:

- Six per-agent summary lines (`RED:`, `REQ:`, `TEST:`, `DOC:`, `SEC:`, `EDGE:`)
- `EDGE:` line reports at least one blocker — division by zero (`b == 0`) is the obvious case here
- Failing-test code in the report includes the comment tag (e.g., `# [ae-edge:error-path] STORY-001`)

- [ ] **Step 5: Confirm consolidation worked**

Verify the consolidated "Blockers" list (not the per-agent summaries) includes a `[ae-edge]` entry. If the EDGE summary mentions blockers but the consolidated list doesn't, that's a consolidation bug — the parent `/review` flow lost ae-edge's structured output.

---

## Task 16: Live self-skip check on frontend-only diff (deferred — needs restart)

**Goal:** Confirm ae-edge correctly self-skips when the diff is frontend-only.

- [ ] **Step 1: Create a frontend-only fixture**

```bash
mkdir -p /tmp/edges-e2e-frontend
cd /tmp/edges-e2e-frontend
git init -q
mkdir -p src/components
cat > src/components/Button.tsx <<'EOF'
export function Button({ children, onClick }) {
  return <button onClick={onClick}>{children}</button>
}
EOF
git add -A
git commit -q -m "scratch: frontend-only fixture for ae-edge self-skip"
```

- [ ] **Step 2: Modify the file (so there's a diff vs HEAD~1)**

```bash
cat >> src/components/Button.tsx <<'EOF'

export function IconButton({ icon, onClick }) {
  return <button onClick={onClick}>{icon}</button>
}
EOF
git add -A
git commit -q -m "add IconButton"
```

- [ ] **Step 3: Run `/review`**

In Claude Code (in `/tmp/edges-e2e-frontend`):

```
/review
```

- [ ] **Step 4: Verify ae-edge self-skipped**

The `EDGE:` summary line should read something like `EDGE: Out of scope for this diff (frontend-only changes). ae-ux covers frontend states.` — no blockers, no should-cover, no findings.

The other reviewers should still report normally (RED, REQ, TEST, DOC, SEC).

---

## Final step: finish the branch

After all 16 tasks complete and verified:

- [ ] **Announce:** "I'm using the finishing-a-development-branch skill to complete this work."
- [ ] **REQUIRED SUB-SKILL:** Use `superpowers:finishing-a-development-branch`. There is no automated test suite in this plugin — verification is the installer round-trip in Task 12 plus the adapter round-trip in Task 13. Live tasks 15 and 16 stay deferred for the user to exercise after restart.

---

## Self-review notes

- **Spec coverage:** every section of the spec maps to a task. Architecture (6-agent batch) → Tasks 7 + 8. Agent contract → Task 1. References (4 files) → Tasks 2–5. install.sh change → Task 6. SKILL.md → Task 8. review.md → Task 7. AGENTS.md.template → Task 10. README.md → Task 11. Cross-agent dependency note → Task 9. Verification → Tasks 12, 13, 15, 16. Graphify upkeep → Task 14.
- **Placeholder scan:** no TBD / "appropriate" / "handle edge cases" prose. Reference files contain real probe examples; commands have exact strings; expected outputs are concrete.
- **Type consistency:** the agent name `ae-edge` is used identically across every task. The category set `boundary | null/empty | race | malformed | resource | error-path` is used identically in AGENT.md, the references list, the SKILL.md roster entry, the README sentence, and the AGENTS.md paragraph. The tag format `[ae-edge:<category>] STORY-XXX` is identical across AGENT.md (Step 5), the spec, and Task 15's expected output.
- **Anti-pattern check:** every task touches at most 1–2 files. No task includes "do X for every file" without enumeration. Commits are scoped (one logical change each). No file is modified in more than one task except the installer (modified once in Task 6, exercised in Tasks 12 + 13).
