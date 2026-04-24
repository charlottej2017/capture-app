import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import styles from './Dashboard.module.css'

const P = {
  blush: '#CCA0A0', rose: '#CF7381', chestnut: '#795654',
  crimson: '#A3334B', burgundy: '#531C24',
  blushBg: '#F9F0F0', roseBg: '#F7EAEC', crimsonBg: '#F5E6EA', border: '#ECDCDC',
}

const PRIORITY_META = {
  high:   { label: 'High',   color: P.crimson,  light: P.crimsonBg, dot: P.crimson },
  medium: { label: 'Medium', color: P.rose,     light: P.roseBg,    dot: P.rose    },
  low:    { label: 'Low',    color: P.blush,    light: P.blushBg,   dot: P.blush   },
}

const today    = new Date().toISOString().split('T')[0]
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

const fmtDue = (iso) => {
  if (!iso) return null
  const d = new Date(iso + 'T00:00:00')
  const t = new Date(); t.setHours(0,0,0,0)
  const diff = Math.round((d - t) / (1000*60*60*24))
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, color: P.crimson,  bg: P.crimsonBg, overdue: true  }
  if (diff === 0) return { label: 'Due today',                   color: P.chestnut, bg: P.roseBg,    overdue: false }
  if (diff === 1) return { label: 'Due tomorrow',                color: P.chestnut, bg: P.blushBg,   overdue: false }
  if (diff <= 7)  return { label: `Due ${d.toLocaleDateString('en-US',{weekday:'short'})}`, color: P.chestnut, bg: P.blushBg, overdue: false }
  return { label: d.toLocaleDateString('en-US',{month:'short',day:'numeric'}), color: P.blush, bg: '#faf6f6', overdue: false }
}

const AFFIRMATIONS = [
  { text: "Life brings me only good experiences. I am open to new and wonderful changes.", category: "Prosperity" },
  { text: "My self-esteem is high because I honor who I am.", category: "Self-Esteem" },
  { text: "I now free myself from destructive fears and doubts.", category: "Healing" },
  { text: "I deserve the best, and I accept it now. All my needs and desires are met before I even ask.", category: "Love" },
  { text: "I am worth loving. There is love all around me.", category: "Love" },
  { text: "All is well in my world.", category: "Self-Esteem" },
  { text: "I am a joyful breeze entering a room.", category: "Happiness" },
  { text: "I love myself just the way I am.", category: "Self-Esteem" },
  { text: "I feel safe in the rhythm and flow of ever-changing life.", category: "Healing" },
  { text: "My income is constantly increasing.", category: "Prosperity" },
  { text: "I forgive myself and set myself free.", category: "Forgiveness" },
  { text: "Wellness is the natural state of my body. I believe in perfect health.", category: "Health" },
  { text: "I am at home in my body.", category: "Self-Esteem" },
  { text: "I am an open channel for creative ideas.", category: "Love" },
  { text: "My heart is open. I speak with loving words.", category: "Relationships" },
  { text: "I am grateful for my healthy body. I love life.", category: "Healing" },
  { text: "My day begins and ends with gratitude and joy.", category: "Happiness" },
  { text: "Everything in my life works now and forevermore.", category: "Inspiration" },
  { text: "Today I create a wonderful new day and a wonderful new future.", category: "Prosperity" },
  { text: "My mind and body are in perfect balance. I am a harmonious being.", category: "Health" },
  { text: "Every decision I make is the right one for me.", category: "Inspiration" },
  { text: "Life supports me in every possible way.", category: "Self-Esteem" },
  { text: "I am pain free and totally in sync with life.", category: "Healing" },
  { text: "I accept my power.", category: "Inspiration" },
  { text: "I am unlimited in my wealth. All areas of my life are abundant and fulfilling.", category: "Prosperity" },
  { text: "All that I seek is already within me.", category: "Self-Esteem" },
  { text: "Every experience I have is perfect for my growth.", category: "Forgiveness" },
  { text: "Abundance flows freely through me.", category: "Prosperity" },
  { text: "I forgive everyone in my past for all perceived wrongs. I release them with love.", category: "Forgiveness" },
  { text: "I love every cell of my body.", category: "Healing" },
  { text: "I feel glorious, dynamic energy. I am active and alive.", category: "Health" },
  { text: "I choose to feel good about myself each day.", category: "Self-Esteem" },
  { text: "My life is joyously balanced with work and play.", category: "Happiness" },
  { text: "This is a new day! I begin anew and claim and create all that is good.", category: "Inspiration" },
  { text: "I handle my own life with joy and ease.", category: "Happiness" },
  { text: "As I forgive myself, it becomes easier to forgive others.", category: "Forgiveness" },
  { text: "Nourishing myself is a joyful experience, and I am worth the time spent on my healing.", category: "Healing" },
  { text: "You are a unique, beautiful soul.", category: "Self-Esteem" },
  { text: "All that I need to know at any given moment is revealed to me. My intuition is always on my side.", category: "Inspiration" },
  { text: "I look within to find my treasures.", category: "Prosperity" },
  { text: "I flow easily with new experiences, new challenges, and new people who enter my life.", category: "Happiness" },
  { text: "I am surrounded by love. All is well.", category: "Relationships" },
  { text: "Today is the future I created yesterday.", category: "Inspiration" },
  { text: "I now choose to release all hurt and resentment.", category: "Forgiveness" },
  { text: "I go beyond barriers to possibilities.", category: "Healing" },
  { text: "I draw love and acceptance into my life, and I accept it now.", category: "Forgiveness" },
  { text: "I rejoice in the love I encounter every day.", category: "Love" },
  { text: "I am beautiful, and everybody loves me.", category: "Relationships" },
  { text: "I experience love wherever I go. Loving people fill my life.", category: "Relationships" },
  { text: "I take in and give out nourishment in perfect balance.", category: "Health" },
  { text: "I am patient, tolerant, and diplomatic.", category: "Health" },
  { text: "I am one with the very Power that created me.", category: "Inspiration" },
  { text: "Today is going to be a really, really good day.", category: "Happiness" },
]

// Pick a quote that changes daily (same quote all day, new one tomorrow)
const getDailyAffirmation = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000)
  return AFFIRMATIONS[dayOfYear % AFFIRMATIONS.length]
}

export default function Dashboard({ session }) {
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [view, setView]           = useState('tasks')
  const [priFilter, setPriFilter] = useState('all')
  const [showDone, setShowDone]   = useState(false)
  const [showAdd, setShowAdd]     = useState(false)
  const [expandId, setExpandId]   = useState(null)
  const [search, setSearch]       = useState('')
  const [saving, setSaving]       = useState(false)
  const [affirmation]             = useState(getDailyAffirmation)
  const [newItem, setNewItem]     = useState({ kind:'task', title:'', priority:'medium', source:'manual', due_date:'', note:'' })
  const titleRef = useRef(null)
  const user = session.user

  // Load items from Supabase
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (!error) setItems(data || [])
      setLoading(false)
    }
    load()

    // Realtime subscription
    const channel = supabase
      .channel('items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.eventType === 'INSERT') setItems(p => [payload.new, ...p])
          if (payload.eventType === 'UPDATE') setItems(p => p.map(t => t.id === payload.new.id ? payload.new : t))
          if (payload.eventType === 'DELETE') setItems(p => p.filter(t => t.id !== payload.old.id))
        })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user.id])

  useEffect(() => { if (showAdd && titleRef.current) titleRef.current.focus() }, [showAdd])

  const save = async () => {
    if (!newItem.title.trim()) return
    setSaving(true)
    const { error } = await supabase.from('items').insert([{
      ...newItem,
      user_id: user.id,
      kind: view === 'reminders' ? 'reminder' : 'task',
      due_date: newItem.due_date || null,
      done: false,
    }])
    if (!error) {
      setNewItem({ kind:'task', title:'', priority:'medium', source:'manual', due_date:'', note:'' })
      setShowAdd(false)
    }
    setSaving(false)
  }

  const toggle = async (item) => {
    await supabase.from('items').update({ done: !item.done }).eq('id', item.id)
  }

  const remove = async (id) => {
    setExpandId(null)
    await supabase.from('items').delete().eq('id', id)
  }

  const update = async (id, patch) => {
    await supabase.from('items').update(patch).eq('id', id)
  }

  const signOut = () => supabase.auth.signOut()

  const visible = items.filter(t => {
    if (t.kind !== (view === 'tasks' ? 'task' : 'reminder')) return false
    if (!showDone && t.done) return false
    if (priFilter !== 'all' && t.priority !== priFilter) return false
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    tasks:     items.filter(t => t.kind==='task'     && !t.done).length,
    reminders: items.filter(t => t.kind==='reminder' && !t.done).length,
    overdue:   items.filter(t => t.kind==='task' && !t.done && t.due_date && new Date(t.due_date+'T00:00:00') < new Date().setHours(0,0,0,0)).length,
  }

  const byPri = p => visible.filter(t => t.priority === p)

  // ── Card ──
  const Card = ({ item, i }) => {
    const pri  = PRIORITY_META[item.priority]
    const due  = fmtDue(item.due_date)
    const open = expandId === item.id

    return (
      <div className={styles.card} style={{ opacity: item.done ? 0.45 : 1, animationDelay: `${i*0.04}s` }}
        onMouseEnter={e=>{ if(!item.done) e.currentTarget.style.boxShadow=`0 4px 16px ${P.blush}44` }}
        onMouseLeave={e=>{ e.currentTarget.style.boxShadow='none' }}>
        <div style={{ width:4, background: item.done ? P.border : pri.color, flexShrink:0 }}/>
        <div className={styles.cardBody} onClick={()=>setExpandId(open ? null : item.id)}>
          <div className={styles.cardRow}>
            <button className={styles.checkbox}
              onClick={e=>{ e.stopPropagation(); toggle(item) }}
              style={{
                border: `2px solid ${item.done ? P.rose : pri.color}`,
                background: item.done ? P.rose : 'transparent',
              }}>
              {item.done && <span style={{color:'#fff',fontSize:11,fontWeight:800}}>✓</span>}
            </button>

            <div className={styles.cardContent}>
              <div className={styles.cardTitle} style={{
                color: item.done ? P.blush : P.burgundy,
                textDecoration: item.done ? 'line-through' : 'none',
              }}>
                {item.title}
              </div>
              <div className={styles.cardBadges}>
                {item.source==='email' && (
                  <span className={styles.badge} style={{ color:P.chestnut, background:P.blushBg }}>✉ Email</span>
                )}
                {due && (
                  <span className={styles.badge} style={{ color:due.color, background:due.bg }}>
                    {due.overdue ? '⚠ ' : ''}{due.label}
                  </span>
                )}
                {item.note && !open && (
                  <span className={styles.notePreview}>{item.note}</span>
                )}
              </div>
            </div>

            <div className={styles.priDot} style={{ background: item.done ? P.border : pri.dot }}/>
          </div>

          {open && (
            <div className={styles.expanded} onClick={e=>e.stopPropagation()}>
              <div className={styles.expandRow}>
                <div style={{flex:1}}>
                  <label className={styles.expandLabel}>Note</label>
                  <input className={styles.expandInput} placeholder="Add a note…"
                    value={item.note || ''}
                    onChange={e=>update(item.id, { note: e.target.value })}
                    onBlur={e=>update(item.id, { note: e.target.value })}/>
                </div>
              </div>
              <div className={styles.expandRow}>
                <div style={{flex:1}}>
                  <label className={styles.expandLabel}>Due Date</label>
                  <input type="date" className={styles.expandInput}
                    value={item.due_date || ''}
                    onChange={e=>update(item.id, { due_date: e.target.value || null })}/>
                </div>
                <div style={{flex:1}}>
                  <label className={styles.expandLabel}>Priority</label>
                  <div style={{display:'flex',gap:5}}>
                    {['high','medium','low'].map(p=>(
                      <button key={p} className={styles.priBtn}
                        onClick={()=>update(item.id, { priority: p })}
                        style={{
                          background: item.priority===p ? PRIORITY_META[p].color : P.blushBg,
                          color: item.priority===p ? '#fff' : P.blush,
                        }}>
                        {p.charAt(0).toUpperCase()+p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{display:'flex',justifyContent:'flex-end'}}>
                <button className={styles.deleteBtn} onClick={()=>remove(item.id)}>Delete</button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const Section = ({ priority, items }) => {
    if (!items.length) return null
    const m = PRIORITY_META[priority]
    return (
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionDot} style={{background:m.dot}}/>
          <span className={styles.sectionLabel}>{m.label}</span>
          <span className={styles.sectionCount} style={{color:m.color,background:m.light}}>{items.length}</span>
          <div className={styles.sectionLine}/>
        </div>
        <div className={styles.cardList}>
          {items.map((t,i) => <Card key={t.id} item={t} i={i}/>)}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLeft}>
            <div className={styles.logo}>Capture</div>
            <div className={styles.date}>
              {new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}
            </div>
          </div>
          <div className={styles.headerRight}>
            {counts.overdue > 0 && (
              <div className={styles.overdueChip}>
                <span className={styles.overdueNum}>{counts.overdue}</span>
                <span className={styles.overdueLabel}>overdue</span>
              </div>
            )}
            <div className={styles.userChip}>
              <span className={styles.userEmail}>{user.email?.split('@')[0]}</span>
              <button className={styles.signOutBtn} onClick={signOut}>Sign out</button>
            </div>
          </div>
        </div>

        {/* Toggle */}
        <div className={styles.headerInner}>
          <div className={styles.toggle}>
            {[{key:'tasks',label:'Tasks',count:counts.tasks},{key:'reminders',label:'Reminders',count:counts.reminders}].map(v=>(
              <button key={v.key} className={`${styles.toggleBtn} ${view===v.key?styles.toggleActive:''}`}
                onClick={()=>{ setView(v.key); setExpandId(null); setPriFilter('all') }}>
                {v.label}
                {v.count > 0 && (
                  <span className={styles.toggleCount} style={{
                    color: view===v.key ? P.crimson : P.blush,
                    background: view===v.key ? P.crimsonBg : 'transparent',
                  }}>{v.count}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className={styles.headerInner} style={{paddingBottom:14}}>
          <div className={styles.filters}>
            {['all','high','medium','low'].map(p=>(
              <button key={p} className={styles.filterChip}
                onClick={()=>setPriFilter(p)}
                style={{
                  background: priFilter===p ? P.burgundy : P.blushBg,
                  color: priFilter===p ? '#fff' : P.chestnut,
                }}>
                {p==='all' ? 'All' : PRIORITY_META[p].label}
              </button>
            ))}
            <div style={{flex:1}}/>
            <button className={styles.filterChip}
              onClick={()=>setShowDone(s=>!s)}
              style={{ background: showDone ? P.burgundy : P.blushBg, color: showDone ? '#fff' : P.blush }}>
              {showDone ? 'Hide done' : 'Show done'}
            </button>
          </div>
        </div>
      </header>

      {/* Body */}
      <main className={styles.main}>

        {/* Affirmation card */}
        <div className={styles.affirmCard}>
          <div className={styles.affirmTop}>
            <span className={styles.affirmLabel}>✦ Daily Affirmation</span>
            <span className={styles.affirmCategory}>{affirmation.category}</span>
          </div>
          <p className={styles.affirmText}>"{affirmation.text}"</p>
          <div className={styles.affirmAttrib}>— Louise Hay</div>
        </div>

        {/* Search */}
        <div className={styles.searchWrap}>
          <span className={styles.searchIcon}>⌕</span>
          <input className={styles.searchInput} placeholder={`Search ${view}…`}
            value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>

        {/* Reminder callout */}
        {view==='reminders' && (
          <div className={styles.callout}>
            <strong>📌 What's a Reminder?</strong>
            <span> Time-sensitive nudges — trials, renewals, appointments — that live separately from real deadlines.</span>
          </div>
        )}

        {/* Add form */}
        {showAdd && (
          <div className={styles.addForm}>
            <div className={styles.addLabel}>New {view==='tasks'?'Task':'Reminder'}</div>
            <input ref={titleRef} className={styles.addInput} placeholder="What needs to get done?"
              value={newItem.title} onChange={e=>setNewItem(p=>({...p,title:e.target.value}))}
              onKeyDown={e=>e.key==='Enter'&&save()}/>
            <input className={styles.addInput} placeholder="Note (optional)"
              value={newItem.note} onChange={e=>setNewItem(p=>({...p,note:e.target.value}))}
              style={{fontSize:13,color:P.chestnut}}/>
            <div className={styles.addRow}>
              <div className={styles.priGroup}>
                {['high','medium','low'].map(p=>(
                  <button key={p} className={styles.priToggle}
                    onClick={()=>setNewItem(n=>({...n,priority:p}))}
                    style={{
                      background: newItem.priority===p ? PRIORITY_META[p].color : 'transparent',
                      color: newItem.priority===p ? '#fff' : P.chestnut,
                    }}>
                    {p.charAt(0).toUpperCase()+p.slice(1)}
                  </button>
                ))}
              </div>
              <select className={styles.addSelect} value={newItem.source}
                onChange={e=>setNewItem(p=>({...p,source:e.target.value}))}>
                <option value="manual">✏ Manual</option>
                <option value="email">✉ Email</option>
              </select>
              <input type="date" className={styles.addSelect} value={newItem.due_date}
                onChange={e=>setNewItem(p=>({...p,due_date:e.target.value}))}/>
            </div>
            <div className={styles.addActions}>
              <button className={styles.addSaveBtn} onClick={save} disabled={saving}>
                {saving ? 'Saving…' : `Add ${view==='tasks'?'Task':'Reminder'}`}
              </button>
              <button className={styles.addCancelBtn} onClick={()=>setShowAdd(false)}>Cancel</button>
            </div>
          </div>
        )}

        {/* Due today strip */}
        {view==='tasks' && !search && priFilter==='all' && (()=>{
          const todayTasks = items.filter(t=>t.kind==='task'&&!t.done&&t.due_date===today)
          if (!todayTasks.length) return null
          return (
            <div className={styles.todayStrip}>
              <div className={styles.todayLabel}>Due Today · {todayTasks.length} task{todayTasks.length>1?'s':''}</div>
              {todayTasks.map(t=>(
                <div key={t.id} className={styles.todayRow}>
                  <button className={styles.todayCheck}
                    onClick={()=>toggle(t)}
                    style={{borderColor:PRIORITY_META[t.priority].color}}/>
                  <span className={styles.todayTitle}>{t.title}</span>
                  {t.source==='email'&&<span className={styles.badge} style={{color:P.chestnut,background:P.blushBg}}>✉ Email</span>}
                </div>
              ))}
            </div>
          )
        })()}

        {loading ? (
          <div className={styles.emptyState}>
            <div style={{fontSize:14,color:P.blush}}>Loading your tasks…</div>
          </div>
        ) : (
          <>
            {['high','medium','low'].map(p=><Section key={p} priority={p} items={byPri(p)}/>)}
            {visible.length===0&&(
              <div className={styles.emptyState}>
                <div style={{fontSize:36,marginBottom:10}}>✓</div>
                <div style={{fontSize:14,fontWeight:700,color:P.rose}}>
                  {search ? 'No matches found' : 'Nothing here'}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* FAB */}
      <button className={styles.fab}
        onClick={()=>{ setShowAdd(s=>!s); setNewItem(p=>({...p,kind:view==='tasks'?'task':'reminder'})) }}
        style={{ background: showAdd ? P.rose : P.burgundy }}>
        {showAdd ? '✕' : '+'}
      </button>
    </div>
  )
}
