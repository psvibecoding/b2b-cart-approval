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

export async function loader({ request }) {
  const token = new URL(request.url).searchParams.get('token')
  const approvalRequest = token ? await getByToken(token) : null

  if (!approvalRequest) {
    return new Response('<h1>Link non valido o scaduto.</h1>', {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  if (approvalRequest.status !== 'PENDING' || approvalRequest.expiresAt < new Date()) {
    return new Response(
      `<h1>Questa richiesta è già stata ${approvalRequest.status === 'APPROVED' ? 'approvata' : 'gestita'}.</h1>`,
      { status: 410, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  }

  const items = JSON.parse(approvalRequest.cartItems)
  const rows = items
    .map(i => `<tr><td>${escapeHtml(i.productTitle ?? i.variantId)}</td><td>${i.quantity}</td><td>${i.price} ${approvalRequest.currency}</td></tr>`)
    .join('')

  const html = `<!DOCTYPE html>
<html lang="it">
<head><meta charset="utf-8"><title>Approvazione Carrello B2B</title>
<style>body{font-family:sans-serif;max-width:600px;margin:40px auto;padding:0 20px}
table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #ddd;text-align:left}
.btn{padding:12px 24px;margin:8px;cursor:pointer;border:none;border-radius:4px;font-size:16px}
.approve{background:#008060;color:#fff}.reject{background:#d82c0d;color:#fff}</style>
</head>
<body>
<h2>Richiesta di approvazione carrello</h2>
<p>Da: <strong>${escapeHtml(approvalRequest.requesterName ?? approvalRequest.requesterEmail)}</strong></p>
${approvalRequest.requesterNote ? `<p>Nota: ${escapeHtml(approvalRequest.requesterNote)}</p>` : ''}
<table><thead><tr><th>Prodotto</th><th>Qtà</th><th>Prezzo</th></tr></thead>
<tbody>${rows}</tbody>
<tfoot><tr><td colspan="2"><strong>Totale</strong></td><td><strong>${approvalRequest.totalPrice} ${approvalRequest.currency}</strong></td></tr></tfoot>
</table>
<form method="POST" style="margin-top:24px">
  <input type="hidden" name="token" value="${escapeHtml(approvalRequest.token)}" />
  <button name="intent" value="approve" class="btn approve">Approva e Paga</button>
  <button name="intent" value="reject" class="btn reject">Rifiuta</button>
</form>
</body></html>`

  return new Response(html, {
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
    return new Response('Richiesta non valida.', { status: 400 })
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
        `<html><body><h2>Errore durante l'approvazione</h2><p>${escapeHtml(err.message)}</p><p><a href="javascript:history.back()">Torna indietro</a></p></body></html>`,
        { status: 500, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    }

    await updateStatus(approvalRequest.id, 'APPROVED', { draftOrderId, draftOrderInvoiceUrl: invoiceUrl })

    return redirect(invoiceUrl)
  }

  return new Response('Azione non riconosciuta.', { status: 400 })
}
