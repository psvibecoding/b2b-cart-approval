import { describe, it, expect, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { upsertShop, getShopSettings, updateShopSettings } from '../models/shop.server.js'

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
