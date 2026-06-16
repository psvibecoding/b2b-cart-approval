import { describe, it, expect, vi } from 'vitest'
import { sendApprovalEmail } from '../services/email.server.js'

describe('sendApprovalEmail', () => {
  it('logs approval email details without throwing', async () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    await sendApprovalEmail({
      to: 'manager@acme.com',
      requesterName: 'Junior Buyer',
      totalPrice: '500.00',
      currency: 'EUR',
      approvalUrl: 'https://store.myshopify.com/apps/b2b-approval/approve?token=abc123',
    })
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('resolves (does not throw) even with minimal data', async () => {
    await expect(
      sendApprovalEmail({
        to: 'mgr@x.com',
        requesterName: 'Someone',
        totalPrice: '0.00',
        currency: 'EUR',
        approvalUrl: 'https://x.com/approve?token=xyz',
      })
    ).resolves.not.toThrow()
  })
})
