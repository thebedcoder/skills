# Forms & Validation

Forms are where most UX friction lives. These checks catch the patterns that
frustrate users most.

---

## Input behavior checklist

### Real-time vs on-submit validation
- [ ] Is validation triggered at the right time?
  - Don't validate on every keystroke while user is still typing (annoying)
  - Do validate on blur (when user leaves a field)
  - Always validate on submit
- [ ] Does clearing a field after an error clear the error message too?
- [ ] Does fixing a field error update immediately (not wait for re-submit)?

### Input feedback
- [ ] Is it clear which fields are required? (asterisk, label, or helper text)
- [ ] Do inputs show their current state visually? (default / focus / filled / error / disabled)
- [ ] Are error messages adjacent to the field they describe — not just at the top?
- [ ] Are error messages specific? ("Email already in use" not "Invalid input")
- [ ] Is helper text visible before the user makes an error, not only after?

### Password fields
- [ ] Is there a show/hide password toggle?
- [ ] Are password requirements shown before the user starts typing, not after they fail?
- [ ] Is the confirm password field validated in real-time against the first field?

---

## Submission handling checklist

- [ ] Is the submit button disabled after first click? (prevent double submission)
- [ ] Is there a loading indicator during submission?
- [ ] Does the button label change during submission? ("Save" → "Saving…")
- [ ] Is the form re-enabled if submission fails?
- [ ] Are all fields cleared / reset appropriately on success?
- [ ] If multi-step form: can the user go back without losing previous step data?

---

## Error recovery

- [ ] On validation failure, is focus moved to the first error field?
- [ ] Are errors announced to screen readers (aria-live or focus management)?
- [ ] On network failure during submit: is the form data preserved so user doesn't re-enter?
- [ ] For long forms: is there auto-save or draft functionality? If not, is data preserved on accidental navigation away?

---

## Edge cases to check

| Input type | Edge case |
|---|---|
| Email | Unicode characters, subaddressing (user+tag@domain.com) |
| Phone | International formats, formatting as user types |
| Date | Past/future restrictions, timezone display |
| Number | Min/max boundaries, decimal precision, negative values |
| Text | Maximum length enforced + counter shown |
| File upload | Max file size shown upfront, rejected types shown clearly |
| Search | Empty query, special characters, minimum query length |

---

## Common form anti-patterns to flag

- **Placeholder as label** — placeholder disappears when user types, leaving them unable to remember what the field is for
- **Disabled submit button with no explanation** — user doesn't know what's incomplete
- **Generic error at top only** — "Please fix the errors above" with no inline field errors
- **Password field with no show toggle** — forces users to type blindly
- **No autofocus on first field** — user has to manually click into the form
- **Reset button alongside submit** — accidental form clear is a common frustration
