import crypto from 'node:crypto'

export function validateProxySignature(request, secret = process.env.SHOPIFY_API_SECRET) {
  const { searchParams } = new URL(request.url)
  const params = Object.fromEntries(searchParams.entries())
  const signature = params.signature

  if (!signature) return false

  const { signature: _omit, ...rest } = params
  const message = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join('&')

  const computed = crypto.createHmac('sha256', secret).update(message).digest('hex')

  try {
    return crypto.timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(signature, 'hex'))
  } catch {
    return false
  }
}
