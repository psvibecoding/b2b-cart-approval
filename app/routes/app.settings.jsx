import { useState } from 'react'
import { useLoaderData, useActionData, Form } from '@remix-run/react'
import { json } from '@remix-run/node'
import {
  Page, Layout, Card, TextField, Button, Banner, FormLayout, BlockStack,
} from '@shopify/polaris'
import shopify from '../shopify.server.js'
import { getShopSettings, updateShopSettings } from '../models/shop.server.js'

export async function loader({ request }) {
  const { session } = await shopify.authenticate.admin(request)
  const shop = await getShopSettings(session.shop)
  return json({ juniorTag: shop?.juniorTag ?? 'b2b-junior' })
}

export async function action({ request }) {
  const { session } = await shopify.authenticate.admin(request)
  const formData = await request.formData()
  const juniorTag = (formData.get('juniorTag') ?? '').trim()
  if (!juniorTag) return json({ error: 'Tag cannot be empty.' }, { status: 400 })
  await updateShopSettings(session.shop, juniorTag)
  return json({ success: true })
}

export default function Settings() {
  const { juniorTag } = useLoaderData()
  const actionData = useActionData()
  const [tag, setTag] = useState(juniorTag)

  return (
    <Page title="Settings">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {actionData?.success && (
              <Banner tone="success" title="Settings saved." onDismiss={() => {}} />
            )}
            {actionData?.error && (
              <Banner tone="critical" title={actionData.error} onDismiss={() => {}} />
            )}
            <Card>
              <Form method="post">
                <FormLayout>
                  <TextField
                    label="B2B customer tag"
                    name="juniorTag"
                    value={tag}
                    onChange={setTag}
                    helpText="Customers with this tag will see the cart approval form instead of the checkout button."
                    autoComplete="off"
                  />
                  <Button submit variant="primary">Save</Button>
                </FormLayout>
              </Form>
            </Card>
            <Banner tone="info">
              Set the same tag in your theme: Customize → Cart → B2B Cart Approval block → B2B customer tag.
            </Banner>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  )
}
