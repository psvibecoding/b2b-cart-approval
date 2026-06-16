// TODO: replace console.log with Sendgrid: npm install @sendgrid/mail
// then: sgMail.setApiKey(process.env.SENDGRID_API_KEY); sgMail.send({...})

export async function sendApprovalEmail({ to, requesterName, totalPrice, currency, approvalUrl }) {
  const body = `
[B2B Cart Approval] New approval request

Submitted by: ${requesterName}
Total: ${currency} ${totalPrice}

To approve or reject this cart, click the link below:
${approvalUrl}

This link expires in 7 days.
`.trim()

  console.log(`\n=== EMAIL TO: ${to} ===\n${body}\n===================\n`)
}
