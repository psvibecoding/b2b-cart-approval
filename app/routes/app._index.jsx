import { useLoaderData } from '@remix-run/react'
import { json } from '@remix-run/node'
import {
  Page, Layout, Card, IndexTable, Text, Badge, Link,
} from '@shopify/polaris'
import shopify from '../shopify.server.js'
import { listByShop } from '../models/approvalRequest.server.js'

const STATUS_BADGE = {
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

  const rows = requests.map((req, i) => (
    <IndexTable.Row id={String(req.id)} key={req.id} position={i}>
      <IndexTable.Cell>
        <Link url={`/app/requests/${req.id}`}>{req.id}</Link>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge status={STATUS_BADGE[req.status]}>{req.status}</Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>{req.managerEmail}</IndexTable.Cell>
      <IndexTable.Cell>{req.totalPrice} {req.currency}</IndexTable.Cell>
      <IndexTable.Cell>{new Date(req.createdAt).toLocaleString('it-IT')}</IndexTable.Cell>
    </IndexTable.Row>
  ))

  return (
    <Page title="Richieste di Approvazione B2B">
      <Layout>
        <Layout.Section>
          <Card>
            <IndexTable
              resourceName={{ singular: 'richiesta', plural: 'richieste' }}
              itemCount={requests.length}
              headings={[
                { title: 'ID' },
                { title: 'Stato' },
                { title: 'Manager' },
                { title: 'Totale' },
                { title: 'Data' },
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
