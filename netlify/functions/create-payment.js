const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  try {
    const { billId, amount, description, parentEmail, parentName, successUrl, cancelUrl } = JSON.parse(event.body)

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: parentEmail,
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(amount) * 100), // cents
          product_data: {
            name: description || 'School Fee',
            description: `BLE Worldwide · Invoice ${billId?.slice(0,8).toUpperCase()}`,
          },
        },
        quantity: 1,
      }],
      metadata: { billId, parentEmail },
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&bill_id=${billId}`,
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
