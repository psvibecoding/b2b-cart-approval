import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../models/approvalRequest.server.js', () => ({
  getByToken: vi.fn(),
  updateStatus: vi.fn(),
}))
vi.mock('../services/draftOrder.server.js', () => ({
  createDraftOrder: vi.fn(),
}))

vi.mock('../shopify.server.js', () => ({
  default: {
    unauthenticated: {
      admin: vi.fn().mockResolvedValue({ admin: { graphql: vi.fn() } }),
    },
  },
}))

import { loader, action } from '../routes/apps.b2b-approval.approve.jsx'
import { getByToken, updateStatus } from '../models/approvalRequest.server.js'
import { createDraftOrder } from '../services/draftOrder.server.js'

const pendingRequest = {
  id: 1,
  token: 'a'.repeat(64),
  shopDomain: 'test.myshopify.com',
  status: 'PENDING',
  managerEmail: 'mgr@acme.com',
  requesterName: 'Junior',
  requesterEmail: 'jr@acme.com',
  requesterNote: 'Please check',
  cartItems: JSON.stringify([{ variantId: 'gid://shopify/ProductVariant/1', quantity: 1, price: '10.00', productTitle: 'Widget' }]),
  totalPrice: '10.00',
  currency: 'EUR',
  expiresAt: new Date(Date.now() + 86400000),
}

describe('proxy.approve loader', () => {
  it('returns 404 for unknown token', async () => {
    getByToken.mockResolvedValue(null)
    const req = new Request('https://app.com/proxy/approve?token=unknown')
    const res = await loader({ request: req })
    expect(res.status).toBe(404)
  })

  it('returns approval page data for valid token', async () => {
    getByToken.mockResolvedValue(pendingRequest)
    const req = new Request(`https://app.com/proxy/approve?token=${'a'.repeat(64)}`)
    const res = await loader({ request: req })
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('Widget')
    expect(text).toContain('10.00')
  })
})

describe('proxy.approve action — approve', () => {
  beforeEach(() => {
    getByToken.mockResolvedValue(pendingRequest)
    createDraftOrder.mockResolvedValue({
      draftOrderId: 'gid://shopify/DraftOrder/1',
      invoiceUrl: 'https://test.myshopify.com/invoices/abc',
    })
    updateStatus.mockResolvedValue({ ...pendingRequest, status: 'APPROVED' })
  })

  it('redirects to invoiceUrl on approve', async () => {
    const formData = new FormData()
    formData.append('token', 'a'.repeat(64))
    formData.append('intent', 'approve')
    const req = new Request('https://app.com/proxy/approve', { method: 'POST', body: formData })
    const res = await action({ request: req })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://test.myshopify.com/invoices/abc')
  })
})

describe('proxy.approve action — reject', () => {
  it('marks request as REJECTED and redirects to store', async () => {
    getByToken.mockResolvedValue(pendingRequest)
    updateStatus.mockResolvedValue({ ...pendingRequest, status: 'REJECTED' })
    const formData = new FormData()
    formData.append('token', 'a'.repeat(64))
    formData.append('intent', 'reject')
    const req = new Request('https://app.com/proxy/approve', { method: 'POST', body: formData })
    const res = await action({ request: req })
    expect(res.status).toBe(302)
    expect(res.headers.get('Location')).toBe('https://test.myshopify.com?b2b_approval=rejected')
  })
})
