import { json } from '@remix-run/node'
import { createApprovalRequest } from '../models/approvalRequest.server.js'
import { upsertShop } from '../models/shop.server.js'
import { sendApprovalEmail } from '../services/email.server.js'
import { validateProxySignature } from '../utils/proxy.server.js'

export async function action({ request }) {
  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, { status: 405 })
  }

  if (!validateProxySignature(request)) {
    return json({ ok: false, error: 'Invalid signature' }, { status: 401 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const trustedShop = new URL(request.url).searchParams.get('shop')
  const { shopDomain: bodyShopDomain, managerEmail, requesterEmail, requesterName, requesterNote, cartItems, totalPrice, currency } = body
  const shopDomain = trustedShop ?? bodyShopDomain

  if (!managerEmail || !shopDomain) {
    return json({ ok: false, error: 'managerEmail and shopDomain are required' }, { status: 400 })
  }

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return json({ ok: false, error: 'cartItems must be a non-empty array' }, { status: 400 })
  }

  await upsertShop(shopDomain)

  let approvalRequest
  try {
    approvalRequest = await createApprovalRequest({
      shopDomain,
      managerEmail,
      cartItems,
      currency: currency ?? 'EUR',
      totalPrice: totalPrice ?? '0.00',
      requesterEmail,
      requesterName,
      requesterNote,
    })
  } catch (err) {
    console.error('[submit] createApprovalRequest failed:', err.message)
    return json({ ok: false, error: 'Failed to save request. Please try again.' }, { status: 500 })
  }

  const approvalUrl = `https://${shopDomain}/apps/b2b-approval/approve?token=${approvalRequest.token}`

  try {
    await sendApprovalEmail({
      to: managerEmail,
      requesterName: requesterName ?? requesterEmail ?? 'A team member',
      totalPrice: totalPrice ?? '0.00',
      currency: currency ?? 'EUR',
      approvalUrl,
    })
  } catch (err) {
    console.error('[submit] sendApprovalEmail failed:', err.message)
  }

  return json({ ok: true, token: approvalRequest.token }, { status: 200 })
}

// No loader — this is a POST-only endpoint
export function loader() {
  return json({ ok: false, error: 'Use POST' }, { status: 405 })
}
