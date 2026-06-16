(function () {
  const block = document.getElementById('b2b-approval-block')
  if (!block) return

  const shopDomain = block.dataset.shop
  const proxyBase = block.dataset.appProxyUrl

  // Hide native checkout button(s) and show our form
  function interceptCheckout() {
    const selectors = [
      '[name="checkout"]',
      '[href="/checkout"]',
      '.cart__checkout-button',
      '#checkout',
    ]
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        el.style.display = 'none'
      })
    })
    document.getElementById('b2b-approval-form').style.display = 'block'
  }

  interceptCheckout()

  async function getCartItems() {
    const res = await fetch('/cart.js')
    const cart = await res.json()
    return {
      cartItems: cart.items.map(item => ({
        variantId: `gid://shopify/ProductVariant/${item.variant_id}`,
        productTitle: item.product_title,
        variantTitle: item.variant_title,
        quantity: item.quantity,
        price: (item.price / 100).toFixed(2),
        currencyCode: cart.currency,
      })),
      totalPrice: (cart.total_price / 100).toFixed(2),
      currency: cart.currency,
    }
  }

  async function getCurrentCustomer() {
    try {
      const res = await fetch('/account.json')
      if (!res.ok) return {}
      const data = await res.json()
      return {
        requesterEmail: data.customer?.email ?? '',
        requesterName: `${data.customer?.first_name ?? ''} ${data.customer?.last_name ?? ''}`.trim(),
      }
    } catch {
      return {}
    }
  }

  document.getElementById('b2b-submit-btn').addEventListener('click', async () => {
    const managerEmail = document.getElementById('b2b-manager-email').value.trim()
    const note = document.getElementById('b2b-note').value.trim()
    const feedback = document.getElementById('b2b-feedback')
    const btn = document.getElementById('b2b-submit-btn')

    if (!managerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail)) {
      feedback.style.color = '#d82c0d'
      feedback.textContent = 'Inserisci un indirizzo email valido per il manager.'
      return
    }

    btn.disabled = true
    btn.textContent = 'Invio in corso...'
    feedback.textContent = ''

    try {
      const { cartItems, totalPrice, currency } = await getCartItems()
      const { requesterEmail, requesterName } = await getCurrentCustomer()

      const res = await fetch(`${proxyBase}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopDomain,
          managerEmail,
          requesterEmail,
          requesterName,
          requesterNote: note,
          cartItems,
          totalPrice,
          currency,
        }),
      })

      const json = await res.json()

      if (json.ok) {
        feedback.style.color = '#008060'
        feedback.textContent = 'Richiesta inviata! Il manager riceverà un link di approvazione via email.'
        btn.textContent = 'Inviato ✓'
      } else {
        throw new Error(json.error ?? 'Errore sconosciuto')
      }
    } catch (err) {
      feedback.style.color = '#d82c0d'
      feedback.textContent = `Errore: ${err.message}`
      btn.disabled = false
      btn.textContent = 'Invia per Approvazione'
    }
  })
})()
