import { describe, it, expect, vi } from 'vitest'
import { createDraftOrder } from '../services/draftOrder.server.js'

const cartItems = [
  { variantId: 'gid://shopify/ProductVariant/1', quantity: 2, price: '15.00', productTitle: 'Widget' },
]

describe('createDraftOrder', () => {
  it('calls admin.graphql with correct variables and returns draftOrderId + invoiceUrl', async () => {
    const mockAdmin = {
      graphql: vi.fn().mockResolvedValue({
        json: () => Promise.resolve({
          data: {
            draftOrderCreate: {
              draftOrder: {
                id: 'gid://shopify/DraftOrder/42',
                invoiceUrl: 'https://store.myshopify.com/invoices/abc',
              },
              userErrors: [],
            },
          },
        }),
      }),
    }

    const result = await createDraftOrder(mockAdmin, cartItems, 'buyer@acme.com')

    expect(mockAdmin.graphql).toHaveBeenCalledOnce()
    const [mutation, options] = mockAdmin.graphql.mock.calls[0]
    expect(mutation).toContain('draftOrderCreate')
    expect(options.variables.input.lineItems).toEqual([
      { variantId: 'gid://shopify/ProductVariant/1', quantity: 2 },
    ])
    expect(result.draftOrderId).toBe('gid://shopify/DraftOrder/42')
    expect(result.invoiceUrl).toBe('https://store.myshopify.com/invoices/abc')
  })

  it('throws when Shopify returns userErrors', async () => {
    const mockAdmin = {
      graphql: vi.fn().mockResolvedValue({
        json: () => Promise.resolve({
          data: {
            draftOrderCreate: {
              draftOrder: null,
              userErrors: [{ field: 'variantId', message: 'Variant not found' }],
            },
          },
        }),
      }),
    }

    await expect(createDraftOrder(mockAdmin, cartItems, 'buyer@acme.com')).rejects.toThrow(
      'Variant not found'
    )
  })
})
