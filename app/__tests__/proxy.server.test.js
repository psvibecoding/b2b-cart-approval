import { describe, it, expect } from 'vitest'
import crypto from 'node:crypto'
import { validateProxySignature } from '../utils/proxy.server.js'

const SECRET = 'test-secret-key'

function buildSignedUrl(params, secret = SECRET) {
  const { signature: _, ...rest } = params
  const message = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join('&')
  const sig = crypto.createHmac('sha256', secret).update(message).digest('hex')
  const allParams = new URLSearchParams({ ...rest, signature: sig })
  return `https://example.myshopify.com/apps/b2b-approval/submit?${allParams}`
}

describe('validateProxySignature', () => {
  it('returns true for a valid Shopify-signed proxy request', () => {
    const url = buildSignedUrl({ shop: 'test.myshopify.com', path_prefix: '/apps/b2b-approval' })
    const request = new Request(url)
    expect(validateProxySignature(request, SECRET)).toBe(true)
  })

  it('returns false for a tampered request', () => {
    const url = buildSignedUrl({ shop: 'test.myshopify.com', path_prefix: '/apps/b2b-approval' })
    const tampered = url.replace('test.myshopify.com', 'evil.myshopify.com')
    const request = new Request(tampered)
    expect(validateProxySignature(request, SECRET)).toBe(false)
  })

  it('returns false when signature is missing', () => {
    const request = new Request('https://example.com/apps/b2b-approval/submit?shop=x.myshopify.com')
    expect(validateProxySignature(request, SECRET)).toBe(false)
  })
})
