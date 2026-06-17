import { describe, it, expect, vi } from 'vitest'

vi.mock('resend', () => {
  const mockSend = vi.fn().mockResolvedValue({ id: 'mock-id' })
  return {
    Resend: vi.fn(function() {
      this.emails = { send: mockSend }
    }),
  }
})

import { sendApprovalEmail } from '../services/email.server.js'

describe('sendApprovalEmail', () => {
  it('sends via Resend when API key is set', async () => {
    process.env.RESEND_API_KEY = 're_test_key'
    const { Resend } = await import('resend')
    await sendApprovalEmail({
      to: 'manager@acme.com',
      requesterName: 'Junior Buyer',
      totalPrice: '500.00',
      currency: 'EUR',
      approvalUrl: 'https://store.myshopify.com/apps/b2b-approval/approve?token=abc123',
    })
    const instance = Resend.mock.results[0].value
    expect(instance.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'manager@acme.com' })
    )
    delete process.env.RESEND_API_KEY
  })

  it('logs to console when API key is absent', async () => {
    delete process.env.RESEND_API_KEY
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await sendApprovalEmail({
      to: 'mgr@x.com',
      requesterName: 'Someone',
      totalPrice: '0.00',
      currency: 'EUR',
      approvalUrl: 'https://x.com/approve?token=xyz',
    })
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
