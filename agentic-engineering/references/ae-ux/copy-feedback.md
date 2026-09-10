# Copy & User Feedback

Text in the UI is part of the UX. Bad copy is confusing, cold, or leaves users
without a path forward. These checks catch the patterns that make users feel lost
or frustrated.

---

## Labels and headings checklist

- [ ] Do page/screen titles clearly describe what the user is looking at?
- [ ] Are form field labels descriptive? ("Full name" not "Name field")
- [ ] Are button labels action-oriented? ("Save changes" not "Submit", "Delete account" not "Confirm")
- [ ] Are labels sentence case or title case — consistently?
- [ ] Is placeholder text different from label text? (placeholder is example, not instruction)
- [ ] Are tooltips/helper text present for non-obvious inputs?

**Bad:** Button labeled "OK". Form field labeled "Input 1". Placeholder "Enter here".
**Good:** "Save draft". "Company name". Placeholder "e.g. Acme Corp".

---

## Error messages checklist

- [ ] Is the error message in plain language — no error codes, no jargon?
- [ ] Does it explain what went wrong?
- [ ] Does it tell the user what to do next?
- [ ] Is it empathetic in tone? (not blaming the user)
- [ ] Is it specific to the field/action that failed?

| Bad | Good |
|---|---|
| "Error 422" | "This email is already registered. Try signing in instead." |
| "Invalid input" | "Password must be at least 8 characters" |
| "Request failed" | "Couldn't save your changes. Check your connection and try again." |
| "You have made an error" | "Looks like that email isn't quite right — check for typos" |

---

## Empty state copy checklist

- [ ] Does the empty state explain why it's empty?
- [ ] Does it tell the user what action will fill it?
- [ ] Is the tone appropriate? (encouraging, not clinical)
- [ ] Is there a CTA (call to action) in or near the empty state?

| Context | Bad | Good |
|---|---|---|
| Empty orders list | "No orders" | "You haven't placed any orders yet. Start browsing to find something you love." |
| Empty search | "No results" | "No results for 'blue shirt'. Try different keywords or browse by category." |
| Empty notifications | "0 notifications" | "You're all caught up! We'll let you know when something needs your attention." |

---

## Success and confirmation copy checklist

- [ ] Is success feedback present after every significant action?
- [ ] Is the message specific to the action taken?
- [ ] Does it tell the user what happens next (if anything)?
- [ ] Is the tone warm without being excessive?

| Bad | Good |
|---|---|
| "Done" | "Profile updated" |
| "Success!" | "Order placed — you'll get a confirmation email shortly" |
| "Saved." | "Changes saved" |

---

## Destructive action copy

- [ ] Does the confirmation dialog describe exactly what will be deleted/removed?
- [ ] Are the consequences clear? ("This cannot be undone")
- [ ] Is the confirm button labeled with the action, not "OK" or "Yes"?
- [ ] Is the cancel/back option the default (visually primary)?

| Bad | Good |
|---|---|
| "Are you sure?" → OK / Cancel | "Delete account? All your data will be permanently deleted and cannot be recovered." → Delete account / Keep account |
| "Confirm" button in red | "Delete project" button in red, "Cancel" button visually primary |

---

## Loading copy

- [ ] Is there loading text where the wait might be > 2 seconds?
- [ ] Does the loading message set expectations? ("Processing payment…" not just a spinner)
- [ ] Does long-running loading have progress indication or at least a message that it's working?
