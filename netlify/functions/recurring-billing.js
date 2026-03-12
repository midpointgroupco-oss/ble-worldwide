// Netlify Scheduled Function — runs daily at 8am UTC
// Schedule set in netlify.toml: "0 8 * * *"
const { createClient } = require('@supabase/supabase-js')
const sgMail = require('@sendgrid/mail')

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async () => {
  const today      = new Date()
  const todayStr   = today.toISOString().split('T')[0]

  // Find all recurring billing records that are paid & due for renewal
  const { data: recurringBills } = await supabase
    .from('billing')
    .select('*')
    .eq('is_recurring', true)
    .eq('status', 'paid')
    .not('recurrence_interval', 'is', null)

  let created = 0

  for (const bill of (recurringBills || [])) {
    const paidAt  = new Date(bill.paid_at || bill.due_date)
    let nextDue   = new Date(paidAt)

    // Calculate next due date based on interval
    if (bill.recurrence_interval === 'monthly')  nextDue.setMonth(nextDue.getMonth() + 1)
    if (bill.recurrence_interval === 'quarterly') nextDue.setMonth(nextDue.getMonth() + 3)
    if (bill.recurrence_interval === 'annually')  nextDue.setFullYear(nextDue.getFullYear() + 1)
    if (bill.recurrence_interval === 'weekly')    nextDue.setDate(nextDue.getDate() + 7)

    const nextDueStr = nextDue.toISOString().split('T')[0]

    // Only create if next due date is today or past and no pending bill exists
    if (nextDueStr > todayStr) continue

    const { data: existing } = await supabase
      .from('billing')
      .select('id')
      .eq('parent_id', bill.parent_id)
      .eq('description', bill.description)
      .eq('status', 'pending')
      .single()

    if (existing) continue // Already has pending bill

    // Create new billing record
    const { data: newBill } = await supabase.from('billing').insert([{
      parent_id:           bill.parent_id,
      student_id:          bill.student_id,
      description:         bill.description,
      amount:              bill.amount,
      status:              'pending',
      due_date:            nextDueStr,
      is_recurring:        true,
      recurrence_interval: bill.recurrence_interval,
    }]).select().single()

    created++

    // Send email notification to parent
    if (newBill && bill.parent_id) {
      const { data: parent } = await supabase.from('profiles').select('full_name').eq('id', bill.parent_id).single()
      const { data: authUser } = await supabase.auth.admin.getUserById(bill.parent_id)
      const parentEmail = authUser?.user?.email

      if (parentEmail) {
        try {
          await fetch(`${process.env.SITE_URL}/.netlify/functions/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: parentEmail,
              template: 'billing_due',
              data: {
                parentName:  parent?.full_name || 'Parent',
                description: newBill.description,
                amount:      newBill.amount,
                dueDate:     nextDueStr,
              }
            })
          })
        } catch (e) {
          console.error('Email send failed:', e)
        }
      }
    }
  }

  // Also mark overdue bills
  await supabase.from('billing')
    .update({ status: 'overdue' })
    .eq('status', 'pending')
    .lt('due_date', todayStr)

  console.log(`Recurring billing: created ${created} new bills, marked overdue.`)
  return { statusCode: 200, body: JSON.stringify({ created }) }
}
