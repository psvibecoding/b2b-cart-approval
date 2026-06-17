# B2B Cart Approval — App Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the entire app to English, improve the UI across admin/storefront/approval page with Lederly branding, and let merchants configure the B2B customer tag from both the app Settings page and the theme customizer.

**Architecture:** Seven independent tasks, each touching a focused set of files. No DB schema changes — `cartItems` JSON gains an optional `imageUrl` field (backward-compatible). Admin UI uses Polaris 12 components. Approve/reject page is server-rendered HTML.

**Tech Stack:** Remix, Shopify Polaris 12, Prisma/SQLite, Resend, Vitest, Liquid + vanilla JS theme extension.

## Global Constraints

- All user-facing strings must be in English — no Italian text anywhere
- Polaris 12 API: use `tone` (not `status`) on `Badge`; use `BlockStack`, `InlineGrid` layout components
- Run `npx vitest run` after each task — all tests must pass before committing
- Commit after every task with descriptive message

---

### Task 1: Translate strings to English + fix email test

**Files:**
- Modify: `app/services/email.server.js`
- Modify: `extensions/b2b-cart-block/blocks/cart-approval.liquid`
- Modify: `extensions/b2b-cart-block/assets/cart-approval.js`
- Modify: `app/__tests__/email.test.js`

**Interfaces:**
- Produces: English strings consumed by all later tasks that reference these files

- [ ] **Step 1: Update email test to mock Resend**

Replace the content of `app/__tests__/email.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: { send: vi.fn().mockResolvedValue({ id: 'mock-id' }) },
  })),
}))

import { sendApprovalEmail } from '../services/email.server.js'

describe('sendApprovalEmail', () => {
  it('sends via Resend when API key is set', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    const { Resend } = await import('resend')
    await sendApprovalEmail({
      to: 'manager@acme.com',
      requesterName: 'Junior Buyer',
      totalPrice: '500.00',
      currency: 'EUR',
      approvalUrl: 'https://store.myshopify.com/apps/b2b-approval/approve?token=abc123',
    })
    const instance = Resend.mock.results[0].value
    expect(instance.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'manager@acme.com' })
    )
    delete process.env.RESEND_API_KEY
  })

  it('logs to console when API key is absent', async () => {
    delete process.env.RESEND_API_KEY
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await sendApprovalEmail({
      to: 'mgr@x.com',
      requesterName: 'Someone',
      totalPrice: '0.00',
      currency: 'EUR',
      approvalUrl: 'https://x.com/approve?token=xyz',
    })
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
```

- [ ] **Step 2: Run test to verify it fails (Resend mock not matching)**

```bash
cd ~/projects/b2b-cart-approval && npx vitest run app/__tests__/email.test.js
```

Expected: one or both tests fail.

- [ ] **Step 3: Update email.server.js to English**

Replace the content of `app/services/email.server.js`:

```js
import { Resend } from 'resend'

export async function sendApprovalEmail({ to, requesterName, totalPrice, currency, approvalUrl }) {
  const subject = '[B2B Cart Approval] New approval request'
  const text = `
You have received a B2B cart approval request.

Requested by: ${requesterName}
Total: ${currency} ${totalPrice}

To approve or reject the cart, click the link:
${approvalUrl}

The link expires in 7 days.
`.trim()

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#008060;">New B2B Cart Approval Request</h2>
  <p><strong>Requested by:</strong> ${requesterName}</p>
  <p><strong>Total:</strong> ${currency} ${totalPrice}</p>
  <p style="margin-top:24px;">
    <a href="${approvalUrl}" style="background:#008060;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">
      Approve or Reject Cart
    </a>
  </p>
  <p style="color:#999;font-size:12px;margin-top:32px;">The link expires in 7 days.</p>
</div>
`.trim()

  if (!process.env.RESEND_API_KEY) {
    console.log(`\n=== EMAIL TO: ${to} ===\n${text}\n===================\n`)
    return
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    to,
    from: process.env.RESEND_FROM_EMAIL || 'noreply@lederly.com',
    subject,
    text,
    html,
  })
}
```

- [ ] **Step 4: Update cart-approval.liquid to English**

Replace the content of `extensions/b2b-cart-block/blocks/cart-approval.liquid`:

```liquid
{% comment %}
  App Block: B2B Cart Approval
  Add to Cart page via Online Store > Themes > Customize > Cart
{% endcomment %}

{% if customer and customer.tags contains block.settings.junior_tag %}
<div id="b2b-approval-block" data-shop="{{ shop.permanent_domain }}" data-app-proxy-url="{{ shop.url }}/apps/b2b-approval">
  <div id="b2b-approval-form" style="display:none; margin-top:16px; padding:16px; border:1px solid var(--color-border, #e0e0e0); border-radius:4px; font-family:var(--font-body-family, sans-serif);">
    <h3 style="margin:0 0 12px; font-family:var(--font-body-family, sans-serif);">Send for approval</h3>
    <label for="b2b-manager-email" style="display:block; margin-bottom:4px; font-size:14px;">Manager email *</label>
    <input
      type="email"
      id="b2b-manager-email"
      placeholder="manager@company.com"
      style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; margin-bottom:8px; box-sizing:border-box;"
    />
    <label for="b2b-note" style="display:block; margin-bottom:4px; font-size:14px;">Note (optional)</label>
    <textarea
      id="b2b-note"
      rows="2"
      style="width:100%; padding:8px; border:1px solid #ccc; border-radius:4px; margin-bottom:12px; box-sizing:border-box;"
    ></textarea>
    <button
      id="b2b-submit-btn"
      style="background:var(--color-button, #008060); color:var(--color-button-text, #fff); border:none; padding:12px 24px; border-radius:4px; font-size:16px; cursor:pointer; width:100%; font-family:var(--font-body-family, sans-serif);"
    >
      Submit for Approval
    </button>
    <div id="b2b-feedback" style="margin-top:8px; font-size:14px;"></div>
  </div>
</div>

<script src="{{ 'cart-approval.js' | asset_url }}" defer></script>
{% endif %}

{% schema %}
{
  "name": "B2B Cart Approval",
  "target": "section",
  "settings": [
    {
      "type": "text",
      "id": "junior_tag",
      "label": "B2B customer tag",
      "default": "b2b-junior",
      "info": "Customers with this tag will see the cart approval form instead of the checkout button."
    }
  ]
}
{% endschema %}
```

- [ ] **Step 5: Update cart-approval.js to English**

Replace the content of `extensions/b2b-cart-block/assets/cart-approval.js`:

```js
(function () {
  const block = document.getElementById('b2b-approval-block')
  if (!block) return

  const shopDomain = block.dataset.shop
  const proxyBase = block.dataset.appProxyUrl

  function interceptCheckout() {
    const selectors = [
      '[name="checkout"]',
      '[href="/checkout"]',
      '.cart__checkout-button',
      '#checkout',
    ]
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.display = 'none'
      })
    })
    document.getElementById('b2b-approval-form').style.display = 'block'
  }

  interceptCheckout()

  async function getCartItems() {
    const res = await fetch('/cart.js')
    const cart = await res.json()
    return {
      cartItems: cart.items.map(item => ({
        variantId: `gid://shopify/ProductVariant/${item.variant_id}`,
        productTitle: item.product_title,
        variantTitle: item.variant_title,
        quantity: item.quantity,
        price: (item.price / 100).toFixed(2),
        currencyCode: cart.currency,
        imageUrl: item.featured_image?.url ?? '',
      })),
      totalPrice: (cart.total_price / 100).toFixed(2),
      currency: cart.currency,
    }
  }

  async function getCurrentCustomer() {
    try {
      const res = await fetch('/account.json')
      if (!res.ok) return {}
      const data = await res.json()
      return {
        requesterEmail: data.customer?.email ?? '',
        requesterName: `${data.customer?.first_name ?? ''} ${data.customer?.last_name ?? ''}`.trim(),
      }
    } catch {
      return {}
    }
  }

  document.getElementById('b2b-submit-btn').addEventListener('click', async () => {
    const managerEmail = document.getElementById('b2b-manager-email').value.trim()
    const note = document.getElementById('b2b-note').value.trim()
    const feedback = document.getElementById('b2b-feedback')
    const btn = document.getElementById('b2b-submit-btn')

    if (!managerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail)) {
      feedback.style.color = '#d82c0d'
      feedback.textContent = 'Please enter a valid manager email address.'
      return
    }

    btn.disabled = true
    btn.textContent = 'Sending...'
    feedback.textContent = ''

    try {
      const { cartItems, totalPrice, currency } = await getCartItems()
      const { requesterEmail, requesterName } = await getCurrentCustomer()

      const res = await fetch(`${proxyBase}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain,
          managerEmail,
          requesterEmail,
          requesterName,
          requesterNote: note,
          cartItems,
          totalPrice,
          currency,
        }),
      })

      const json = await res.json()

      if (json.ok) {
        feedback.style.color = '#008060'
        feedback.textContent = 'Request sent! The manager will receive an approval link by email.'
        btn.textContent = 'Sent ✓'
      } else {
        throw new Error(json.error ?? 'Unknown error')
      }
    } catch (err) {
      feedback.style.color = '#d82c0d'
      feedback.textContent = `Error: ${err.message}`
      btn.disabled = false
      btn.textContent = 'Submit for Approval'
    }
  })
})()
```

- [ ] **Step 6: Run all tests**

```bash
cd ~/projects/b2b-cart-approval && npx vitest run
```

Expected: 8 test files pass, 0 failures.

- [ ] **Step 7: Commit**

```bash
cd ~/projects/b2b-cart-approval && git add app/services/email.server.js app/__tests__/email.test.js extensions/b2b-cart-block/blocks/cart-approval.liquid extensions/b2b-cart-block/assets/cart-approval.js && git commit -m "feat: translate all strings to English, fix theme extension tag, capture imageUrl"
```

---

### Task 2: Shop model — add getShopSettings and updateShopSettings

**Files:**
- Modify: `app/models/shop.server.js`
- Modify: `app/__tests__/shop.test.js`

**Interfaces:**
- Produces:
  - `getShopSettings(shopDomain: string) → Promise<{ shopDomain, juniorTag, ... } | null>`
  - `updateShopSettings(shopDomain: string, juniorTag: string) → Promise<{ shopDomain, juniorTag, ... }>`
  - Consumed by Task 3 (`app.settings.jsx`)

- [ ] **Step 1: Write failing tests for new model functions**

Add to `app/__tests__/shop.test.js` (keep existing tests, append these):

```js
import { upsertShop, getShopSettings, updateShopSettings } from '../models/shop.server.js'

// ... existing tests unchanged above ...

describe('getShopSettings', () => {
  it('returns shop with juniorTag', async () => {
    await upsertShop('settings-test.myshopify.com')
    const shop = await getShopSettings('settings-test.myshopify.com')
    expect(shop).not.toBeNull()
    expect(shop.juniorTag).toBe('b2b-junior')
  })

  it('returns null for unknown shop', async () => {
    const shop = await getShopSettings('nonexistent-999.myshopify.com')
    expect(shop).toBeNull()
  })
})

describe('updateShopSettings', () => {
  it('updates juniorTag for existing shop', async () => {
    await upsertShop('update-test.myshopify.com')
    await updateShopSettings('update-test.myshopify.com', 'vip-buyer')
    const shop = await getShopSettings('update-test.myshopify.com')
    expect(shop.juniorTag).toBe('vip-buyer')
  })

  it('creates shop record if it does not exist', async () => {
    await updateShopSettings('new-shop-test.myshopify.com', 'enterprise')
    const shop = await getShopSettings('new-shop-test.myshopify.com')
    expect(shop.juniorTag).toBe('enterprise')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ~/projects/b2b-cart-approval && npx vitest run app/__tests__/shop.test.js
```

Expected: FAIL — `getShopSettings is not a function`.

- [ ] **Step 3: Implement the two functions in shop.server.js**

Replace the content of `app/models/shop.server.js`:

```js
import db from '../db.server.js'

export async function upsertShop(shopDomain) {
  return db.shop.upsert({
    where: { shopDomain },
    update: {},
    create: { shopDomain },
  })
}

export async function getShopSettings(shopDomain) {
  return db.shop.findUnique({ where: { shopDomain } })
}

export async function updateShopSettings(shopDomain, juniorTag) {
  return db.shop.upsert({
    where: { shopDomain },
    update: { juniorTag },
    create: { shopDomain, juniorTag },
  })
}
```

- [ ] **Step 4: Run tests**

```bash
cd ~/projects/b2b-cart-approval && npx vitest run app/__tests__/shop.test.js
```

Expected: all shop tests pass.

- [ ] **Step 5: Run full test suite**

```bash
cd ~/projects/b2b-cart-approval && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
cd ~/projects/b2b-cart-approval && git add app/models/shop.server.js app/__tests__/shop.test.js && git commit -m "feat: add getShopSettings and updateShopSettings to shop model"
```

---

### Task 3: Settings page + nav update

**Files:**
- Create: `app/routes/app.settings.jsx`
- Create: `app/__tests__/settings.test.js`
- Modify: `app/routes/app.tsx`

**Interfaces:**
- Consumes: `getShopSettings`, `updateShopSettings` from Task 2
- Produces: `/app/settings` route — GET shows tag, POST saves tag

- [ ] **Step 1: Write failing tests for loader and action**

Create `app/__tests__/settings.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../models/shop.server.js', () => ({
  getShopSettings: vi.fn(),
  updateShopSettings: vi.fn(),
}))
vi.mock('../shopify.server.js', () => ({
  default: {
    authenticate: {
      admin: vi.fn().mockResolvedValue({ session: { shop: 'test.myshopify.com' } }),
    },
  },
}))

import { loader, action } from '../routes/app.settings.jsx'
import { getShopSettings, updateShopSettings } from '../models/shop.server.js'

describe('app.settings loader', () => {
  it('returns juniorTag from DB', async () => {
    getShopSettings.mockResolvedValue({ juniorTag: 'vip-buyer' })
    const res = await loader({ request: new Request('https://app.com/app/settings') })
    const data = await res.json()
    expect(data.juniorTag).toBe('vip-buyer')
  })

  it('falls back to b2b-junior when shop not found', async () => {
    getShopSettings.mockResolvedValue(null)
    const res = await loader({ request: new Request('https://app.com/app/settings') })
    const data = await res.json()
    expect(data.juniorTag).toBe('b2b-junior')
  })
})

describe('app.settings action', () => {
  beforeEach(() => {
    updateShopSettings.mockResolvedValue({})
  })

  it('saves juniorTag and returns success', async () => {
    const form = new FormData()
    form.set('juniorTag', 'enterprise-buyer')
    const res = await action({
      request: new Request('https://app.com/app/settings', { method: 'POST', body: form }),
    })
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(updateShopSettings).toHaveBeenCalledWith('test.myshopify.com', 'enterprise-buyer')
  })

  it('returns 400 when tag is empty', async () => {
    const form = new FormData()
    form.set('juniorTag', '   ')
    const res = await action({
      request: new Request('https://app.com/app/settings', { method: 'POST', body: form }),
    })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ~/projects/b2b-cart-approval && npx vitest run app/__tests__/settings.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create the Settings route**

Create `app/routes/app.settings.jsx`:

```jsx
import { useState } from 'react'
import { useLoaderData, useActionData, Form } from '@remix-run/react'
import { json } from '@remix-run/node'
import {
  Page, Layout, Card, TextField, Button, Banner, FormLayout, BlockStack,
} from '@shopify/polaris'
import shopify from '../shopify.server.js'
import { getShopSettings, updateShopSettings } from '../models/shop.server.js'

export async function loader({ request }) {
  const { session } = await shopify.authenticate.admin(request)
  const shop = await getShopSettings(session.shop)
  return json({ juniorTag: shop?.juniorTag ?? 'b2b-junior' })
}

export async function action({ request }) {
  const { session } = await shopify.authenticate.admin(request)
  const formData = await request.formData()
  const juniorTag = (formData.get('juniorTag') ?? '').trim()
  if (!juniorTag) return json({ error: 'Tag cannot be empty.' }, { status: 400 })
  await updateShopSettings(session.shop, juniorTag)
  return json({ success: true })
}

export default function Settings() {
  const { juniorTag } = useLoaderData()
  const actionData = useActionData()
  const [tag, setTag] = useState(juniorTag)

  return (
    <Page title="Settings">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {actionData?.success && (
              <Banner tone="success" title="Settings saved." onDismiss={() => {}} />
            )}
            {actionData?.error && (
              <Banner tone="critical" title={actionData.error} onDismiss={() => {}} />
            )}
            <Card>
              <Form method="post">
                <FormLayout>
                  <TextField
                    label="B2B customer tag"
                    name="juniorTag"
                    value={tag}
                    onChange={setTag}
                    helpText="Customers with this tag will see the cart approval form instead of the checkout button."
                    autoComplete="off"
                  />
                  <Button submit variant="primary">Save</Button>
                </FormLayout>
              </Form>
            </Card>
            <Banner tone="info">
              Set the same tag in your theme: Customize → Cart → B2B Cart Approval block → B2B customer tag.
            </Banner>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
```

- [ ] **Step 4: Update nav in app.tsx**

In `app/routes/app.tsx`, replace the `<NavMenu>` block:

```tsx
      <NavMenu>
        <Link to="/app" rel="home">
          Requests
        </Link>
        <Link to="/app/settings">Settings</Link>
      </NavMenu>
```

- [ ] **Step 5: Run tests**

```bash
cd ~/projects/b2b-cart-approval && npx vitest run app/__tests__/settings.test.js
```

Expected: 4 tests pass.

- [ ] **Step 6: Run full test suite**

```bash
cd ~/projects/b2b-cart-approval && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
cd ~/projects/b2b-cart-approval && git add app/routes/app.settings.jsx app/__tests__/settings.test.js app/routes/app.tsx && git commit -m "feat: add Settings page with configurable B2B customer tag"
```

---

### Task 4: Dashboard redesign (admin index)

**Files:**
- Modify: `app/routes/app._index.jsx`
- Modify: `app/__tests__/dashboard.test.js`

**Interfaces:**
- Consumes: `listByShop` (unchanged signature)
- Produces: updated UI — stats cards + clickable table rows

- [ ] **Step 1: Update dashboard test to cover English headings and counts**

Replace `app/__tests__/dashboard.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'

vi.mock('../models/approvalRequest.server.js', () => ({
  listByShop: vi.fn(),
}))
vi.mock('../shopify.server.js', () => ({
  default: {
    authenticate: {
      admin: vi.fn().mockResolvedValue({
        session: { shop: 'test.myshopify.com' },
      }),
    },
  },
}))

import { loader } from '../routes/app._index.jsx'
import { listByShop } from '../models/approvalRequest.server.js'

describe('app._index loader', () => {
  it('returns approval requests for the authenticated shop', async () => {
    listByShop.mockResolvedValue([
      { id: 1, status: 'PENDING', managerEmail: 'mgr@x.com', requesterName: 'Alice', requesterEmail: 'alice@x.com', totalPrice: '100.00', currency: 'EUR', createdAt: new Date() },
      { id: 2, status: 'APPROVED', managerEmail: 'mgr@x.com', requesterName: 'Bob', requesterEmail: 'bob@x.com', totalPrice: '200.00', currency: 'EUR', createdAt: new Date() },
    ])
    const req = new Request('https://app.com/app')
    const res = await loader({ request: req })
    const { requests } = await res.json()
    expect(requests).toHaveLength(2)
    expect(requests[0].status).toBe('PENDING')
    expect(requests[1].status).toBe('APPROVED')
  })
})
```

- [ ] **Step 2: Run test to verify it still passes (loader unchanged)**

```bash
cd ~/projects/b2b-cart-approval && npx vitest run app/__tests__/dashboard.test.js
```

Expected: PASS.

- [ ] **Step 3: Rewrite app._index.jsx**

Replace the content of `app/routes/app._index.jsx`:

```jsx
import { useLoaderData, useNavigate } from '@remix-run/react'
import { json } from '@remix-run/node'
import {
  Page, Layout, Card, IndexTable, Text, Badge, InlineGrid, BlockStack,
} from '@shopify/polaris'
import shopify from '../shopify.server.js'
import { listByShop } from '../models/approvalRequest.server.js'

const STATUS_TONE = {
  PENDING: 'attention',
  APPROVED: 'success',
  REJECTED: 'critical',
  EXPIRED: 'warning',
}

export async function loader({ request }) {
  const { session } = await shopify.authenticate.admin(request)
  const requests = await listByShop(session.shop)
  return json({ requests })
}

export default function Index() {
  const { requests } = useLoaderData()
  const navigate = useNavigate()

  const counts = {
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
  }

  const rows = requests.map((req, i) => (
    <IndexTable.Row
      id={String(req.id)}
      key={req.id}
      position={i}
      onClick={() => navigate(`/app/requests/${req.id}`)}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="semibold">
          {req.requesterName ?? req.requesterEmail ?? '—'}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{req.managerEmail}</IndexTable.Cell>
      <IndexTable.Cell>
        <Text alignment="end">{req.totalPrice} {req.currency}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={STATUS_TONE[req.status]}>{req.status}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {new Date(req.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
        })}
      </IndexTable.Cell>
    </IndexTable.Row>
  ))

  return (
    <Page title="B2B Cart Approval">
      <Layout>
        <Layout.Section>
          <InlineGrid columns={3} gap="400">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingXl" as="p">{counts.pending}</Text>
                <Badge tone="attention">Pending</Badge>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingXl" as="p">{counts.approved}</Text>
                <Badge tone="success">Approved</Badge>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingXl" as="p">{counts.rejected}</Text>
                <Badge tone="critical">Rejected</Badge>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <IndexTable
              resourceName={{ singular: 'request', plural: 'requests' }}
              itemCount={requests.length}
              headings={[
                { title: 'Requester' },
                { title: 'Manager' },
                { title: 'Total' },
                { title: 'Status' },
                { title: 'Date' },
              ]}
              selectable={false}
            >
              {rows}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
```

- [ ] **Step 4: Run full test suite**

```bash
cd ~/projects/b2b-cart-approval && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd ~/projects/b2b-cart-approval && git add app/routes/app._index.jsx app/__tests__/dashboard.test.js && git commit -m "feat: redesign dashboard with stats cards and English UI"
```

---

### Task 5: Request detail redesign

**Files:**
- Modify: `app/routes/app.requests.$id.jsx`

**Interfaces:**
- Consumes: `db.approvalRequest.findFirst` (unchanged)
- Produces: English detail page with better layout

- [ ] **Step 1: Rewrite app.requests.$id.jsx**

No new tests needed — no logic change, only UI. Replace the file content:

```jsx
import { useLoaderData } from '@remix-run/react'
import { json } from '@remix-run/node'
import {
  Page, Layout, Card, Text, Badge, DataTable, BlockStack, InlineStack, Link,
} from '@shopify/polaris'
import shopify from '../shopify.server.js'
import db from '../db.server.js'

const STATUS_TONE = {
  PENDING: 'attention',
  APPROVED: 'success',
  REJECTED: 'critical',
  EXPIRED: 'warning',
}

export async function loader({ request, params }) {
  const { session } = await shopify.authenticate.admin(request)
  const req = await db.approvalRequest.findFirst({
    where: { id: Number(params.id), shopDomain: session.shop },
  })
  if (!req) throw new Response('Not found', { status: 404 })
  return json({ req })
}

export default function RequestDetail() {
  const { req } = useLoaderData()
  const items = JSON.parse(req.cartItems)

  const rows = items.map(item => [
    item.productTitle ?? item.variantId,
    item.variantTitle ?? '—',
    item.quantity,
    `${item.price} ${req.currency}`,
  ])

  return (
    <Page
      title={`Request #${req.id}`}
      backAction={{ url: '/app', content: 'Requests' }}
      titleMetadata={<Badge tone={STATUS_TONE[req.status]}>{req.status}</Badge>}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Request details</Text>
                <InlineStack gap="600" wrap>
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">Requester</Text>
                    <Text>{req.requesterName ?? req.requesterEmail ?? '—'}</Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">Manager</Text>
                    <Text>{req.managerEmail}</Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">Total</Text>
                    <Text fontWeight="semibold">{req.totalPrice} {req.currency}</Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">Submitted</Text>
                    <Text>
                      {new Date(req.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  </BlockStack>
                </InlineStack>
                {req.requesterNote && (
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">Note</Text>
                    <Text>{req.requesterNote}</Text>
                  </BlockStack>
                )}
                {req.draftOrderInvoiceUrl && (
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">Draft Order</Text>
                    <Link url={req.draftOrderInvoiceUrl} target="_blank">Open payment link</Link>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Cart items</Text>
                <DataTable
                  columnContentTypes={['text', 'text', 'numeric', 'text']}
                  headings={['Product', 'Variant', 'Qty', 'Price']}
                  rows={rows}
                  totalsName={{ singular: 'Total', plural: 'Total' }}
                  totals={['', '', '', `${req.totalPrice} ${req.currency}`]}
                />
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd ~/projects/b2b-cart-approval && npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
cd ~/projects/b2b-cart-approval && git add app/routes/app.requests.\$id.jsx && git commit -m "feat: redesign request detail page with English UI and better layout"
```

---

### Task 6: Approve/reject page redesign

**Files:**
- Modify: `app/routes/approve.jsx`

**Interfaces:**
- Consumes: `getByToken`, `updateStatus`, `createDraftOrder` (all unchanged)
- Produces: branded HTML page with product photos, English state pages

- [ ] **Step 1: Rewrite approve.jsx**

Replace the content of `app/routes/approve.jsx`:

```jsx
import { redirect } from '@remix-run/node'
import { getByToken, updateStatus } from '../models/approvalRequest.server.js'
import { createDraftOrder } from '../services/draftOrder.server.js'
import shopify from '../shopify.server.js'

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const CSS = `
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f6f6f7; margin: 0; padding: 24px 16px; color: #202223; }
.wrapper { max-width: 680px; margin: 0 auto; }
.brand { text-align: center; margin-bottom: 32px; }
.brand-name { font-size: 28px; font-weight: 700; color: #008060; letter-spacing: -0.5px; }
.brand-sub { font-size: 14px; color: #6d7175; margin-top: 4px; }
.card { background: #fff; border-radius: 8px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.info-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; font-size: 14px; gap: 16px; }
.info-label { color: #6d7175; white-space: nowrap; }
.info-value { font-weight: 500; text-align: right; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e1e3e5; color: #6d7175; font-weight: 500; }
td { padding: 10px 12px; border-bottom: 1px solid #f1f2f3; vertical-align: middle; }
.img-cell { width: 80px; }
.product-img { width: 56px; height: 56px; object-fit: cover; border-radius: 4px; border: 1px solid #e1e3e5; display: block; }
.product-placeholder { width: 56px; height: 56px; background: #e1e3e5; border-radius: 4px; }
.total-row td { font-weight: 600; border-bottom: none; padding-top: 16px; font-size: 15px; }
.actions { display: flex; gap: 16px; margin-top: 8px; }
.btn { flex: 1; padding: 14px; font-size: 16px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; transition: opacity .15s; }
.btn:hover { opacity: 0.88; }
.btn-approve { background: #008060; color: #fff; }
.btn-reject { background: #d82c0d; color: #fff; }
.state-card { text-align: center; padding: 48px 24px; }
.state-icon { font-size: 40px; margin-bottom: 16px; }
.state-title { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
.state-sub { color: #6d7175; font-size: 14px; }
`

function htmlPage(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cart Approval — Lederly</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="wrapper">
    <div class="brand">
      <div class="brand-name">Lederly</div>
      <div class="brand-sub">Cart Approval Request</div>
    </div>
    ${body}
  </div>
</body>
</html>`
}

function statePage(icon, title, sub, status = 410) {
  return new Response(
    htmlPage(`<div class="card state-card">
      <div class="state-icon">${icon}</div>
      <div class="state-title">${title}</div>
      <div class="state-sub">${sub}</div>
    </div>`),
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export async function loader({ request }) {
  const token = new URL(request.url).searchParams.get('token')
  const approvalRequest = token ? await getByToken(token) : null

  if (!approvalRequest) {
    return statePage('🔗', 'Invalid link', 'This approval link is invalid or has expired.', 404)
  }

  if (approvalRequest.expiresAt < new Date()) {
    return statePage('⏰', 'Link expired', 'This approval link has expired. Please ask the requester to submit a new cart.')
  }

  if (approvalRequest.status === 'APPROVED') {
    return statePage('✅', 'Already approved', 'This request has already been approved.')
  }

  if (approvalRequest.status !== 'PENDING') {
    return statePage('✗', 'Request closed', 'This request has already been handled.')
  }

  const items = JSON.parse(approvalRequest.cartItems)

  const productRows = items.map(i => {
    const img = i.imageUrl
      ? `<img src="${escapeHtml(i.imageUrl)}" class="product-img" alt="${escapeHtml(i.productTitle ?? '')}">`
      : `<div class="product-placeholder"></div>`
    return `<tr>
      <td class="img-cell">${img}</td>
      <td>${escapeHtml(i.productTitle ?? i.variantId)}</td>
      <td>${escapeHtml(i.variantTitle ?? '—')}</td>
      <td style="text-align:right">${i.quantity}</td>
      <td style="text-align:right">${escapeHtml(i.price)} ${escapeHtml(approvalRequest.currency)}</td>
    </tr>`
  }).join('')

  const body = `
    <div class="card">
      <div class="info-row"><span class="info-label">From</span><span class="info-value">${escapeHtml(approvalRequest.requesterName ?? approvalRequest.requesterEmail)}</span></div>
      ${approvalRequest.requesterNote ? `<div class="info-row"><span class="info-label">Note</span><span class="info-value">${escapeHtml(approvalRequest.requesterNote)}</span></div>` : ''}
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th class="img-cell"></th>
            <th>Product</th>
            <th>Variant</th>
            <th style="text-align:right">Qty</th>
            <th style="text-align:right">Price</th>
          </tr>
        </thead>
        <tbody>${productRows}</tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="3"></td>
            <td style="text-align:right;color:#6d7175;font-weight:400">Total</td>
            <td style="text-align:right">${escapeHtml(approvalRequest.totalPrice)} ${escapeHtml(approvalRequest.currency)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <form method="POST" class="card" style="padding:20px 24px;">
      <input type="hidden" name="token" value="${escapeHtml(approvalRequest.token)}" />
      <div class="actions">
        <button name="intent" value="approve" class="btn btn-approve">Approve &amp; Pay</button>
        <button name="intent" value="reject" class="btn btn-reject">Reject</button>
      </div>
    </form>`

  return new Response(htmlPage(body), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function action({ request }) {
  const formData = await request.formData()
  const token = formData.get('token')
  const intent = formData.get('intent')

  const approvalRequest = await getByToken(token)
  if (!approvalRequest || approvalRequest.status !== 'PENDING' || approvalRequest.expiresAt < new Date()) {
    return new Response('Invalid request.', { status: 400 })
  }

  if (intent === 'reject') {
    await updateStatus(approvalRequest.id, 'REJECTED')
    return redirect(`https://${approvalRequest.shopDomain}?b2b_approval=rejected`)
  }

  if (intent === 'approve') {
    const { admin } = await shopify.unauthenticated.admin(approvalRequest.shopDomain)
    const items = JSON.parse(approvalRequest.cartItems)
    let draftOrderId, invoiceUrl
    try {
      const result = await createDraftOrder(admin, items, approvalRequest.requesterEmail)
      draftOrderId = result.draftOrderId
      invoiceUrl = result.invoiceUrl
    } catch (err) {
      return new Response(
        htmlPage(`<div class="card state-card">
          <div class="state-icon">⚠️</div>
          <div class="state-title">Error during approval</div>
          <div class="state-sub">${escapeHtml(err.message)}</div>
          <p style="margin-top:16px"><a href="javascript:history.back()" style="color:#008060">Go back</a></p>
        </div>`),
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    await updateStatus(approvalRequest.id, 'APPROVED', { draftOrderId, draftOrderInvoiceUrl: invoiceUrl })
    return redirect(invoiceUrl)
  }

  return new Response('Action not recognized.', { status: 400 })
}
```

- [ ] **Step 2: Run full test suite**

```bash
cd ~/projects/b2b-cart-approval && npx vitest run
```

Expected: all tests pass (approve logic unchanged, only HTML updated).

- [ ] **Step 3: Commit**

```bash
cd ~/projects/b2b-cart-approval && git add app/routes/approve.jsx && git commit -m "feat: redesign approve/reject page with Lederly branding and product photos"
```

---

### Task 7: Push and deploy

**Files:** none — git + CLI only

- [ ] **Step 1: Push all commits**

```bash
cd ~/projects/b2b-cart-approval && git push
```

- [ ] **Step 2: Deploy to Shopify**

```bash
cd ~/projects/b2b-cart-approval && npx shopify app deploy --allow-updates
```

Expected: `New version released to users.`

- [ ] **Step 3: Verify in dev store**

1. Open Shopify admin → Apps → B2B Cart Approval
2. Check dashboard shows stats cards and English table headings
3. Check Settings page loads and saves the tag
4. Open storefront cart with `?preview_theme_id=156370927805` — verify form is in English
5. Submit a test request — verify email arrives in English from `noreply@lederly.com`
6. Open the approval link — verify Lederly branding and product thumbnails
