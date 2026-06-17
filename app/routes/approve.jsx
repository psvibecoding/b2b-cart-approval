import { redirect } from '@remix-run/node'
import { getByToken, updateStatus } from '../models/approvalRequest.server.js'
import { createDraftOrder } from '../services/draftOrder.server.js'
import shopify from '../shopify.server.js'

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const CSS = `
* { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f6f6f7; margin: 0; padding: 24px 16px; color: #202223; }
.wrapper { max-width: 680px; margin: 0 auto; }
.brand { text-align: center; margin-bottom: 32px; }
.brand-name { font-size: 28px; font-weight: 700; color: #008060; letter-spacing: -0.5px; }
.brand-sub { font-size: 14px; color: #6d7175; margin-top: 4px; }
.card { background: #fff; border-radius: 8px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.info-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; font-size: 14px; gap: 16px; }
.info-label { color: #6d7175; white-space: nowrap; }
.info-value { font-weight: 500; text-align: right; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { text-align: left; padding: 8px 12px; border-bottom: 1px solid #e1e3e5; color: #6d7175; font-weight: 500; }
td { padding: 10px 12px; border-bottom: 1px solid #f1f2f3; vertical-align: middle; }
.img-cell { width: 80px; }
.product-img { width: 56px; height: 56px; object-fit: cover; border-radius: 4px; border: 1px solid #e1e3e5; display: block; }
.product-placeholder { width: 56px; height: 56px; background: #e1e3e5; border-radius: 4px; }
.total-row td { font-weight: 600; border-bottom: none; padding-top: 16px; font-size: 15px; }
.actions { display: flex; gap: 16px; margin-top: 8px; }
.btn { flex: 1; padding: 14px; font-size: 16px; font-weight: 600; border: none; border-radius: 6px; cursor: pointer; transition: opacity .15s; }
.btn:hover { opacity: 0.88; }
.btn-approve { background: #008060; color: #fff; }
.btn-reject { background: #d82c0d; color: #fff; }
.state-card { text-align: center; padding: 48px 24px; }
.state-icon { font-size: 40px; margin-bottom: 16px; }
.state-title { font-size: 20px; font-weight: 600; margin-bottom: 8px; }
.state-sub { color: #6d7175; font-size: 14px; }
`

function htmlPage(body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cart Approval — Lederly</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="wrapper">
    <div class="brand">
      <div class="brand-name">Lederly</div>
      <div class="brand-sub">Cart Approval Request</div>
    </div>
    ${body}
  </div>
</body>
</html>`
}

function statePage(icon, title, sub, status = 410) {
  return new Response(
    htmlPage(`<div class="card state-card">
      <div class="state-icon">${icon}</div>
      <div class="state-title">${title}</div>
      <div class="state-sub">${sub}</div>
    </div>`),
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export async function loader({ request }) {
  const token = new URL(request.url).searchParams.get('token')
  const approvalRequest = token ? await getByToken(token) : null

  if (!approvalRequest) {
    return statePage('🔗', 'Invalid link', 'This approval link is invalid or has expired.', 404)
  }

  if (approvalRequest.expiresAt < new Date()) {
    return statePage('⏰', 'Link expired', 'This approval link has expired. Please ask the requester to submit a new cart.')
  }

  if (approvalRequest.status === 'APPROVED') {
    return statePage('✅', 'Already approved', 'This request has already been approved.')
  }

  if (approvalRequest.status !== 'PENDING') {
    return statePage('✗', 'Request closed', 'This request has already been handled.')
  }

  const items = JSON.parse(approvalRequest.cartItems)

  const productRows = items.map(i => {
    const img = i.imageUrl
      ? `<img src="${escapeHtml(i.imageUrl)}" class="product-img" alt="${escapeHtml(i.productTitle ?? '')}">`
      : `<div class="product-placeholder"></div>`
    return `<tr>
      <td class="img-cell">${img}</td>
      <td>${escapeHtml(i.productTitle ?? i.variantId)}</td>
      <td>${escapeHtml(i.variantTitle ?? '—')}</td>
      <td style="text-align:right">${escapeHtml(String(i.quantity))}</td>
      <td style="text-align:right">${escapeHtml(i.price)} ${escapeHtml(approvalRequest.currency)}</td>
    </tr>`
  }).join('')

  const body = `
    <div class="card">
      <div class="info-row"><span class="info-label">From</span><span class="info-value">${escapeHtml(approvalRequest.requesterName ?? approvalRequest.requesterEmail)}</span></div>
      ${approvalRequest.requesterNote ? `<div class="info-row"><span class="info-label">Note</span><span class="info-value">${escapeHtml(approvalRequest.requesterNote)}</span></div>` : ''}
    </div>
    <div class="card">
      <table>
        <thead>
          <tr>
            <th class="img-cell"></th>
            <th>Product</th>
            <th>Variant</th>
            <th style="text-align:right">Qty</th>
            <th style="text-align:right">Price</th>
          </tr>
        </thead>
        <tbody>${productRows}</tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="3"></td>
            <td style="text-align:right;color:#6d7175;font-weight:400">Total</td>
            <td style="text-align:right">${escapeHtml(approvalRequest.totalPrice)} ${escapeHtml(approvalRequest.currency)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
    <form method="POST" class="card" style="padding:20px 24px;">
      <input type="hidden" name="token" value="${escapeHtml(approvalRequest.token)}" />
      <div class="actions">
        <button name="intent" value="approve" class="btn btn-approve">Approve &amp; Pay</button>
        <button name="intent" value="reject" class="btn btn-reject">Reject</button>
      </div>
    </form>`

  return new Response(htmlPage(body), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

export async function action({ request }) {
  const formData = await request.formData()
  const token = formData.get('token')
  const intent = formData.get('intent')

  const approvalRequest = await getByToken(token)
  if (!approvalRequest || approvalRequest.status !== 'PENDING' || approvalRequest.expiresAt < new Date()) {
    return new Response('Invalid request.', { status: 400 })
  }

  if (intent === 'reject') {
    await updateStatus(approvalRequest.id, 'REJECTED')
    return redirect(`https://${approvalRequest.shopDomain}?b2b_approval=rejected`)
  }

  if (intent === 'approve') {
    const { admin } = await shopify.unauthenticated.admin(approvalRequest.shopDomain)
    const items = JSON.parse(approvalRequest.cartItems)
    let draftOrderId, invoiceUrl
    try {
      const result = await createDraftOrder(admin, items, approvalRequest.requesterEmail)
      draftOrderId = result.draftOrderId
      invoiceUrl = result.invoiceUrl
    } catch (err) {
      return new Response(
        htmlPage(`<div class="card state-card">
          <div class="state-icon">⚠️</div>
          <div class="state-title">Error during approval</div>
          <div class="state-sub">${escapeHtml(err.message)}</div>
          <p style="margin-top:16px"><a href="javascript:history.back()" style="color:#008060">Go back</a></p>
        </div>`),
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    await updateStatus(approvalRequest.id, 'APPROVED', { draftOrderId, draftOrderInvoiceUrl: invoiceUrl })
    return redirect(invoiceUrl)
  }

  return new Response('Action not recognized.', { status: 400 })
}
