import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import crypto from 'node:crypto'

const db = new PrismaClient()

beforeAll(async () => {
  await db.approvalRequest.deleteMany()
  await db.shop.deleteMany()
})

afterAll(async () => {
  await db.approvalRequest.deleteMany()
  await db.shop.deleteMany()
  await db.$disconnect()
})

describe('ApprovalRequest schema', () => {
  it('creates a shop and approval request', async () => {
    const shop = await db.shop.create({
      data: { shopDomain: 'test-schema.myshopify.com' },
    })

    const req = await db.approvalRequest.create({
      data: {
        token: crypto.randomBytes(32).toString('hex'),
        shopDomain: shop.shopDomain,
        managerEmail: 'manager@example.com',
        cartItems: JSON.stringify([{ variantId: 'gid://shopify/ProductVariant/1', quantity: 2, price: '10.00' }]),
        totalPrice: '20.00',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })

    expect(req.status).toBe('PENDING')
    expect(req.token).toHaveLength(64)
    expect(req.shopDomain).toBe('test-schema.myshopify.com')
  })
})
