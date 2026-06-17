import sgMail from '@sendgrid/mail'

export async function sendApprovalEmail({ to, requesterName, totalPrice, currency, approvalUrl }) {
  const subject = '[B2B Cart Approval] Nuova richiesta di approvazione'
  const text = `
Hai ricevuto una richiesta di approvazione carrello B2B.

Richiesta di: ${requesterName}
Totale: ${currency} ${totalPrice}

Per approvare o rifiutare il carrello, clicca il link:
${approvalUrl}

Il link scade tra 7 giorni.
`.trim()

  const html = `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#008060;">Nuova richiesta di approvazione carrello B2B</h2>
  <p><strong>Richiesta di:</strong> ${requesterName}</p>
  <p><strong>Totale:</strong> ${currency} ${totalPrice}</p>
  <p style="margin-top:24px;">
    <a href="${approvalUrl}" style="background:#008060;color:#fff;padding:12px 24px;text-decoration:none;border-radius:4px;display:inline-block;">
      Approva o Rifiuta il Carrello
    </a>
  </p>
  <p style="color:#999;font-size:12px;margin-top:32px;">Il link scade tra 7 giorni.</p>
</div>
`.trim()

  if (!process.env.SENDGRID_API_KEY) {
    console.log(`\n=== EMAIL TO: ${to} ===\n${text}\n===================\n`)
    return
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  await sgMail.send({
    to,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@lederly.com',
    subject,
    text,
    html,
  })
}
