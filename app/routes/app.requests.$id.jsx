import { useLoaderData } from '@remix-run/react'
import { json } from '@remix-run/node'
import { Page, Layout, Card, Text, Badge, DataTable } from '@shopify/polaris'
import shopify from '../shopify.server.js'
import db from '../db.server.js'

export async function loader({ request, params }) {
  await shopify.authenticate.admin(request)
  const req = await db.approvalRequest.findUnique({ where: { id: Number(params.id) } })
  if (!req) throw new Response('Not found', { status: 404 })
  return json({ req })
}

export default function RequestDetail() {
  const { req } = useLoaderData()
  const items = JSON.parse(req.cartItems)

  const rows = items.map(item => [
    item.productTitle ?? item.variantId,
    item.variantTitle ?? '—',
    item.quantity,
    `${item.price} ${req.currency}`,
  ])

  return (
    <Page title={`Richiesta #${req.id}`} backAction={{ url: '/app' }}>
      <Layout>
        <Layout.Section>
          <Card>
            <Text variant="headingMd">Dettagli</Text>
            <Text>Richiedente: {req.requesterName ?? req.requesterEmail}</Text>
            <Text>Manager: {req.managerEmail}</Text>
            <Text>Totale: {req.totalPrice} {req.currency}</Text>
            <Badge status={req.status === 'APPROVED' ? 'success' : req.status === 'REJECTED' ? 'critical' : 'attention'}>
              {req.status}
            </Badge>
            {req.requesterNote && <Text>Nota: {req.requesterNote}</Text>}
            {req.draftOrderInvoiceUrl && (
              <Text>
                <a href={req.draftOrderInvoiceUrl} target="_blank" rel="noreferrer">
                  Apri link di pagamento Draft Order
                </a>
              </Text>
            )}
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card title="Articoli del Carrello">
            <DataTable
              columnContentTypes={['text', 'text', 'numeric', 'text']}
              headings={['Prodotto', 'Variante', 'Qtà', 'Prezzo']}
              rows={rows}
              totalsName={{ singular: 'Totale', plural: 'Totale' }}
              totals={['', '', '', `${req.totalPrice} ${req.currency}`]}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
