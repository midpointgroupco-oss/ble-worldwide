import { useNavigate } from 'react-router-dom'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{fontFamily:'DM Sans, sans-serif',background:'#f8f9fc',minHeight:'100vh'}}>

      {/* Nav */}
      <nav style={{position:'sticky',top:0,zIndex:100,background:'rgba(255,255,255,.95)',backdropFilter:'blur(12px)',borderBottom:'1px solid #e8ecf5',padding:'0 40px',height:64,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:20,color:'#1a1a2e'}}>
          🌍 BLE Worldwide
        </div>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <button onClick={()=>navigate('/apply')} style={{padding:'7px 18px',borderRadius:8,border:'1px solid #e0e6f5',background:'white',cursor:'pointer',fontSize:13,fontWeight:600,color:'#444'}}>Apply Now</button>
          <button onClick={()=>navigate('/login')} style={{padding:'7px 20px',borderRadius:8,border:'none',background:'linear-gradient(135deg,#00c9b1,#3b9eff)',color:'white',cursor:'pointer',fontSize:13,fontWeight:700,boxShadow:'0 2px 12px rgba(0,201,177,.3)'}}>Sign In</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{background:'linear-gradient(135deg,#0a1628 0%,#1a3060 50%,#0f2a50 100%)',color:'white',padding:'80px 40px',textAlign:'center',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse at 60% 40%,rgba(0,201,177,.15) 0%,transparent 60%)',pointerEvents:'none'}}/>
        <div style={{position:'relative',maxWidth:720,margin:'0 auto'}}>
          <div style={{display:'inline-block',padding:'5px 16px',borderRadius:20,background:'rgba(0,201,177,.2)',border:'1px solid rgba(0,201,177,.4)',fontSize:12,fontWeight:700,color:'#00c9b1',marginBottom:20,letterSpacing:1}}>
            GLOBAL ONLINE EDUCATION
          </div>
          <h1 style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:'clamp(32px,5vw,54px)',lineHeight:1.2,margin:'0 0 20px'}}>
            World-Class Education,<br/><span style={{color:'#00c9b1'}}>Anywhere in the World</span>
          </h1>
          <p style={{fontSize:17,lineHeight:1.7,color:'rgba(255,255,255,.75)',marginBottom:36,maxWidth:560,margin:'0 auto 36px'}}>
            BLE Worldwide offers accredited K-12 online education for students across the globe. Join thousands of learners building their future from home.
          </p>
          <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
            <button onClick={()=>navigate('/apply')} style={{padding:'14px 32px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#00c9b1,#06d6a0)',color:'white',cursor:'pointer',fontSize:16,fontWeight:800,boxShadow:'0 4px 20px rgba(0,201,177,.4)'}}>
              Apply for Admission →
            </button>
            <button onClick={()=>navigate('/login')} style={{padding:'14px 28px',borderRadius:12,border:'2px solid rgba(255,255,255,.3)',background:'transparent',color:'white',cursor:'pointer',fontSize:15,fontWeight:700}}>
              Student / Parent Login
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{background:'white',borderBottom:'1px solid #e8ecf5',padding:'28px 40px'}}>
        <div style={{maxWidth:900,margin:'0 auto',display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:24}}>
          {[['🌍','Global Reach','Students in 40+ countries'],['📚','Grades 4–12','Complete K-12 curriculum'],['👩‍🏫','Expert Teachers','Certified educators worldwide'],['🏆','Accredited','Internationally recognized']].map(([ic,title,sub])=>(
            <div key={title} style={{textAlign:'center'}}>
              <div style={{fontSize:28,marginBottom:6}}>{ic}</div>
              <div style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:16,color:'#1a1a2e'}}>{title}</div>
              <div style={{fontSize:12,color:'#888',marginTop:2}}>{sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{maxWidth:1000,margin:'60px auto',padding:'0 40px'}}>
        <div style={{textAlign:'center',marginBottom:40}}>
          <h2 style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:30,color:'#1a1a2e',marginBottom:8}}>Everything Your Child Needs to Succeed</h2>
          <p style={{color:'#666',fontSize:15}}>A complete learning management system built for global families</p>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:20}}>
          {[
            ['📊','Real-Time Progress Tracking','Parents get live updates on grades, attendance, and assignments. No more guessing how your child is performing.'],
            ['💬','Direct Communication','Message teachers and staff directly through our secure portal. Always stay in the loop.'],
            ['📋','Digital Report Cards','Receive official report cards each term, complete with GPA, attendance, and teacher comments.'],
            ['📅','Flexible Scheduling','Students learn on their schedule with our asynchronous course model, perfect for families across time zones.'],
            ['💳','Simple Billing','Manage tuition and fees online with secure card payments, bank transfer, or Zelle. Full payment history always available.'],
            ['🌐','Multi-Language Support','We serve students from across the globe. Our staff speaks your language and understands your culture.'],
          ].map(([ic,title,desc])=>(
            <div key={title} style={{background:'white',borderRadius:16,padding:24,boxShadow:'0 2px 16px rgba(18,16,58,.06)',border:'1px solid #e8ecf5',transition:'transform .2s,box-shadow .2s'}}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 8px 32px rgba(18,16,58,.12)'}}
              onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 2px 16px rgba(18,16,58,.06)'}}>
              <div style={{fontSize:32,marginBottom:12}}>{ic}</div>
              <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:15,color:'#1a1a2e',marginBottom:8}}>{title}</div>
              <div style={{fontSize:13,color:'#666',lineHeight:1.6}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Portals */}
      <div style={{background:'linear-gradient(135deg,#f0fdf9,#e6f4ff)',padding:'60px 40px'}}>
        <div style={{maxWidth:900,margin:'0 auto',textAlign:'center'}}>
          <h2 style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:28,color:'#1a1a2e',marginBottom:8}}>A Portal for Everyone</h2>
          <p style={{color:'#666',fontSize:14,marginBottom:36}}>Purpose-built dashboards for every role in your student&#39;s education</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16}}>
            {[
              ['👨‍👩‍👧','Parent Portal','Track grades, attendance, messages, and pay tuition — all in one place.','#3b9eff'],
              ['🧑‍🎓','Student Portal','View assignments, submit homework, check grades, and message teachers.','#00c9b1'],
              ['👩‍🏫','Teacher Portal','Manage classes, take attendance, grade assignments, and communicate with parents.','#7b5ea7'],
              ['🛡','Admin Portal','Full school management: enrollment, billing, reports, staff, and more.','#ff6058'],
            ].map(([ic,title,desc,color])=>(
              <div key={title} style={{background:'white',borderRadius:16,padding:24,border:`2px solid ${color}20`,textAlign:'center'}}>
                <div style={{width:56,height:56,borderRadius:'50%',background:`${color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,margin:'0 auto 12px'}}>{ic}</div>
                <div style={{fontFamily:'Nunito,sans-serif',fontWeight:800,fontSize:14,color:'#1a1a2e',marginBottom:6}}>{title}</div>
                <div style={{fontSize:12,color:'#888',lineHeight:1.6}}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{background:'linear-gradient(135deg,#1a1a2e,#2d1b4e)',color:'white',padding:'60px 40px',textAlign:'center'}}>
        <h2 style={{fontFamily:'Nunito,sans-serif',fontWeight:900,fontSize:30,marginBottom:12}}>Ready to Enroll?</h2>
        <p style={{color:'rgba(255,255,255,.7)',fontSize:15,marginBottom:28,maxWidth:480,margin:'0 auto 28px'}}>Start your application today. Our admissions team reviews applications within 3-5 business days.</p>
        <button onClick={()=>navigate('/apply')} style={{padding:'14px 40px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#00c9b1,#06d6a0)',color:'white',cursor:'pointer',fontSize:16,fontWeight:800,boxShadow:'0 4px 24px rgba(0,201,177,.4)'}}>
          Begin Application →
        </button>
      </div>

      {/* Footer */}
      <footer style={{background:'#0a0a1a',color:'rgba(255,255,255,.5)',padding:'24px 40px',textAlign:'center',fontSize:12}}>
        <div style={{marginBottom:8,fontFamily:'Nunito,sans-serif',fontWeight:700,color:'rgba(255,255,255,.7)'}}>🌍 BLE Worldwide</div>
        <div>© {new Date().getFullYear()} BLE Worldwide. All rights reserved. · <span style={{cursor:'pointer',color:'#00c9b1'}} onClick={()=>navigate('/login')}>Staff Login</span></div>
      </footer>
    </div>
  )
}
