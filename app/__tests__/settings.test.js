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
