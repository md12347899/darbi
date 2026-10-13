import {useEffect, useState} from 'react'
import {supabase} from './supabase'
import {LINKS} from './links.js'

const Load = () => <div className="ctr"><div className="sp"/><p>جارٍ التحميل...</p></div>
const Shell = ({back, children}) => <main className="wrap"><button className="lnk" onClick={back}>→ رجوع</button>{children}</main>
const Note = ({n}) => n ? <div className={'n ' + n.t} role="alert">{n.m}</div> : null
const ST = {verified: 'موثّق', needs_review: 'قيد المراجعة', test: 'تجريبي'}

function useQ(fn, deps) {
  const [s, setS] = useState({l: true})
  const run = () => { setS({l: true}); Promise.resolve(fn()).then(r => setS(r.error ? {e: true} : {d: r.data})).catch(() => setS({e: true})) }
  useEffect(run, deps)
  return [s, run]
}
const Retry = ({run}) => <><div className="n err">تعذّر التحميل. تحقق من الإنترنت.</div><button className="btn" onClick={run}>إعادة المحاولة</button></>

// استدعاء دالة youtube وإرجاع {ok} أو {err} برسالة مفهومة
async function call(body) {
  const {data, error} = await supabase.functions.invoke('youtube', {body})
  if (!error && !data?.error) return {ok: data}
  let m = data?.error
  if (!m) try { m = (await error.context.json()).error } catch {}
  return {err: m || 'تعذّر التنفيذ. تأكد من نشر دالة youtube وضبط YOUTUBE_API_KEY.'}
}
// مواد صف الطالب (المنشورة فقط)
const subjQ = (sp, cols) => {
  const q = supabase.from('subjects').select(cols).eq('published', true).eq('study_type', sp.study_type)
  return sp.study_type === 'academic'
    ? q.eq('grade', sp.grade).or('branch.is.null' + (sp.branch ? ',branch.eq.' + sp.branch : ''))
    : q.eq('voc_branch', sp.vocational_branch).eq('voc_year', sp.vocational_year)
}

export function Learn({sp, role, back}) {
  const [v, setV] = useState({t: 's'})
  if (v.t === 'x') return <Lesson l={v.l} staff={role !== 'student'} back={() => setV({t: 'l', s: v.s})}/>
  if (v.t === 'l') return <Lessons s={v.s} back={() => setV({t: 's'})} open={l => setV({t: 'x', s: v.s, l})}/>
  return <Subjects sp={sp} back={back} open={s => setV({t: 'l', s})}/>
}

function Subjects({sp, back, open}) {
  const [r, run] = useQ(() => subjQ(sp, '*').order('name'), [])
  return <Shell back={back}><h1>موادي</h1><br/>
    {r.l ? <Load/> : r.e ? <Retry run={run}/> : !r.d.length
      ? <div className="emp">لم تُضف مواد لصفك بعد. يضيفها المدير بعد التحقق من المصدر الرسمي.</div>
      : r.d.map(s => <button key={s.id} className="card" onClick={() => open(s)}><h2>{s.name}</h2><span className="mu">{ST[s.status]}</span></button>)}</Shell>
}

function Lessons({s, back, open}) {
  const [r, run] = useQ(() => supabase.from('lessons').select('*').eq('subject_id', s.id).eq('published', true).order('sort'), [s.id])
  const [bk] = useQ(() => supabase.from('books').select('*').eq('subject_id', s.id).eq('published', true), [s.id])
  let last = null
  return <Shell back={back}><h1>{s.name}</h1>
    {bk.d?.length > 0 && <><h2>📚 الكتاب</h2>{bk.d.map(b => <a key={b.id} className="card" href={b.source_url} target="_blank" rel="noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
      <h3>{b.title}</h3><span className="mu">{b.edition}{b.status !== 'verified' ? ' — لم يُتحقق منه رسميًا، تأكد من سنة الطبعة' : ''}</span></a>)}</>}
    <h2>الدروس</h2>
    {r.l ? <Load/> : r.e ? <Retry run={run}/> : !r.d.length ? <div className="emp">لا دروس في هذه المادة بعد.</div>
      : r.d.map(l => { const h = l.chapter && l.chapter !== last ? <h2 key={'c' + l.id} style={{marginTop: 14}}>{l.chapter}</h2> : null; last = l.chapter
        return [h, <button key={l.id} className="card" onClick={() => open(l)}><h3>{l.title}</h3><span className="mu">{ST[l.status]}</span></button>] })}</Shell>
}

function Lesson({l, staff, back}) {
  const [vd, runV] = useQ(() => supabase.from('videos').select('*').eq('lesson_id', l.id), [l.id])
  const [play, setPlay] = useState(null), [n, setN] = useState(null), [b, setB] = useState(false)
  const rank = {approved: 0, suggested: 1, rejected: 2}
  const vids = (vd.d || []).slice().sort((x, y) => rank[x.status] - rank[y.status] || (y.score || 0) - (x.score || 0))
  async function find() {
    setB(true); setN(null)
    const r = await call({action: 'find', lesson_id: l.id})
    setB(false); setN(r.err ? {t: 'err', m: r.err} : {t: 'ok', m: r.ok.msg}); if (r.ok) runV()
  }
  async function mark(id, status) { await supabase.from('videos').update({status}).eq('id', id); runV() }
  return <Shell back={back}><h1>{l.title}</h1><span className="mu">{ST[l.status]}{l.status !== 'verified' ? ' — لم يُتحقق من مطابقته للمنهج الرسمي بعد' : ''}</span>
    <h2 style={{marginTop: 16}}>الملخص</h2>
    {l.summary ? <div className="card" style={{whiteSpace: 'pre-line'}}>{l.summary}</div> : <div className="emp">لم يُضف ملخص لهذا الدرس بعد.</div>}
    <h2>فيديوهات الشرح</h2>
    {staff && <><button className="btn g" disabled={b} onClick={find}>{b ? 'جارٍ البحث...' : '🔎 بحث عام عن فيديوهات لهذا الدرس'}</button><Note n={n}/></>}
    {vd.l ? <Load/> : vd.e ? <Retry run={runV}/> : !vids.length ? <div className="emp" style={{marginTop: 10}}>لا فيديوهات لهذا الدرس بعد.</div>
      : vids.map(v => <div className="card" key={v.id} style={{marginTop: 10}}>
        {play === v.id ? <iframe title={v.title} className="vf" src={`https://www.youtube-nocookie.com/embed/${v.youtube_id}`} allowFullScreen/>
          : <button className="btn g" onClick={() => setPlay(v.id)}>▶ شغّل الفيديو</button>}
        <h3 style={{marginTop: 8}}>{v.title}</h3>
        <p className="mu">{v.channel} — {v.status === 'approved' ? '✅ معتمد' : v.status === 'rejected' ? '⛔ مرفوض' : '⚠️ مقترح غير معتمد'}</p>
        <a className="lnk" href={`https://www.youtube.com/watch?v=${v.youtube_id}`} target="_blank" rel="noreferrer">فتح في يوتيوب</a>
        {staff && <div className="row"><button className="chip" onClick={() => mark(v.id, 'approved')}>اعتماد</button><button className="chip" onClick={() => mark(v.id, 'rejected')}>رفض</button></div>}</div>)}
    <h2>اختبار قصير</h2><Quiz lid={l.id}/></Shell>
}

function Quiz({lid}) {
  const [r, run] = useQ(() => supabase.from('questions').select('*').eq('lesson_id', lid).eq('published', true), [lid])
  const [a, setA] = useState({}), [saved, setSaved] = useState(null)
  if (r.l) return <Load/>
  if (r.e) return <Retry run={run}/>
  const qs = r.d
  if (!qs.length) return <div className="emp">لا أسئلة لهذا الدرس بعد.</div>
  const done = Object.keys(a).length === qs.length, score = qs.filter(q => a[q.id] === q.answer).length
  function pick(q, i) {
    if (a[q.id] != null) return
    const m = {...a, [q.id]: i}; setA(m)
    if (Object.keys(m).length === qs.length)
      supabase.from('attempts').insert({lesson_id: lid, score: qs.filter(x => m[x.id] === x.answer).length, total: qs.length}).then(({error}) => setSaved(!error))
  }
  return <>{qs.map(q => <div className="card" key={q.id}>
    <p className="mu">{q.source_type === 'official' && q.status === 'verified' ? 'سؤال وزاري موثّق' + (q.exam_year ? ' - ' + q.exam_year : '') : 'سؤال تدريبي (ليس وزاريًا أصليًا)'}</p>
    <h3>{q.body}</h3>
    {q.options.map((o, i) => <button key={i} className={'op' + (a[q.id] != null ? (i === q.answer ? ' ok' : i === a[q.id] ? ' no' : '') : '')} onClick={() => pick(q, i)}>{o}</button>)}
    {a[q.id] != null && q.explanation && <p className="mu" style={{marginTop: 8}}>💡 {q.explanation}</p>}</div>)}
    {done && <div className="emp"><h2>نتيجتك: {score} من {qs.length}</h2>
      {saved === false && <p>تعذّر حفظ النتيجة في سجلك.</p>}
      <button className="btn" onClick={() => {setA({}); setSaved(null)}}>أعد المحاولة</button></div>}</>
}

// سچاچ: مساعد قائم على قواعد بسيطة، وليس ذكاءً اصطناعيًا ولا يحتاج أي خدمة مدفوعة
async function reply(q, sp) {
  const {data: sj, error} = await subjQ(sp, 'id')
  if (error) throw error
  const ids = sj.map(x => x.id)
  if (!ids.length) return {t: 'لا توجد مواد منشورة لصفك بعد، فلا أجد ما أساعدك به. يضيفها المدير أولًا.'}
  if (/ضعف|خطأ|أخطاء|اخطاء|نتيج/.test(q)) {
    const {data} = await supabase.from('attempts').select('score,total,lessons(title,subject_id)').order('created_at', {ascending: false}).limit(60)
    const m = {}
    ;(data || []).filter(a => ids.includes(a.lessons?.subject_id)).forEach(a => { const k = a.lessons.title; m[k] = m[k] || [0, 0]; m[k][0] += a.score; m[k][1] += a.total })
    const w = Object.entries(m).map(([k, [s, t]]) => [k, s / t]).filter(x => x[1] < 0.7).sort((x, y) => x[1] - y[1])
    return {t: !Object.keys(m).length ? 'لم تحلّ اختبارات بعد. حلّ اختبارًا من أي درس وسأحلل نتيجتك.'
      : w.length ? 'دروس تحتاج مراجعة:\n' + w.map(x => `• ${x[0]} (${Math.round(x[1] * 100)}%)`).join('\n') : 'نتائجك جيدة: 70% فأكثر في كل ما حللته.'}
  }
  if (/جدول|خطة|خطه/.test(q)) {
    const {data: ls} = await supabase.from('lessons').select('title').eq('published', true).in('subject_id', ids).order('subject_id').order('sort').limit(200)
    if (!ls?.length) return {t: 'لا توجد دروس منشورة بعد.'}
    const per = Math.max(1, Math.floor(sp.daily_hours || 2)), need = Math.ceil(ls.length / per)
    const left = sp.exam_date ? Math.ceil((new Date(sp.exam_date) - new Date()) / 864e5) : null
    const head = left === null ? 'أضف موعد الامتحان من «تعديل بياناتي» لأحسب لك بدقة.'
      : left >= need ? `باقٍ ${left} يومًا وتحتاج نحو ${need} يومًا بهذا الإيقاع.` : `باقٍ ${left} يومًا فقط وتحتاج نحو ${need}. ارفع ساعاتك أو ركّز على الأهم.`
    return {t: head + '\n' + Array.from({length: Math.min(need, 7)}, (_, d) => `اليوم ${d + 1}: ` + ls.slice(d * per, d * per + per).map(x => x.title).join(' + ')).join('\n')}
  }
  if (/اسألني|اسالني|اختبرني/.test(q)) {
    const {data} = await supabase.from('questions').select('*,lessons!inner(subject_id)').eq('published', true).in('lessons.subject_id', ids).limit(30)
    const z = data?.[Math.floor(Math.random() * data.length)]
    return z ? {t: z.body, q: z} : {t: 'لا أسئلة منشورة لدروسك بعد.'}
  }
  const ws = [...new Set(q.replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(w => w.length > 2))].slice(0, 5)
  if (!ws.length) return {t: 'اكتب كلمة من اسم الدرس، أو اختر أحد الأزرار.'}
  const {data} = await supabase.from('lessons').select('title,summary').eq('published', true).in('subject_id', ids)
    .or(ws.map(w => `title.ilike.%${w}%,summary.ilike.%${w}%`).join(',')).limit(4)
  return {t: data?.length ? data.map(x => `📘 ${x.title}\n${(x.summary || 'لا ملخص بعد').slice(0, 220)}`).join('\n\n') : 'لم أجد درسًا مطابقًا. جرّب كلمة أخرى من عنوان الدرس.'}
}

export function Chat({sp, back}) {
  const [m, setM] = useState([]), [t, setT] = useState(''), [b, setB] = useState(false)
  async function ask(q) {
    q = q.trim(); if (!q || b) return
    setM(x => [...x, {me: 1, t: q}]); setT(''); setB(true)
    try { const r = await reply(q, sp); setM(x => [...x, r]) } catch { setM(x => [...x, {t: 'تعذّر التحميل. تحقق من الإنترنت وأعد المحاولة.'}]) }
    setB(false)
  }
  const pick = (mi, i) => setM(x => x.map((y, k) => k === mi && y.pick == null ? {...y, pick: i} : y))
  return <Shell back={back}><div className="row" style={{alignItems: 'center'}}>
    <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="26" fill="#0e9aa0"/><path d="M12 22l14-8 14 8-14 8z" fill="#fff"/><path d="M18 27v7c4 4 12 4 16 0v-7" fill="none" stroke="#fff" strokeWidth="3"/></svg>
    <div><h2 style={{margin: 0}}>سچاچ — مساعدك الذكي في دَرْبي</h2><span className="mu">مساعد قائم على قواعد، وليس ذكاءً اصطناعيًا.</span></div></div>
    <div className="row">{['نقاط ضعفي', 'اصنع لي جدولًا', 'اسألني سؤالًا'].map(c => <button key={c} className="chip" onClick={() => ask(c)}>{c}</button>)}</div>
    {!m.length && <div className="emp" style={{marginTop: 12}}>اكتب كلمة من اسم درس لأعرض لك ملخصه، أو اختر زرًّا.</div>}
    {m.map((x, i) => <div key={i} className={'bub' + (x.me ? ' me' : '')}>{x.t}
      {x.q && x.q.options.map((o, j) => <button key={j} className={'op' + (x.pick != null ? (j === x.q.answer ? ' ok' : j === x.pick ? ' no' : '') : '')} onClick={() => pick(i, j)}>{o}</button>)}
      {x.q && x.pick != null && x.q.explanation && <p className="mu">💡 {x.q.explanation}</p>}</div>)}
    {b && <div className="bub"><div className="sp" style={{margin: 0}}/></div>}
    <form className="row" onSubmit={e => {e.preventDefault(); ask(t)}} style={{marginTop: 12, flexWrap: 'nowrap'}}>
      <input className="in" style={{marginTop: 0}} maxLength={200} value={t} onChange={e => setT(e.target.value)} placeholder="اكتب هنا..." aria-label="رسالتك"/>
      <button className="btn" style={{width: 'auto', marginTop: 0}} disabled={b || !t.trim()}>إرسال</button></form></Shell>
}

export function Teachers({back}) {
  const [r, run] = useQ(() => supabase.from('teachers').select('*').order('subscribers', {ascending: false, nullsFirst: false}), [])
  const [q, setQ] = useState('مدرس رياضيات السادس الاعدادي العراق'), [ref, setRef] = useState(''), [n, setN] = useState(null), [b, setB] = useState('')
  async function go(body, tag) {
    setB(tag); setN(null)
    const x = await call(body)
    setB(''); setN(x.err ? {t: 'err', m: x.err} : {t: 'ok', m: x.ok.msg}); if (x.ok) run()
  }
  async function mark(id, status) { await supabase.from('teachers').update({status}).eq('id', id); run() }
  const SL = {suggested: '⚠️ مقترح', approved: '✅ معتمد', rejected: '⛔ مرفوض'}
  return <Shell back={back}><h1>المعلمون والفيديوهات</h1>
    <p className="mu">اعتمد المعلمين الذين تثق بهم، ثم اجلب فيديوهاتهم لتُوزَّع على الدروس المطابقة لعناوينها.</p>
    <div className="card"><label htmlFor="q">اكتشف معلمين (يستهلك 100 وحدة من حصة يوتيوب اليومية)</label>
      <input id="q" className="in" value={q} onChange={e => setQ(e.target.value)}/>
      <button className="btn g" disabled={!!b} onClick={() => go({action: 'discover', query: q}, 'd')}>{b === 'd' ? 'جارٍ البحث...' : '🔎 اكتشف'}</button>
      <label htmlFor="rf">أو أضف قناة تعرفها (وحدة واحدة)</label>
      <input id="rf" className="in" dir="ltr" placeholder="@KH4MATH أو رابط القناة" value={ref} onChange={e => setRef(e.target.value)}/>
      <button className="btn g" disabled={!!b || !ref.trim()} onClick={() => go({action: 'add', ref}, 'a')}>{b === 'a' ? 'جارٍ الإضافة...' : '＋ أضف'}</button>
      <Note n={n}/></div>
    {r.l ? <Load/> : r.e ? <Retry run={run}/> : !r.d.length ? <div className="emp">لا معلمين بعد. اكتشف أو أضف قناة.</div>
      : r.d.map(t => <div className="card" key={t.id}>
        <div className="row" style={{flexWrap: 'nowrap', alignItems: 'center'}}>{t.thumb && <img className="th" src={t.thumb} alt="" referrerPolicy="no-referrer"/>}
          <div><h3>{t.name}</h3><span className="mu">{SL[t.status]}{t.subscribers ? ' — ' + t.subscribers.toLocaleString('en') + ' مشترك' : ''}</span></div></div>
        {t.subjects && <p className="mu">يدرّس: {t.subjects}{t.levels ? ' (' + t.levels + ')' : ''}</p>}
        <p className="mu">{t.last_synced ? 'آخر جلب: ' + t.last_synced.slice(0, 10) : 'لم تُجلب فيديوهاته بعد'}</p>
        <a className="lnk" href={`https://www.youtube.com/channel/${t.channel_id}`} target="_blank" rel="noreferrer">افتح القناة للتأكد منها</a>
        <div className="row"><button className="chip" onClick={() => mark(t.id, 'approved')}>اعتماد</button><button className="chip" onClick={() => mark(t.id, 'rejected')}>رفض</button>
          <button className="chip" disabled={!!b} onClick={() => go({action: 'sync', teacher_id: t.id}, 's' + t.id)}>{b === 's' + t.id ? 'جارٍ الجلب...' : '🔄 اجلب فيديوهاته ووزّعها'}</button></div></div>)}</Shell>
}

export function Videos({sp, back}) {
  const mine = sp.study_type === 'academic' ? LINKS.filter(l => l.g === sp.grade && (!l.br || [].concat(l.br).includes(sp.branch))) : []
  const subs = [...new Set(mine.map(l => l.subj))]
  return <Shell back={back}><h1>🎥 فيديوهات الشرح</h1>
    <p className="mu">روابط تفتح في يوتيوب. جُمعت من نتائج بحث ولم تُراجَع كلها بعد، فتأكد أنها تطابق منهج هذا العام.</p>
    {!mine.length ? <div className="emp" style={{marginTop: 12}}>لا روابط لصفك بعد، وتُضاف تدريجيًا.</div>
      : subs.map(s => <div key={s}><h2>{s}</h2>{mine.filter(l => l.subj === s).map(l =>
        <a key={l.url + l.t} className="card" href={l.url} target="_blank" rel="noreferrer" style={{textDecoration: 'none', color: 'inherit'}}>
          <h3>{l.channel ? '📺 ' : '▶ '}{l.t}</h3><span className="mu">{l.by}{l.note ? ' — ' + l.note : ''}</span></a>)}</div>)}</Shell>
}

const BRL = {science: 'علمي', arts: 'أدبي', bio: 'أحيائي', applied: 'تطبيقي'}
export function Review({back}) {
  const [r, run] = useQ(() => supabase.from('subjects').select('*,books(source_url)').eq('published', false).order('grade').order('name').limit(500), [])
  const [n, setN] = useState(null)
  async function pub(ids, verify) {
    const patch = verify ? {published: true, status: 'verified'} : {published: true}
    const a = await supabase.from('subjects').update(patch).in('id', ids)
    const b = await supabase.from('books').update(patch).in('subject_id', ids)
    setN(a.error || b.error ? {t: 'err', m: 'تعذّر الحفظ.'} : {t: 'ok', m: `نُشرت ${ids.length} مادة.`}); run()
  }
  async function del(id) { if (confirm('حذف هذه المادة وكتبها؟')) { await supabase.from('subjects').delete().eq('id', id); run() } }
  const g = {}
  ;(r.d || []).forEach(s => { const k = (s.grade || s.voc_branch + ' - ' + ['', 'الأول', 'الثاني', 'الثالث'][s.voc_year] + ' المهني') + (s.branch ? ' - ' + BRL[s.branch] : ''); (g[k] = g[k] || []).push(s) })
  return <Shell back={back}><h1>مراجعة المحتوى</h1>
    <p className="mu">مواد وكتب مصدرها فهرس غير رسمي أو روابط لم أفتحها. افتح الرابط وتأكد من الكتاب وسنته، ثم انشر. «نشر» يُظهرها للطلاب بوسم «قيد المراجعة»، و«توثيق» لما تأكدتَ منه.</p>
    <Note n={n}/>
    {r.l ? <Load/> : r.e ? <Retry run={run}/> : !r.d.length ? <div className="emp">لا شيء بانتظار المراجعة.</div>
      : Object.entries(g).map(([k, ss]) => <div key={k}><h2 style={{marginTop: 16}}>{k} ({ss.length})</h2>
        <button className="btn g" onClick={() => pub(ss.map(s => s.id), false)}>نشر الكل في هذا الصف</button>
        {ss.map(s => <div className="card" key={s.id} style={{marginTop: 8}}><h3>{s.name}</h3>
          {s.books?.[0]?.source_url && <a className="lnk" href={s.books[0].source_url} target="_blank" rel="noreferrer">افتح مصدر الكتاب</a>}
          <div className="row"><button className="chip" onClick={() => pub([s.id], false)}>نشر</button><button className="chip" onClick={() => pub([s.id], true)}>✅ توثيق</button><button className="chip" onClick={() => del(s.id)}>حذف</button></div></div>)}</div>)}</Shell>
}
