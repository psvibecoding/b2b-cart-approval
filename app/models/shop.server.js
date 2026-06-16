import db from '../db.server.js'

export async function upsertShop(shopDomain) {
  return db.shop.upsert({
    where: { shopDomain },
    update: {},
    create: { shopDomain },
  })
}
