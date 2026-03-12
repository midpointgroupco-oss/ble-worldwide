const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature']
  let stripeEvent

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return { statusCode: 400, body: `Webhook Error: ${err.message}` }
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object
    const billId    = session.metadata?.billId
    const parentId  = session.metadata?.parentId
    const type      = session.metadata?.type
    const amountPaid = session.amount_total / 100

    // Mark invoice paid (existing billing flow)
    if (billId) {
      await supabase.from('billing')
        .update({ status: 'paid', paid_at: new Date().toISOString(), stripe_session_id: session.id })
        .eq('id', billId)
    }

    // Post credit to parent ledger (new ledger flow)
    if (type === 'ledger_payment' && parentId) {
      // Get current balance
      const { data: existing } = await supabase
        .from('parent_ledger')
        .select('type,amount')
        .eq('parent_id', parentId)
      const currentBal = (existing||[]).reduce((acc, e) =>
        acc + (e.type === 'debit' ? Number(e.amount) : -Number(e.amount)), 0)
      const balanceAfter = currentBal - amountPaid

      await supabase.from('parent_ledger').insert({
        parent_id:      parentId,
        type:           'credit',
        amount:         amountPaid,
        description:    'Online payment via Stripe',
        category:       'payment',
        stripe_session_id: session.id,
        balance_after:  balanceAfter,
      })
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) }
}
