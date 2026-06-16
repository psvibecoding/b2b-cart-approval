import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import crypto from 'node:crypto'
import {
  createApprovalRequest,
  getByToken,
  listByShop,
  updateStatus,
} from '../models/approvalRequest.server.js'

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

describe('approvalRequest model', () => {
  let shopDomain = 'test-model.myshopify.com'
  let createdToken

  beforeAll(async () => {
    await db.shop.upsert({
      where: { shopDomain },
      update: {},
      create: { shopDomain },
    })
  })

  afterAll(async () => {
    await db.approvalRequest.deleteMany({ where: { shopDomain } })
    await db.shop.deleteMany({ where: { shopDomain } })
  })

  it('createApprovalRequest returns a record with a 64-char token', async () => {
    const result = await createApprovalRequest({
      shopDomain,
      managerEmail: 'mgr@acme.com',
      cartItems: [{ variantId: 'gid://shopify/ProductVariant/99', quantity: 1, price: '5.00' }],
      currency: 'EUR',
      totalPrice: '5.00',
      requesterEmail: 'junior@acme.com',
    })
    createdToken = result.token
    expect(result.token).toHaveLength(64)
    expect(result.status).toBe('PENDING')
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now())
  })

  it('getByToken returns the request', async () => {
    const found = await getByToken(createdToken)
    expect(found).not.toBeNull()
    expect(found.managerEmail).toBe('mgr@acme.com')
    expect(JSON.parse(found.cartItems)).toHaveLength(1)
  })

  it('getByToken returns null for unknown token', async () => {
    const found = await getByToken('deadbeef'.repeat(8))
    expect(found).toBeNull()
  })

  it('listByShop returns requests for the shop', async () => {
    const list = await listByShop(shopDomain)
    expect(list.length).toBeGreaterThanOrEqual(1)
    expect(list[0].shopDomain).toBe(shopDomain)
  })

  it('updateStatus sets APPROVED and approvedAt', async () => {
    const req = await getByToken(createdToken)
    const updated = await updateStatus(req.id, 'APPROVED', {
      draftOrderId: 'gid://shopify/DraftOrder/1',
      draftOrderInvoiceUrl: 'https://shop.myshopify.com/invoices/abc',
    })
    expect(updated.status).toBe('APPROVED')
    expect(updated.approvedAt).not.toBeNull()
    expect(updated.draftOrderId).toBe('gid://shopify/DraftOrder/1')
  })
})
