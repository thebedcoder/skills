# PM adapter interface

Product Brain treats the project-management tool as pluggable. The orchestrator only ever talks to a `PMAdapter` instance; concrete adapters wrap Aha, Linear, Jira, etc.

## Interface

`src/adapters/base.ts`:

```typescript
export interface Ticket {
  id: string;                  // e.g. "AHA-1234"
  title: string;
  description: string;
  type: "feature" | "bug" | "chore" | "spike" | "epic" | "unknown";
  status: string;              // tool-native status string
  labels: string[];
  parentId?: string;
  childrenIds: string[];
  url: string;
  createdAt?: Date;
  updatedAt?: Date;
  raw: Record<string, unknown>; // tool-specific payload, opaque to the planner
}

export interface TicketDraft {
  title: string;
  description: string;
  type?: string;               // default "feature"
  parentId?: string;
  labels?: string[];
  status?: string;             // adapter may override with config.bot.draft_status
}

export interface Comment {
  id: string;
  ticketId: string;
  author: string;              // email or handle the adapter normalizes to
  body: string;
  createdAt: Date;
}

export interface PMAdapter {
  fetchTicket(ticketId: string): Promise<Ticket>;
  searchTickets(opts: {
    keywords?: string;
    labels?: string[];
    parentId?: string;
    type?: string;
    limit?: number;            // default 30
  }): Promise<Ticket[]>;
  listSiblings(ticketId: string, limit?: number): Promise<Ticket[]>;
  createTicket(draft: TicketDraft): Promise<Ticket>;
  linkTickets(parentId: string, childIds: string[]): Promise<void>;
  postComment(ticketId: string, body: string): Promise<Comment>;
  editComment(ticketId: string, commentId: string, body: string): Promise<Comment>;
  listComments(ticketId: string): Promise<Comment[]>;
  verifyWebhook(headers: Record<string, string>, body: Buffer): boolean;
  parseWebhook(body: Buffer): WebhookEvent;
}
```

`WebhookEvent` is a simple struct: `{ kind, ticketId, comment, prevStatus, newStatus }`.

## Aha implementation

`src/adapters/aha.ts` ships out of the box. Notes:

- **Endpoint**: `https://<subdomain>.aha.io/api/v1/`
- **Auth**: bearer token (`Authorization: Bearer $AHA_API_KEY`)
- **Ticket type mapping**: Aha uses Features/Requirements/Ideas. Adapter normalizes:
  - feature → `feature`
  - requirement → `feature` (still "thing to build")
  - idea → `spike`
  - bug (when typed via custom field) → `bug`
- **Status mapping**: tool-native string passed through. Use `raw.workflow_status` to access.
- **Comments**: Aha calls them "comments"; behaves as expected.
- **Webhook signing**: HMAC-SHA256 in `X-Aha-Signature`.

## Adding a new adapter (e.g. Linear)

1. Create `src/adapters/linear.ts`.
2. Implement `PMAdapter`.
3. Register in `src/adapters/index.ts`:
   ```typescript
   import { LinearAdapter } from "./linear.js";
   PM_ADAPTERS["linear"] = LinearAdapter;
   ```
4. Set `pm_adapter: linear` in `config.yaml` and add a `linear:` config block.

The orchestrator never touches Linear-specific concepts; everything goes through the abstract interface.

## What the abstract interface deliberately does not include

- **Ticket size estimation**: the PM tool's "story points" field is unreliable across teams; we estimate from git churn instead.
- **Workflow transitions**: bot only creates drafts in a single configured `draft_status`; never promotes through workflow states.
- **User assignment**: bot never assigns owners; that's a human decision.
- **Custom fields**: accessed through `Ticket.raw` if needed by adapter-specific logic, but the planner doesn't depend on them.

## Webhook handling

The bot's webhook endpoint:
1. Reads `Content-Type` and signature header.
2. Calls `adapter.verify_webhook(headers, body)`. False → 401.
3. Calls `adapter.parse_webhook(body)` → `WebhookEvent`.
4. Routes by `event.kind`:
   - `comment_created`: parse for `/brain <cmd>` from `event.comment.author`.
   - `ticket_status_changed`: queue `/brain groom` if config + label conditions match.
   - `ticket_created`: ignored by default (too noisy).

See [bot.md](bot.md) for full bot dynamics.
