import { Resend } from 'resend'

function escapeHtml(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

export async function sendApprovalEmail({ to, requesterName, totalPrice, currency, approvalUrl }) {
  const subject = '[B2B Cart Approval] New approval request'
  const text = `
You have received a B2B cart approval request.

Requested by: ${escapeHtml(requesterName)}
Total: ${currency} ${totalPrice}

To approve or reject the cart, click the link:
${approvalUrl}

The link expires in 7 days.
`.trim()

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#008060;">New B2B Cart Approval Request</h2>
  <p><strong>Requested by:</strong> ${escapeHtml(requesterName)}</p>
  <p><strong>Total:</strong> ${currency} ${totalPrice}</p>
  <p style="margin-top:24px;">
    <a href="${approvalUrl}" style="background:#008060;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">
      Approve or Reject Cart
    </a>
  </p>
  <p style="color:#999;font-size:12px;margin-top:32px;">The link expires in 7 days.</p>
</div>
`.trim()

  if (!process.env.RESEND_API_KEY) {
    console.log(`\n=== EMAIL TO: ${to} ===\n${text}\n===================\n`)
    return
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  await resend.emails.send({
    to,
    from: process.env.RESEND_FROM_EMAIL || 'noreply@lederly.com',
    subject,
    text,
    html,
  })
}
