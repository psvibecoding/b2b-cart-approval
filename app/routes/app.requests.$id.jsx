import { useLoaderData } from '@remix-run/react'
import { json } from '@remix-run/node'
import {
  Page, Layout, Card, Text, Badge, DataTable, BlockStack, InlineStack, Link,
} from '@shopify/polaris'
import shopify from '../shopify.server.js'
import db from '../db.server.js'

const STATUS_TONE = {
  PENDING: 'attention',
  APPROVED: 'success',
  REJECTED: 'critical',
  EXPIRED: 'warning',
}

export async function loader({ request, params }) {
  const { session } = await shopify.authenticate.admin(request)
  const req = await db.approvalRequest.findFirst({
    where: { id: Number(params.id), shopDomain: session.shop },
  })
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
    <Page
      title={`Request #${req.id}`}
      backAction={{ url: '/app', content: 'Requests' }}
      titleMetadata={<Badge tone={STATUS_TONE[req.status]}>{req.status}</Badge>}
    >
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Request details</Text>
                <InlineStack gap="600" wrap>
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">Requester</Text>
                    <Text>{req.requesterName ?? req.requesterEmail ?? '—'}</Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">Manager</Text>
                    <Text>{req.managerEmail}</Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">Total</Text>
                    <Text fontWeight="semibold">{req.totalPrice} {req.currency}</Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">Submitted</Text>
                    <Text>
                      {new Date(req.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </Text>
                  </BlockStack>
                </InlineStack>
                {req.requesterNote && (
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">Note</Text>
                    <Text>{req.requesterNote}</Text>
                  </BlockStack>
                )}
                {req.draftOrderInvoiceUrl && (
                  <BlockStack gap="100">
                    <Text variant="bodySm" tone="subdued">Draft Order</Text>
                    <Link url={req.draftOrderInvoiceUrl} target="_blank">Open payment link</Link>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="300">
                <Text variant="headingMd">Cart items</Text>
                <DataTable
                  columnContentTypes={['text', 'text', 'numeric', 'text']}
                  headings={['Product', 'Variant', 'Qty', 'Price']}
                  rows={rows}
                  totalsName={{ singular: 'Total', plural: 'Total' }}
                  totals={['', '', '', `${req.totalPrice} ${req.currency}`]}
                />
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
