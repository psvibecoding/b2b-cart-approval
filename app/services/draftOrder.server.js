const DRAFT_ORDER_CREATE = `#graphql
  mutation draftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        invoiceUrl
      }
      userErrors {
        field
        message
      }
    }
  }
`

export async function createDraftOrder(admin, cartItems, requesterEmail) {
  const response = await admin.graphql(DRAFT_ORDER_CREATE, {
    variables: {
      input: {
        lineItems: cartItems.map(item => ({
          variantId: item.variantId,
          quantity: item.quantity,
        })),
        email: requesterEmail,
        tags: ['b2b-approval'],
        note: 'Created via B2B Cart Approval workflow',
      },
    },
  })

  const { data } = await response.json()
  const { draftOrder, userErrors } = data.draftOrderCreate

  if (userErrors.length > 0) {
    throw new Error(userErrors.map(e => e.message).join('; '))
  }

  return {
    draftOrderId: draftOrder.id,
    invoiceUrl: draftOrder.invoiceUrl,
  }
}
