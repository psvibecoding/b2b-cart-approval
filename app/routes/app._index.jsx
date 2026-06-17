import { useLoaderData, useNavigate } from '@remix-run/react'
import { json } from '@remix-run/node'
import {
  Page, Layout, Card, IndexTable, Text, Badge, InlineGrid, BlockStack,
} from '@shopify/polaris'
import shopify from '../shopify.server.js'
import { listByShop } from '../models/approvalRequest.server.js'

const STATUS_TONE = {
  PENDING: 'attention',
  APPROVED: 'success',
  REJECTED: 'critical',
  EXPIRED: 'warning',
}

export async function loader({ request }) {
  const { session } = await shopify.authenticate.admin(request)
  const requests = await listByShop(session.shop)
  return json({ requests })
}

export default function Index() {
  const { requests } = useLoaderData()
  const navigate = useNavigate()

  const counts = {
    pending: requests.filter(r => r.status === 'PENDING').length,
    approved: requests.filter(r => r.status === 'APPROVED').length,
    rejected: requests.filter(r => r.status === 'REJECTED').length,
  }

  const rows = requests.map((req, i) => (
    <IndexTable.Row
      id={String(req.id)}
      key={req.id}
      position={i}
      onClick={() => navigate(`/app/requests/${req.id}`)}
    >
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="semibold">
          {req.requesterName ?? req.requesterEmail ?? '—'}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>{req.managerEmail}</IndexTable.Cell>
      <IndexTable.Cell>
        <Text alignment="end">{req.totalPrice} {req.currency}</Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge tone={STATUS_TONE[req.status]}>{req.status}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {new Date(req.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
        })}
      </IndexTable.Cell>
    </IndexTable.Row>
  ))

  return (
    <Page title="B2B Cart Approval">
      <Layout>
        <Layout.Section>
          <InlineGrid columns={3} gap="400">
            <Card>
              <BlockStack gap="200">
                <Text variant="headingXl" as="p">{counts.pending}</Text>
                <Badge tone="attention">Pending</Badge>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingXl" as="p">{counts.approved}</Text>
                <Badge tone="success">Approved</Badge>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="200">
                <Text variant="headingXl" as="p">{counts.rejected}</Text>
                <Badge tone="critical">Rejected</Badge>
              </BlockStack>
            </Card>
          </InlineGrid>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <IndexTable
              resourceName={{ singular: 'request', plural: 'requests' }}
              itemCount={requests.length}
              headings={[
                { title: 'Requester' },
                { title: 'Manager' },
                { title: 'Total' },
                { title: 'Status' },
                { title: 'Date' },
              ]}
              selectable={false}
            >
              {rows}
            </IndexTable>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
