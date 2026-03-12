import { useState } from 'react'
import { supabase } from '../lib/supabase'

const GRADES    = ['1st','2nd','3rd','4th','5th','6th','7th','8th','9th','10th','11th','12th']
const COUNTRIES = ['United States','United Kingdom','Canada','Nigeria','Ghana','Jamaica','Trinidad & Tobago','Barbados','Guyana','South Africa','Kenya','Zimbabwe','India','Pakistan','Philippines','Other']

const INIT = {
  // Student
  student_name:'', date_of_birth:'', grade_applying:'', previous_school:'', country:'',
  student_nationality:'', has_iep:'no', special_needs:'',
  // Guardian
  guardian_name:'', guardian_email:'', guardian_phone:'', guardian_address:'',
  guardian_relationship:'Parent',
  // Additional
  how_heard:'', start_date:'', notes:''
}

export default function EnrollmentForm() {
  const [step,    setStep]    = useState(1)
  const [saving,  setSaving]  = useState(false)
  const [success, setSuccess] = useState(false)
  const [errors,  setErrors]  = useState({})
  const [form,    setForm]    = useState(INIT)

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  function validate(fields) {
    const e = {}
    fields.forEach(([k, msg]) => { if (!form[k]?.trim()) e[k] = msg })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function goStep2() {
    if (validate([['student_name','Student name required'],['grade_applying','Grade required']])) setStep(2)
  }
  function goStep3() {
    if (validate([['guardian_name','Guardian name required'],['guardian_email','Email required']])) setStep(3)
  }

  async function submit() {
    setSaving(true)
    const payload = {
      ...form,
      // store country on the application for auto-create
      status:       'pending',
      submitted_at: new Date().toISOString()
    }
    const { error } = await supabase.from('enrollment_applications').insert([payload])
    if (error) { console.error(error); setSaving(false); return }

    // Notify admins via Supabase notification (best-effort — anon can't call notifyAdmins directly)
    try {
      await fetch('/.netlify/functions/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to:      'bleworldwide29@gmail.com',
          subject: `📥 New Application: ${form.student_name}`,
          html:    `<p>New enrollment application submitted for <strong>${form.student_name}</strong> (${form.grade_applying} Grade) from ${form.guardian_name} &lt;${form.guardian_email}&gt;.</p><p>Log in to the admin portal to review.</p>`
        })
      })
    } catch(e) { /* non-blocking */ }

    setSaving(false)
    setSuccess(true)
  }

  // ── success screen ──
  if (success) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#1a1a2e,#16213e)',padding:24}}>
      <div style={{background:'white',borderRadius:20,padding:48,maxWidth:480,width:'100%',textAlign:'center',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>
        <div style={{fontSize:64,marginBottom:16}}>🎓</div>
        <div style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:24,color:'#1a1a2e',marginBottom:10}}>Application Submitted!</div>
        <div style={{fontSize:14,color:'#666',lineHeight:1.7,marginBottom:24}}>
          Thank you for applying to BLE Worldwide. We will review your application and contact you at <strong>{form.guardian_email}</strong> within 3–5 business days.
        </div>
        <div style={{background:'#e6fff4',borderRadius:12,padding:'14px 18px',fontSize:13,color:'#00804a',fontWeight:700,marginBottom:12}}>✅ Application received — reference: {form.student_name}</div>
        <div style={{fontSize:12,color:'#999'}}>You can close this window. We&#39;ll be in touch soon.</div>
      </div>
    </div>
  )

  const Err = ({ k }) => errors[k] ? <div style={{color:'#cc3333',fontSize:11,marginTop:3,fontWeight:600}}>{errors[k]}</div> : null
  const steps = ['Student Info','Guardian Info','Final Details']

  return (
    <div style={{minHeight:'100vh',background:'linear-gradient(135deg,#1a1a2e,#16213e)',padding:'24px 16px'}}>
      <div style={{maxWidth:620,margin:'0 auto'}}>

        {/* Header */}
        <div style={{textAlign:'center',padding:'28px 0 20px',color:'white'}}>
          <div style={{fontSize:40,marginBottom:8}}>🎓</div>
          <div style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:26}}>BLE Worldwide</div>
          <div style={{opacity:.65,fontSize:13,marginTop:4}}>Student Enrollment Application</div>
        </div>

        {/* Stepper */}
        <div style={{display:'flex',justifyContent:'center',gap:0,marginBottom:20,position:'relative'}}>
          {steps.map((label, i) => {
            const n = i + 1
            const done = step > n; const active = step === n
            return (
              <div key={n} style={{display:'flex',flexDirection:'column',alignItems:'center',flex:1,position:'relative'}}>
                {i > 0 && <div style={{position:'absolute',top:15,left:'-50%',right:'50%',height:2,background:done?'#00c9b1':'rgba(255,255,255,.2)',zIndex:0}}/>}
                <div style={{width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:13,position:'relative',zIndex:1,
                  background:done?'#00c9b1':active?'white':'rgba(255,255,255,.15)',
                  color:done?'white':active?'#1a1a2e':'rgba(255,255,255,.5)',
                  boxShadow:active?'0 0 0 4px rgba(0,201,177,.3)':'none',transition:'all .25s'}}>
                  {done ? '✓' : n}
                </div>
                <div style={{fontSize:10,color:active?'white':done?'rgba(255,255,255,.7)':'rgba(255,255,255,.35)',marginTop:5,fontWeight:active?700:400,whiteSpace:'nowrap'}}>{label}</div>
              </div>
            )
          })}
        </div>

        <div style={{background:'white',borderRadius:20,padding:'28px 32px',boxShadow:'0 20px 60px rgba(0,0,0,.3)'}}>

          {/* ── STEP 1: Student Info ── */}
          {step === 1 && (
            <>
              <div style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:18,marginBottom:20,color:'#1a1a2e'}}>👤 Student Information</div>

              <div className="form-group">
                <label className="input-label">Student Full Name *</label>
                <input className="input" value={form.student_name} onChange={e=>set('student_name',e.target.value)} placeholder="First Last"/>
                <Err k="student_name"/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-group">
                  <label className="input-label">Date of Birth</label>
                  <input className="input" type="date" value={form.date_of_birth} onChange={e=>set('date_of_birth',e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="input-label">Grade Applying For *</label>
                  <select className="input" value={form.grade_applying} onChange={e=>set('grade_applying',e.target.value)}>
                    <option value="">— Select —</option>
                    {GRADES.map(g=><option key={g} value={g}>{g} Grade</option>)}
                  </select>
                  <Err k="grade_applying"/>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-group">
                  <label className="input-label">Country of Residence *</label>
                  <select className="input" value={form.country} onChange={e=>set('country',e.target.value)}>
                    <option value="">— Select —</option>
                    {COUNTRIES.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Nationality</label>
                  <input className="input" value={form.student_nationality} onChange={e=>set('student_nationality',e.target.value)} placeholder="e.g. American, British"/>
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">Previous School (if any)</label>
                <input className="input" value={form.previous_school} onChange={e=>set('previous_school',e.target.value)} placeholder="Name of previous school"/>
              </div>

              <div className="form-group">
                <label className="input-label">Does this student have an IEP or special learning needs?</label>
                <select className="input" value={form.has_iep} onChange={e=>set('has_iep',e.target.value)}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </div>

              {form.has_iep === 'yes' && (
                <div className="form-group">
                  <label className="input-label">Please describe the learning needs</label>
                  <textarea className="input" rows={3} value={form.special_needs} onChange={e=>set('special_needs',e.target.value)} placeholder="Describe any accommodations needed…" style={{resize:'vertical'}}/>
                </div>
              )}

              <button className="btn btn-primary" style={{width:'100%',marginTop:8}} onClick={goStep2}>Continue →</button>
            </>
          )}

          {/* ── STEP 2: Guardian Info ── */}
          {step === 2 && (
            <>
              <div style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:18,marginBottom:20,color:'#1a1a2e'}}>👪 Guardian Information</div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-group">
                  <label className="input-label">Guardian Full Name *</label>
                  <input className="input" value={form.guardian_name} onChange={e=>set('guardian_name',e.target.value)} placeholder="Parent/Guardian name"/>
                  <Err k="guardian_name"/>
                </div>
                <div className="form-group">
                  <label className="input-label">Relationship to Student</label>
                  <select className="input" value={form.guardian_relationship} onChange={e=>set('guardian_relationship',e.target.value)}>
                    {['Parent','Legal Guardian','Grandparent','Other'].map(r=><option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-group">
                  <label className="input-label">Email Address *</label>
                  <input className="input" type="email" value={form.guardian_email} onChange={e=>set('guardian_email',e.target.value)} placeholder="email@example.com"/>
                  <Err k="guardian_email"/>
                </div>
                <div className="form-group">
                  <label className="input-label">Phone Number</label>
                  <input className="input" type="tel" value={form.guardian_phone} onChange={e=>set('guardian_phone',e.target.value)} placeholder="+1 (555) 000-0000"/>
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">Home Address</label>
                <input className="input" value={form.guardian_address} onChange={e=>set('guardian_address',e.target.value)} placeholder="Street, City, State/Province, ZIP"/>
              </div>

              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button className="btn btn-outline" style={{flex:1}} onClick={()=>setStep(1)}>← Back</button>
                <button className="btn btn-primary" style={{flex:2}} onClick={goStep3}>Continue →</button>
              </div>
            </>
          )}

          {/* ── STEP 3: Final Details ── */}
          {step === 3 && (
            <>
              <div style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:18,marginBottom:20,color:'#1a1a2e'}}>📝 Final Details</div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div className="form-group">
                  <label className="input-label">Desired Start Date</label>
                  <input className="input" type="date" value={form.start_date} onChange={e=>set('start_date',e.target.value)} min={new Date().toISOString().split('T')[0]}/>
                </div>
                <div className="form-group">
                  <label className="input-label">How did you hear about us?</label>
                  <select className="input" value={form.how_heard} onChange={e=>set('how_heard',e.target.value)}>
                    <option value="">— Select —</option>
                    {['Social Media','Friend/Family Referral','Google Search','Church/Community Group','Other'].map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="input-label">Additional Notes or Questions</label>
                <textarea className="input" rows={3} value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Special requests, questions, anything else we should know…" style={{resize:'vertical'}}/>
              </div>

              {/* Review summary */}
              <div style={{background:'#f7f9ff',borderRadius:12,padding:'16px 18px',marginBottom:16,fontSize:12,border:'1px solid #e4eaf8'}}>
                <div style={{fontWeight:800,marginBottom:10,fontSize:13,color:'#1a1a2e'}}>📋 Review Your Application</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px 16px'}}>
                  {[['Student',form.student_name],['Grade',form.grade_applying],['Country',form.country||'—'],['DOB',form.date_of_birth||'—'],['Guardian',form.guardian_name],['Email',form.guardian_email],['Phone',form.guardian_phone||'—'],['Start Date',form.start_date||'Flexible']].map(([k,v])=>(
                    <div key={k} style={{display:'flex',gap:4}}>
                      <span style={{color:'#888',minWidth:70}}>{k}:</span>
                      <strong style={{color:'#1a1a2e'}}>{v}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{display:'flex',gap:10}}>
                <button className="btn btn-outline" style={{flex:1}} onClick={()=>setStep(2)}>← Back</button>
                <button className="btn btn-primary" style={{flex:2}} onClick={submit} disabled={saving}>
                  {saving ? '⏳ Submitting…' : '🎓 Submit Application'}
                </button>
              </div>
            </>
          )}

        </div>

        <div style={{textAlign:'center',color:'rgba(255,255,255,.4)',fontSize:11,marginTop:16}}>
          BLE Worldwide · Your information is kept secure and confidential
        </div>
      </div>
    </div>
  )
}
