import crypto from 'node:crypto'
import db from '../db.server.js'

export async function createApprovalRequest({
  shopDomain,
  managerEmail,
  cartItems,
  currency,
  totalPrice,
  requesterEmail,
  requesterName,
  requesterCustomerId,
  requesterNote,
}) {
  return db.approvalRequest.create({
    data: {
      token: crypto.randomBytes(32).toString('hex'),
      shopDomain,
      managerEmail,
      cartItems: JSON.stringify(cartItems),
      currency: currency ?? 'EUR',
      totalPrice,
      requesterEmail,
      requesterName,
      requesterCustomerId,
      requesterNote,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })
}

export async function getByToken(token) {
  return db.approvalRequest.findUnique({ where: { token } })
}

export async function listByShop(shopDomain) {
  return db.approvalRequest.findMany({
    where: { shopDomain },
    orderBy: { createdAt: 'desc' },
  })
}

export async function updateStatus(id, status, extra = {}) {
  const timestamps = {}
  if (status === 'APPROVED') timestamps.approvedAt = new Date()
  if (status === 'REJECTED') timestamps.rejectedAt = new Date()

  return db.approvalRequest.update({
    where: { id },
    data: { status, ...extra, ...timestamps },
  })
}
