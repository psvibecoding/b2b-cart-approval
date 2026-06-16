import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../models/approvalRequest.server.js', () => ({
  createApprovalRequest: vi.fn(),
}))
vi.mock('../services/email.server.js', () => ({
  sendApprovalEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('../utils/proxy.server.js', () => ({
  validateProxySignature: vi.fn().mockReturnValue(true),
}))

import { action } from '../routes/proxy.submit.jsx'
import { createApprovalRequest } from '../models/approvalRequest.server.js'

const validBody = {
  shopDomain: 'test.myshopify.com',
  managerEmail: 'mgr@acme.com',
  requesterEmail: 'jr@acme.com',
  requesterName: 'Junior',
  requesterNote: '',
  cartItems: [{ variantId: 'gid://shopify/ProductVariant/1', quantity: 1, price: '10.00', productTitle: 'Widget', currencyCode: 'EUR' }],
  totalPrice: '10.00',
  currency: 'EUR',
}

function makeRequest(body, url = 'https://app.com/proxy/submit?shop=test.myshopify.com&signature=valid') {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('proxy.submit action', () => {
  beforeEach(() => {
    createApprovalRequest.mockResolvedValue({
      token: 'a'.repeat(64),
      shopDomain: 'test.myshopify.com',
    })
  })

  it('returns 200 with token on valid request', async () => {
    const response = await action({ request: makeRequest(validBody) })
    const json = await response.json()
    expect(response.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.token).toHaveLength(64)
  })

  it('returns 400 when managerEmail is missing', async () => {
    const { managerEmail: _, ...body } = validBody
    const response = await action({ request: makeRequest(body) })
    expect(response.status).toBe(400)
    const json = await response.json()
    expect(json.ok).toBe(false)
  })

  it('returns 400 when cartItems is empty', async () => {
    const response = await action({ request: makeRequest({ ...validBody, cartItems: [] }) })
    expect(response.status).toBe(400)
  })
})
