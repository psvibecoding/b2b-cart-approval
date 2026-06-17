# B2B Cart Approval — App Redesign Spec

**Date:** 2026-06-17  
**Status:** Approved

---

## Goals

1. **English** — replace all Italian text across admin UI, theme extension, JS, approve/reject page, and email
2. **Beautiful** — improved Polaris admin, redesigned approve/reject page with branding, cleaner cart block
3. **Configurable tag** — merchant sets the B2B customer tag in both the app Settings page (saved to DB) and the theme customizer (Liquid reads `block.settings.junior_tag`)

---

## Section 1 — Language

All Italian text is replaced with English throughout:
- Admin Polaris pages (`app._index.jsx`, `app.requests.$id.jsx`)
- New Settings page
- Cart block Liquid and JS (`cart-approval.liquid`, `cart-approval.js`)
- Approve/reject HTML page (`approve.jsx`)
- Resend email templates (`email.server.js`)

---

## Section 2 — Admin UI (Polaris)

### Dashboard (`/app`)

- **Stats row** — three `Card` components side by side: Pending (attention), Approved (success), Rejected (critical). Counts derived from the loaded requests array.
- **Requests table** — `IndexTable` with columns: Requester, Manager, Total, Status, Date. Clicking a row navigates to the detail page. Empty state shown when no requests exist.

### Request Detail (`/app/requests/:id`)

- **Header** — `Page` with `backAction`, title = requester name + `Badge` status inline.
- **Products card** — `DataTable` with columns: Product, Variant, Qty, Price. Total shown in `totals` row.
- **Info card** — Manager email, submitted date, note (if present), Draft Order link (if approved).

### Settings (`/app/settings`)

- **New route** `app.settings.jsx` — loader reads `Shop` record for current shop, action saves `juniorTag`.
- **Form** — single `TextField` "Customer tag" (default `b2b-junior`), `Button` "Save", success `Banner` on save.
- **Info callout** — `CalloutCard` or `Banner` (info): "Set the same tag in your theme customizer → Customize → Cart → B2B Cart Approval block."

### Nav

`app.tsx` NavMenu: replace "Additional page" link with "Settings" → `/app/settings`.

---

## Section 3 — Theme Extension (Cart Block)

### Tag fix

`cart-approval.liquid` line 6: replace hardcoded `'b2b-junior'` with `block.settings.junior_tag`.

```liquid
{% if customer and customer.tags contains block.settings.junior_tag %}
```

### Language

All visible strings in English:
- "Send for approval" (heading)
- "Manager email *" (label)
- "Note (optional)" (label)
- "Submit for Approval" (button)
- "Request sent! The manager will receive an approval link by email." (success)
- "Please enter a valid manager email address." (validation error)

### Styling

Use CSS custom properties from the active theme (`--color-button`, `--color-button-text`, `--font-body-family`) so the block adapts to any Shopify theme automatically.

---

## Section 4 — Approve/Reject Page

### Layout

- Max width 680px, centered, background `#f6f6f7`.
- **Header** — "Lederly" wordmark in `#008060`, subtitle "Cart Approval Request".
- **Info section** — requester name, note (if present).
- **Products table** — columns: photo (56×56 thumbnail), Product, Variant, Qty, Price. Placeholder grey box if no image URL.
- **Total row** — prominently styled, right-aligned.
- **Action buttons** — "Approve & Pay" (green) and "Reject" (red), full width, spaced apart (min 16px gap) to avoid mis-taps.

### Product images

At submit time, `cart-approval.js` reads `item.featured_image.url` from `/cart.js` and includes it in the `cartItems` JSON payload. The `approve.jsx` loader reads it back from the DB and renders it as `<img>`.

If `featured_image` is null or empty string, the approve page renders a grey placeholder `div`.

### State pages

Three distinct states beyond the approval form:

| State | Condition | Message |
|-------|-----------|---------|
| Already approved | `status === 'APPROVED'` | "This request has already been approved." |
| Already rejected / handled | `status === 'REJECTED'` | "This request has already been rejected." |
| Expired | `expiresAt < now` | "This approval link has expired." |

All states show a clean centered message, no form.

---

## Data Model Changes

No schema changes required. `cartItems` JSON gains an optional `imageUrl` field per item — backward compatible since existing rows without it fall back to the placeholder.

---

## File Changelist

| File | Change |
|------|--------|
| `app/routes/app._index.jsx` | Stats cards, English, row click navigation |
| `app/routes/app.requests.$id.jsx` | English, better card layout, Draft Order link |
| `app/routes/app.settings.jsx` | New file — Settings page |
| `app/routes/app.tsx` | Nav: add Settings link, remove Additional page |
| `app/routes/approve.jsx` | Branding, product photos, English, state pages |
| `app/services/email.server.js` | English email copy |
| `extensions/b2b-cart-block/blocks/cart-approval.liquid` | Fix tag to `block.settings.junior_tag`, English |
| `extensions/b2b-cart-block/assets/cart-approval.js` | Capture `imageUrl`, English strings |

---

## Out of Scope

- True sync between app Settings tag and theme extension setting (they are independent; Settings page shows a note to the merchant)
- DB migration (no schema changes)
- Pagination in the requests list (deferred)
