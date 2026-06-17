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
