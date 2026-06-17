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
