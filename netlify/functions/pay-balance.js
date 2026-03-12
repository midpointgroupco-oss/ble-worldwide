const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const { parentId, parentEmail, parentName, amount, successUrl, cancelUrl } = JSON.parse(event.body)

    if (!amount || amount <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid amount' }) }
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: parentEmail,
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(amount) * 100),
          product_data: {
            name: 'Account Balance Payment',
            description: `BLE Worldwide — Payment for ${parentName}`,
          },
        },
        quantity: 1,
      }],
      metadata: {
        parentId,
        parentEmail,
        type: 'ledger_payment',
      },
      success_url: `${successUrl}?ledger_paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
    })

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url, sessionId: session.id }),
    }
  } catch (err) {
    console.error('Stripe error:', err)
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
