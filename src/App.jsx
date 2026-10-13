import {useEffect, useState} from 'react'
import {supabase, ready} from './supabase'
import {Learn, Chat, Teachers, Videos, Review} from './Learn.jsx'

const ERR = {
  'Invalid login credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
  'User already registered': 'هذا البريد مسجّل مسبقًا. جرّب تسجيل الدخول.',
  'Email not confirmed': 'فعّل حسابك أولًا من الرسالة التي وصلت إلى بريدك.'
}
const msg = e => { const m = e?.message || ''
  return ERR[m] || (/password/i.test(m) ? 'كلمة المرور ضعيفة. استخدم 6 أحرف على الأقل.'
    : /rate|too many/i.test(m) ? 'محاولات كثيرة. انتظر قليلًا ثم أعد المحاولة.'
    : /fetch|network/i.test(m) ? 'تعذّر الاتصال. تحقق من الإنترنت.' : 'حدث خطأ. حاول مرة أخرى.') }

// قائمة أولية للتصميم فقط، وليست مصدرًا رسميًا. تُراجع مع المصادر الرسمية في المرحلة 2.
const GR = [['متوسط',['الأول المتوسط','الثاني المتوسط','الثالث المتوسط']],['إعدادي',['الرابع الإعدادي','الخامس الإعدادي','السادس الإعدادي']]]
// الأقسام من مدونات وليست من موقع المديرية (الموقع منع وصولي)، فتُراجَع قبل الاعتماد
const VOC = {'الصناعي':['الأجهزة الطبية','الكهرباء','الإلكترونيك والسيطرة','تكرير النفط ومعالجة الغاز','الميكانيك','السيارات','صيانة منظومات الليزر','الصناعات البتروكيمياوية','ميكاترونكس السيارات','اللحام وتشكيل المعادن','تكنولوجيا الإعلام','الطباعة','البناء والإنشاءات','الصناعات الغذائية','تكييف الهواء والتثليج','الخزف والزجاج','معالجة المياه','النسيج','الرسم الهندسي','صيانة المصاعد الكهربائية','المكننة الزراعية','تكنولوجيا السباكة','الاتصالات','الطاقة المتجددة'],
  'التجاري':['الإدارة','المحاسبة','المالية والمصرفية','الإدارة السياحية'],'الزراعي':['القسم الزراعي العام'],
  'الحاسوب وتقنيات المعلومات':['الذكاء الاصطناعي','الأمن السيبراني','تجميع وصيانة الحاسوب','شبكات الحاسوب','أجهزة الهاتف والحاسوب المحمولة','الإدارة الإلكترونية'],
  'الفنون التطبيقية':['فن التربية الأسرية','فن الديكور'],'التمريض':['التمريض العام','القبالة والتوليد']}
const BR = {science:'علمي', arts:'أدبي', bio:'أحيائي', applied:'تطبيقي'}
const RS = {questions:'حل الأسئلة', reading:'القراءة', video:'الفيديو', summaries:'الملخصات'}

const Load = () => <div className="ctr"><div className="sp"/><p>جارٍ التحميل...</p></div>
const Shell = ({children}) => <main className="wrap"><div className="logo">🧭 دَرْبي</div>{children}</main>
const Ch = ({on, children, ...p}) => <button type="button" className={'chip' + (on ? ' on' : '')} aria-pressed={!!on} {...p}>{children}</button>
const Note = ({n}) => n ? <div className={'n ' + n.t} role="alert">{n.m}</div> : null

function Terms({back}) {
  return <Shell><div className="card"><h2>الشروط والخصوصية</h2>
    <p className="mu">مسودة أولية تحتاج مراجعة قانونية قبل الإطلاق العام.</p>
    <p style={{marginTop:10}}>نحفظ بريدك واسمك وإعداداتك التعليمية (الصف أو التخصص، موعد الامتحان، ساعات الدراسة، الأهداف) لتخصيص تجربتك فقط. لا يرى طالب آخر بياناتك. يمكنك تعديل بياناتك أو حذف حسابك نهائيًا في أي وقت من صفحتك الرئيسية.</p>
    <button className="btn" onClick={back}>رجوع</button></div></Shell>
}

function Auth() {
  const [m, setM] = useState('in'), [f, setF] = useState({name:'', email:'', pw:'', ok:false})
  const [n, setN] = useState(null), [b, setB] = useState(false), [tm, setTm] = useState(false)
  const set = k => e => setF({...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value})
  async function submit(e) {
    e.preventDefault(); setN(null)
    if (m === 'up' && !f.ok) return setN({t:'err', m:'يجب الموافقة على الشروط والخصوصية.'})
    setB(true)
    try {
      let r
      if (m === 'in') r = await supabase.auth.signInWithPassword({email:f.email, password:f.pw})
      else if (m === 'up') {
        r = await supabase.auth.signUp({email:f.email, password:f.pw, options:{data:{full_name:f.name}, emailRedirectTo:location.origin}})
        if (!r.error && !r.data.session) return setN({t:'ok', m:'أرسلنا رسالة تفعيل إلى بريدك. افتحها ثم سجّل الدخول.'})
      } else {
        r = await supabase.auth.resetPasswordForEmail(f.email, {redirectTo:location.origin})
        if (!r.error) return setN({t:'ok', m:'إن كان البريد مسجّلًا سيصلك رابط استعادة كلمة المرور.'})
      }
      if (r.error) setN({t:'err', m:msg(r.error)})
    } catch (x) { setN({t:'err', m:msg(x)}) } finally { setB(false) }
  }
  async function google() {
    setN(null)
    const {error} = await supabase.auth.signInWithOAuth({provider:'google', options:{redirectTo:location.origin}})
    if (error) setN({t:'err', m:'تعذّر الدخول بجوجل. قد لا يكون مزوّد Google مفعّلًا بعد في Supabase.'})
  }
  if (tm) return <Terms back={() => setTm(false)}/>
  return <Shell><h1>{m === 'in' ? 'تسجيل الدخول' : m === 'up' ? 'إنشاء حساب' : 'استعادة كلمة المرور'}</h1>
    <p className="mu">طريقك للنجاح، خطوة بخطوة.</p>
    <form className="card" style={{marginTop:14}} onSubmit={submit}>
      {m === 'up' && <><label htmlFor="nm">الاسم</label><input id="nm" className="in" required maxLength={80} value={f.name} onChange={set('name')}/></>}
      <label htmlFor="em">البريد الإلكتروني</label><input id="em" className="in" dir="ltr" type="email" required value={f.email} onChange={set('email')}/>
      {m !== 'forgot' && <><label htmlFor="pw">كلمة المرور</label><input id="pw" className="in" dir="ltr" type="password" required minLength={6} value={f.pw} onChange={set('pw')}/></>}
      {m === 'up' && <label style={{fontWeight:400}}><input type="checkbox" checked={f.ok} onChange={set('ok')}/> أوافق على <button type="button" className="lnk" onClick={() => setTm(true)}>الشروط والخصوصية</button></label>}
      <Note n={n}/>
      <button className="btn" disabled={b}>{b ? 'لحظة...' : m === 'in' ? 'دخول' : m === 'up' ? 'إنشاء الحساب' : 'أرسل الرابط'}</button>
      {m !== 'forgot' && <><p className="sep">أو</p><button type="button" className="btn o" onClick={google}>الدخول بحساب Google</button></>}
    </form>
    <div className="row">
      {m !== 'in' && <button className="lnk" onClick={() => {setM('in'); setN(null)}}>لدي حساب</button>}
      {m !== 'up' && <button className="lnk" onClick={() => {setM('up'); setN(null)}}>إنشاء حساب جديد</button>}
      {m === 'in' && <button className="lnk" onClick={() => {setM('forgot'); setN(null)}}>نسيت كلمة المرور؟</button>}
    </div></Shell>
}

function Recover({done}) {
  const [pw, setPw] = useState(''), [n, setN] = useState(null)
  async function go(e) {
    e.preventDefault()
    const {error} = await supabase.auth.updateUser({password:pw})
    error ? setN({t:'err', m:msg(error)}) : done()
  }
  return <Shell><form className="card" onSubmit={go}><h2>كلمة مرور جديدة</h2>
    <input className="in" dir="ltr" type="password" minLength={6} required value={pw} onChange={e => setPw(e.target.value)} aria-label="كلمة المرور الجديدة"/>
    <Note n={n}/><button className="btn">حفظ</button></form></Shell>
}

function Onboard({uid, init, onDone, onCancel}) {
  const [st, setSt] = useState(0), [err, setErr] = useState(null), [b, setB] = useState(false)
  const [d, setD] = useState({type:init?.study_type || '', grade:init?.grade || '', branch:init?.branch || '', vb:init?.vocational_branch || '', vd:init?.vocational_dept || '',
    vy:init?.vocational_year || '', exam:init?.exam_date || '', hours:init?.daily_hours ?? '', hard:init?.hard_subjects || '', goal:init?.goal || '', rs:init?.review_style || ''})
  const up = o => {setD({...d, ...o}); setErr(null)}
  const acad = d.type === 'academic', prep = d.grade.includes('الإعدادي'), brs = d.grade === 'السادس الإعدادي' ? ['bio','applied','arts'] : ['science','arts']
  const valid = [() => d.type, () => acad ? d.grade : d.vb && d.vd, () => acad ? (!prep || d.branch) : d.vy,
    () => { const h = +d.hours; return d.hours === '' || (h >= 0.5 && h <= 12) }][st]()
  async function save() {
    setB(true)
    const row = {user_id:uid, study_type:d.type, grade:acad ? d.grade : null, branch:acad && prep ? d.branch : null,
      vocational_branch:acad ? null : d.vb, vocational_dept:acad ? null : d.vd, vocational_year:acad ? null : +d.vy, exam_date:d.exam || null,
      daily_hours:d.hours === '' ? null : +d.hours, hard_subjects:d.hard.trim() || null, goal:d.goal.trim() || null,
      review_style:d.rs || null, updated_at:new Date().toISOString()}
    const {data, error} = await supabase.from('student_profiles').upsert(row).select().single()
    setB(false); error ? setErr({t:'err', m:msg(error)}) : onDone(data)
  }
  return <Shell><div className="dots" aria-hidden="true">{[0,1,2,3].map(i => <i key={i} className={i <= st ? 'on' : ''}/>)}</div>
    <div className="card">
    {st === 0 && <><h2>ماذا تدرس؟</h2><div className="row">
      <Ch on={acad} onClick={() => up({type:'academic'})}>التعليم العام</Ch><Ch on={d.type === 'vocational'} onClick={() => up({type:'vocational'})}>التعليم المهني</Ch></div></>}
    {st === 1 && acad && <><h2>اختر صفك</h2>{GR.map(([s, gs]) => <div key={s}><p className="mu" style={{marginTop:10}}>{s}</p><div className="row">
      {gs.map(g => <Ch key={g} on={d.grade === g} onClick={() => up({grade:g, branch:''})}>{g}</Ch>)}</div></div>)}</>}
    {st === 1 && !acad && <><h2>اختر الفرع المهني</h2><p className="mu">القوائم من مدونات وليست من موقع المديرية، فقد لا تطابق الرسمي.</p>
      <div className="row">{Object.keys(VOC).map(v => <Ch key={v} on={d.vb === v} onClick={() => up({vb:v, vd:''})}>{v}</Ch>)}</div>{d.vb && <><h2 style={{marginTop:14}}>القسم</h2><div className="row">{VOC[d.vb].map(x => <Ch key={x} on={d.vd === x} onClick={() => up({vd:x})}>{x}</Ch>)}</div></>}</>}
    {st === 2 && acad && (prep ? <><h2>اختر الفرع</h2><div className="row">{brs.map(k => [k, BR[k]]).map(([k, v]) => <Ch key={k} on={d.branch === k} onClick={() => up({branch:k})}>{v}</Ch>)}</div></>
      : <><h2>لا يوجد فرع لهذا الصف</h2><p className="mu">تابع إلى الخطوة التالية.</p></>)}
    {st === 2 && !acad && <><h2>اختر المرحلة المهنية</h2><div className="row">{[1,2,3].map(y => <Ch key={y} on={+d.vy === y} onClick={() => up({vy:y})}>{['الأول','الثاني','الثالث'][y-1]} المهني</Ch>)}</div></>}
    {st === 3 && <><h2>أهدافك الدراسية</h2><p className="mu">كلها اختيارية، ويمكنك تغييرها لاحقًا.</p>
      <label htmlFor="ex">موعد الامتحان القادم</label><input id="ex" className="in" type="date" value={d.exam} onChange={e => up({exam:e.target.value})}/>
      <label htmlFor="hr">ساعات الدراسة يوميًا (0.5 إلى 12)</label><input id="hr" className="in" type="number" step="0.5" min="0.5" max="12" value={d.hours} onChange={e => up({hours:e.target.value})}/>
      <label htmlFor="hd">المواد التي تجدها صعبة</label><input id="hd" className="in" maxLength={300} value={d.hard} onChange={e => up({hard:e.target.value})}/>
      <label htmlFor="gl">هدفك</label><input id="gl" className="in" maxLength={300} value={d.goal} onChange={e => up({goal:e.target.value})}/>
      <label>طريقتك المفضلة في المراجعة</label><div className="row">{Object.entries(RS).map(([k, v]) => <Ch key={k} on={d.rs === k} onClick={() => up({rs:d.rs === k ? '' : k})}>{v}</Ch>)}</div></>}
    <Note n={err}/>
    {st < 3 ? <button className="btn" disabled={!valid} onClick={() => setSt(st + 1)}>التالي</button>
      : <button className="btn" disabled={!valid || b} onClick={save}>{b ? 'جارٍ الحفظ...' : 'حفظ والبدء'}</button>}
    {st > 0 && <button className="btn g" onClick={() => setSt(st - 1)}>السابق</button>}
    {onCancel && <button className="btn o" onClick={onCancel}>إلغاء</button>}
    </div></Shell>
}

function Home({sp, name, onEdit, go, role}) {
  const [tm, setTm] = useState(false)
  const left = sp.exam_date ? Math.ceil((new Date(sp.exam_date) - new Date()) / 864e5) : null
  const where = sp.study_type === 'academic' ? sp.grade + (sp.branch ? ' - ' + BR[sp.branch] : '')
    : sp.vocational_branch + (sp.vocational_dept ? ' - ' + sp.vocational_dept : '') + ' - ' + ['الأول','الثاني','الثالث'][sp.vocational_year - 1] + ' المهني'
  async function del() {
    if (!confirm('سيُحذف حسابك وكل بياناتك نهائيًا. هل أنت متأكد؟')) return
    const {error} = await supabase.rpc('delete_my_account')
    if (error) return alert(msg(error))
    await supabase.auth.signOut()
  }
  if (tm) return <Terms back={() => setTm(false)}/>
  return <Shell><section className="hero"><h1>أهلًا {name || 'بك'}</h1><p className="mu">{where}</p></section>
    <div className="card"><h2>📅 الامتحان القادم</h2>
      {left === null ? <p className="mu">لم تحدد موعدًا بعد. أضفه من «تعديل بياناتي».</p>
        : <p>{left > 0 ? `باقٍ ${left} يومًا` : left === 0 ? 'الامتحان اليوم' : 'انتهى الموعد، حدّث موعدًا جديدًا'}</p>}
      {sp.daily_hours && <p className="mu">هدفك: {sp.daily_hours} ساعة دراسة يوميًا</p>}</div>
    <div className="emp">لا نشاط بعد. افتح «موادي» لتبدأ، ولن تظهر هنا أرقام تقدم وهمية.</div>
    <button className="btn" onClick={() => go('learn')}>📚 موادي ودروسي</button>
    <button className="btn g" onClick={() => go('videos')}>🎥 فيديوهات الشرح</button>
    <button className="btn g" onClick={() => go('chat')}>🤖 اسأل سچاچ</button>
    {role !== 'student' && <><button className="btn g" onClick={() => go('review')}>🗂️ مراجعة المحتوى (للإدارة)</button><button className="btn g" onClick={() => go('teachers')}>👨‍🏫 المعلمون والفيديوهات (للإدارة)</button></>}
    <button className="btn o" onClick={onEdit}>تعديل بياناتي</button>
    <button className="btn g" onClick={() => supabase.auth.signOut()}>تسجيل الخروج</button>
    <button className="btn d" onClick={del}>حذف حسابي</button>
    <button className="lnk" onClick={() => setTm(true)}>الشروط والخصوصية</button></Shell>
}

export default function App() {
  const [s, setS] = useState(undefined), [rec, setRec] = useState(false), [sp, setSp] = useState(undefined)
  const [name, setName] = useState(''), [edit, setEdit] = useState(false), [fail, setFail] = useState(false), [k, setK] = useState(0), [view, setView] = useState('home'), [role, setRole] = useState('student')
  useEffect(() => {
    if (!ready) return
    supabase.auth.getSession().then(({data}) => setS(data.session))
    const {data:{subscription}} = supabase.auth.onAuthStateChange((ev, ses) => { setS(ses); if (ev === 'PASSWORD_RECOVERY') setRec(true) })
    return () => subscription.unsubscribe()
  }, [])
  const uid = s?.user?.id
  useEffect(() => {
    if (!uid) { setSp(undefined); setEdit(false); return }
    setFail(false)
    Promise.all([supabase.from('student_profiles').select('*').eq('user_id', uid).maybeSingle(),
      supabase.from('profiles').select('full_name,role').eq('id', uid).maybeSingle()])
      .then(([a, b]) => { if (a.error) return setFail(true); setSp(a.data); setName(b.data?.full_name || ''); setRole(b.data?.role || 'student') })
      .catch(() => setFail(true))
  }, [uid, k])
  if (!ready) return <Shell><div className="card"><h2>الإعداد غير مكتمل</h2><p>لم تُضبط إعدادات Supabase. أضف VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY ثم أعد التشغيل (راجع README).</p></div></Shell>
  if (s === undefined) return <Load/>
  if (rec) return <Recover done={() => setRec(false)}/>
  if (!s) return <Auth/>
  if (fail) return <Shell><div className="n err">تعذّر تحميل بياناتك.</div><button className="btn" onClick={() => setK(k + 1)}>إعادة المحاولة</button><button className="btn g" onClick={() => supabase.auth.signOut()}>تسجيل الخروج</button></Shell>
  if (sp === undefined) return <Load/>
  if (!sp || edit) return <Onboard uid={uid} init={sp} onDone={d => {setSp(d); setEdit(false)}} onCancel={sp ? () => setEdit(false) : null}/>
  if (view === 'learn') return <Learn sp={sp} role={role} back={() => setView('home')}/>
  if (view === 'chat') return <Chat sp={sp} back={() => setView('home')}/>
  if (view === 'videos') return <Videos sp={sp} back={() => setView('home')}/>
  if (view === 'teachers' && role !== 'student') return <Teachers back={() => setView('home')}/>
  if (view === 'review' && role !== 'student') return <Review back={() => setView('home')}/>
  return <Home sp={sp} name={name} onEdit={() => setEdit(true)} go={setView} role={role}/>
}
