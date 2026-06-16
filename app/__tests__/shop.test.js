import { describe, it, expect, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { upsertShop } from '../models/shop.server.js'

const db = new PrismaClient()

afterAll(async () => {
  await db.shop.deleteMany({ where: { shopDomain: 'upsert-test.myshopify.com' } })
  await db.$disconnect()
})

describe('upsertShop', () => {
  it('creates a shop on first call', async () => {
    const shop = await upsertShop('upsert-test.myshopify.com')
    expect(shop.shopDomain).toBe('upsert-test.myshopify.com')
    expect(shop.juniorTag).toBe('b2b-junior')
  })

  it('does not throw on second call (upsert)', async () => {
    const shop = await upsertShop('upsert-test.myshopify.com')
    expect(shop.shopDomain).toBe('upsert-test.myshopify.com')
  })
})
