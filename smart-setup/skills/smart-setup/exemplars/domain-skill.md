<!-- EXEMPLAR: quality bar for generated domain skills. Facts agent cannot infer from code. -->
---
name: sync-engine
description: >
  Sync engine invariants for this app. Use before editing anything under
  lib/sync/ or when debugging sync conflicts, duplicate events, offline queue.
---

# Sync Engine

## Invariants — never violate

- Events immutable after write. Fix = compensating event, never edit.
- Client clock untrusted. Ordering by server `seq`, not timestamp.
- Offline queue replays idempotently — every mutation carries client-generated UUID key.

## Past mistakes (repeated)

- Deduplication by timestamp — broke twice (DST + clock skew). Dedupe by UUID only.
- "Quick fix" editing synced row directly → ghost conflicts on next pull.

## Surprise module

`lib/sync/merge.dart` — merge order matters: remote-wins for profile, LWW-per-field for settings, append-only for events. Comment block at top of file is source of truth.
