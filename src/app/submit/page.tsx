// @ts-nocheck
'use client'
import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import { createClient } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { usePermission } from '@/lib/usePermission'
import { Music, Calendar, Search, Loader2, CheckCircle2, AlertCircle, Plus, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { PROVINCES } from '@/lib/utils'

type FormType = 'event' | 'artist'

export default function SubmitPage() {
  const [type,        setType]        = useState<FormType>('event')
  const [submitting,  setSubmitting]  = useState(false)
  const [submitted,   setSubmitted]   = useState(false)
  const [dupCheck,    setDupCheck]    = useState<any[]>([]) // AI dup results
  const [checking,    setChecking]    = useState(false)
  const { user, loading: authLoading } = useAuth()
  const { can } = usePermission()
  const canSubmit = can("submit_event")
  const sb = createClient()

  // Event form
  const [eForm, setEForm] = useState({
    title: '', start_date: '', venue_name: '', province: 'กรุงเทพมหานคร',
    artists: [] as string[], artist_input: '',
    ticket_url: '', description: '', is_free: false,
  })
  // Artist form
  const [aForm, setAForm] = useState({
    name: '', name_en: '', genres: [] as string[], genre_input: '',
    facebook_url: '', instagram_url: '', description: '',
  })

  // Venue search
  const [venueSearch,   setVenueSearch]   = useState('')
  const [venueResults,  setVenueResults]  = useState<any[]>([])
  const [venueLoading,  setVenueLoading]  = useState(false)
  const [showVenueList, setShowVenueList] = useState(false)

  // Artist search  
  const [artistSearch,   setArtistSearch]   = useState('')
  const [artistResults,  setArtistResults]  = useState<any[]>([])
  const [artistLoading,  setArtistLoading]  = useState(false)
  const [showArtistList, setShowArtistList] = useState(false)

  // Search venues from DB
  useEffect(() => {
    if (!venueSearch || venueSearch.length < 2) { setVenueResults([]); return }
    const t = setTimeout(async () => {
      setVenueLoading(true)
      const { data } = await sb.from('venues').select('id,name,province')
        .ilike('name', `%${venueSearch}%`)
        .is('deleted_at', null).limit(6)
      setVenueResults(data || [])
      setVenueLoading(false)
    }, 400)
    return () => clearTimeout(t)
  }, [venueSearch])

  // Search artists from DB
  useEffect(() => {
    if (!artistSearch || artistSearch.length < 2) { setArtistResults([]); return }
    const t = setTimeout(async () => {
      setArtistLoading(true)
      const { data } = await sb.from('artists').select('id,name,name_en')
        .or(`name.ilike.%${artistSearch}%,name_en.ilike.%${artistSearch}%`)
        .is('deleted_at', null).limit(6)
      setArtistResults(data || [])
      setArtistLoading(false)
    }, 400)
    return () => clearTimeout(t)
  }, [artistSearch])

  // AI Duplicate check — event
  useEffect(() => {
    if (type !== 'event' || !eForm.title || eForm.title.length < 3) { setDupCheck([]); return }
    const t = setTimeout(async () => {
      setChecking(true)
      const { data } = await sb.from('events')
        .select('id,title,start_date,venue:venues(name)')
        .ilike('title', `%${eForm.title}%`)
        .limit(3)
      setDupCheck(data || [])
      setChecking(false)
    }, 700)
    return () => clearTimeout(t)
  }, [eForm.title, type])

  // AI Duplicate check — artist
  useEffect(() => {
    if (type !== 'artist' || !aForm.name || aForm.name.length < 2) { setDupCheck([]); return }
    const t = setTimeout(async () => {
      setChecking(true)
      const { data } = await sb.from('artists')
        .select('id,name,name_en')
        .or(`name.ilike.%${aForm.name}%,name_en.ilike.%${aForm.name}%`)
        .limit(3)
      setDupCheck(data || [])
      setChecking(false)
    }, 700)
    return () => clearTimeout(t)
  }, [aForm.name, type])

  async function submitEvent() {
    if (!eForm.title || !eForm.start_date || !eForm.venue_name) {
      toast.error('กรุณากรอก ชื่องาน, วันที่ และสถานที่')
      return
    }
    setSubmitting(true)
    try {
      const { error } = await sb.from('event_submissions').insert({
        type:         'event',
        title:        eForm.title,
        event_date:   eForm.start_date,
        venue_name:   eForm.venue_name,
        province:     eForm.province,
        artist_name:  eForm.artists.join(', ') || null,
        ticket_url:   eForm.ticket_url || null,
        description:  eForm.description || null,
        status:       'pending',
        submitted_by: user?.id ?? null,
      })
      if (error) throw error
      setSubmitted(true)
      toast.success('ส่งข้อมูลเรียบร้อยแล้ว รอ Admin ตรวจสอบ')
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }

  async function submitArtist() {
    if (!aForm.name) { toast.error('กรุณากรอกชื่อศิลปิน'); return }
    setSubmitting(true)
    try {
      const { error } = await sb.from('event_submissions').insert({
        type:               'artist',
        title:              aForm.name,
        artist_name:        aForm.name,
        description:        aForm.description || null,
        status:             'pending',
        submitted_by:       user?.id ?? null,
        ai_duplicate_check: {
          name_en:       aForm.name_en,
          genres:        aForm.genres,
          facebook_url:  aForm.facebook_url,
          instagram_url: aForm.instagram_url,
        },
      })
      if (error) throw error
      setSubmitted(true)
      toast.success('ส่งข้อมูลเรียบร้อยแล้ว รอ Admin ตรวจสอบ')
    } catch (e: any) { toast.error(e.message) }
    finally { setSubmitting(false) }
  }


  // Permission guard
  if (!authLoading && (!user || !canSubmit)) return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        {!user ? (
          <>
            <p className="text-[15px] font-medium text-primary mb-4">กรุณา Login ก่อนแจ้งข้อมูล</p>
            <button onClick={() => window.location.href = '/login'} className="btn-accent py-2 px-6 text-[14px]">Login</button>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(232,0,58,.08)' }}>
              <AlertCircle size={28} style={{ color: '#E24B4A' }} />
            </div>
            <p className="text-[16px] font-medium text-primary mb-2">ไม่มีสิทธิ์เข้าถึง</p>
            <p className="text-[13px] text-muted mb-5">บัญชีของคุณยังไม่ได้รับสิทธิ์แจ้งข้อมูล<br/>กรุณาติดต่อ Admin</p>
            <button onClick={() => window.location.href = '/'} className="btn-ghost py-2 px-5 text-[13px]">กลับหน้าหลัก</button>
          </>
        )}
      </div>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: '#1D9E75' }} />
        <p className="text-[18px] font-medium text-primary mb-2">ส่งข้อมูลเรียบร้อยแล้ว!</p>
        <p className="text-[13px] text-muted mb-6">Admin จะตรวจสอบและแจ้งผลให้ทราบ</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => { setSubmitted(false); setEForm({ title:'',start_date:'',venue_name:'',province:'กรุงเทพมหานคร',artists:[],artist_input:'',ticket_url:'',description:'',is_free:false }); setAForm({ name:'',name_en:'',genres:[],genre_input:'',facebook_url:'',instagram_url:'',description:'' }) }}
            className="btn-ghost py-2 px-5 text-[13px]">ส่งอีก</button>
          <button onClick={() => window.location.href = '/'} className="btn-accent py-2 px-5 text-[13px]">กลับหน้าหลัก</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-screen-sm mx-auto px-4 py-6">

        <h1 className="text-[22px] font-medium text-primary mb-1">แจ้งข้อมูลใหม่</h1>
        <p className="text-[13px] text-muted mb-5">Admin จะตรวจสอบก่อนนำขึ้นระบบ</p>

        {/* Type tabs */}
        <div className="flex gap-1 p-1 rounded-xl mb-5"
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
          {([
            { id: 'event',  label: 'งาน Concert',  icon: Calendar },
            { id: 'artist', label: 'ศิลปินใหม่',   icon: Music    },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setType(id); setDupCheck([]) }}
              className="flex items-center gap-2 flex-1 justify-center py-2 rounded-lg text-[13px] font-medium transition-all"
              style={{
                background: type === id ? 'var(--accent)' : 'transparent',
                color: type === id ? 'var(--surface-0)' : 'var(--text-muted)',
              }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── EVENT FORM ── */}
        {type === 'event' && (
          <div className="flex flex-col gap-4">
            <Field label="ชื่องาน *">
              <div className="relative">
                <input value={eForm.title} onChange={e => setEForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="เช่น Monster Music Festival 2026"
                  className="input-theme text-[14px] pr-8" />
                {checking && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />}
              </div>
              <DupWarning items={dupCheck} type="event" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="วันที่จัดงาน *">
                <input type="date" value={eForm.start_date}
                  onChange={e => setEForm(f => ({ ...f, start_date: e.target.value }))}
                  className="input-theme text-[13px]" />
              </Field>
              <Field label="จังหวัด">
                <select value={eForm.province} onChange={e => setEForm(f => ({ ...f, province: e.target.value }))}
                  className="input-theme text-[13px]">
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
            </div>

            <Field label="สถานที่จัดงาน *">
              <div className="relative">
                <input
                  value={venueSearch || eForm.venue_name}
                  onChange={e => {
                    setVenueSearch(e.target.value)
                    setEForm(f => ({ ...f, venue_name: e.target.value }))
                    setShowVenueList(true)
                  }}
                  onFocus={() => setShowVenueList(true)}
                  onBlur={() => setTimeout(() => setShowVenueList(false), 200)}
                  placeholder="พิมพ์ค้นหาสถานที่..."
                  className="input-theme text-[14px] pr-8" />
                {venueLoading && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />}
                {showVenueList && venueResults.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden shadow-lg"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                    {venueResults.map(v => (
                      <button key={v.id} type="button"
                        className="w-full px-4 py-2.5 text-left text-[13px] hover:bg-[var(--surface-2)] transition-colors"
                        onMouseDown={() => {
                          setEForm(f => ({ ...f, venue_name: v.name }))
                          setVenueSearch('')
                          setShowVenueList(false)
                        }}>
                        <span className="text-primary">{v.name}</span>
                        {v.province && <span className="text-muted text-[11px] ml-2">{v.province}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            <Field label="ศิลปิน (optional)">
              <div className="flex gap-2 mb-2 relative">
                <div className="relative flex-1">
                  <input value={artistSearch}
                    onChange={e => { setArtistSearch(e.target.value); setShowArtistList(true) }}
                    onFocus={() => setShowArtistList(true)}
                    onBlur={() => setTimeout(() => setShowArtistList(false), 200)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && artistSearch.trim()) {
                        setEForm(f => ({ ...f, artists: [...f.artists, artistSearch.trim()] }))
                        setArtistSearch('')
                        setShowArtistList(false)
                      }
                    }}
                    placeholder="พิมพ์ค้นหาหรือชื่อศิลปิน แล้วกด Enter"
                    className="input-theme text-[13px] w-full pr-8" />
                  {artistLoading && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />}
                  {showArtistList && artistResults.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 rounded-xl overflow-hidden shadow-lg"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>
                      {artistResults.map(a => (
                        <button key={a.id} type="button"
                          className="w-full px-4 py-2.5 text-left text-[13px] hover:bg-[var(--surface-2)] transition-colors"
                          onMouseDown={() => {
                            const name = a.name_en || a.name
                            if (!eForm.artists.includes(name)) {
                              setEForm(f => ({ ...f, artists: [...f.artists, name] }))
                            }
                            setArtistSearch('')
                            setShowArtistList(false)
                          }}>
                          <span className="text-primary">{a.name}</span>
                          {a.name_en && <span className="text-muted text-[11px] ml-2">{a.name_en}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => {
                  if (artistSearch.trim()) {
                    setEForm(f => ({ ...f, artists: [...f.artists, artistSearch.trim()] }))
                    setArtistSearch('')
                  }
                }} className="btn-ghost px-3 py-2 text-[13px]"><Plus size={14} /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {eForm.artists.map((a, i) => (
                  <span key={i} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                    {a} <button onClick={() => setEForm(f => ({ ...f, artists: f.artists.filter((_,j) => j !== i) }))}><X size={10} /></button>
                  </span>
                ))}
                {eForm.artists.length === 0 && (
                  <span className="text-[11px] text-muted px-1">ยังไม่มีศิลปิน / ยังไม่ระบุ</span>
                )}
              </div>
            </Field>

            <Field label="ลิงก์ซื้อบัตร (optional)">
              <input value={eForm.ticket_url} onChange={e => setEForm(f => ({ ...f, ticket_url: e.target.value }))}
                placeholder="https://..." className="input-theme text-[13px]" />
            </Field>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={eForm.is_free}
                onChange={e => setEForm(f => ({ ...f, is_free: e.target.checked }))} />
              <span className="text-[13px] text-secondary">งานฟรี ไม่มีค่าเข้า</span>
            </label>

            <Field label="รายละเอียดเพิ่มเติม (optional)">
              <textarea value={eForm.description} onChange={e => setEForm(f => ({ ...f, description: e.target.value }))}
                placeholder="ข้อมูลเพิ่มเติม..."
                rows={3} className="input-theme text-[13px] resize-none" />
            </Field>

            <button onClick={submitEvent} disabled={submitting}
              className="btn-accent w-full py-3 text-[14px] flex items-center justify-center gap-2">
              {submitting ? <><Loader2 size={14} className="animate-spin" /> กำลังส่ง...</> : 'ส่งข้อมูลงาน'}
            </button>
          </div>
        )}

        {/* ── ARTIST FORM ── */}
        {type === 'artist' && (
          <div className="flex flex-col gap-4">
            <Field label="ชื่อศิลปิน *">
              <div className="relative">
                <input value={aForm.name} onChange={e => setAForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="ชื่อภาษาไทย หรืออังกฤษ"
                  className="input-theme text-[14px] pr-8" />
                {checking && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />}
              </div>
              <DupWarning items={dupCheck} type="artist" />
            </Field>

            <Field label="ชื่อภาษาอังกฤษ (optional)">
              <input value={aForm.name_en} onChange={e => setAForm(f => ({ ...f, name_en: e.target.value }))}
                placeholder="English name" className="input-theme text-[13px]" />
            </Field>

            <Field label="แนวเพลง (optional)">
              <div className="flex gap-2 mb-2">
                <input value={aForm.genre_input}
                  onChange={e => setAForm(f => ({ ...f, genre_input: e.target.value }))}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && aForm.genre_input.trim()) {
                      setAForm(f => ({ ...f, genres: [...f.genres, f.genre_input.trim().toLowerCase()], genre_input: '' }))
                    }
                  }}
                  placeholder="เช่น pop, rock, indie"
                  className="input-theme text-[13px] flex-1" />
                <button onClick={() => {
                  if (aForm.genre_input.trim())
                    setAForm(f => ({ ...f, genres: [...f.genres, f.genre_input.trim().toLowerCase()], genre_input: '' }))
                }} className="btn-ghost px-3 py-2 text-[13px]"><Plus size={14} /></button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {aForm.genres.map((g, i) => (
                  <span key={i} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                    {g} <button onClick={() => setAForm(f => ({ ...f, genres: f.genres.filter((_,j) => j !== i) }))}><X size={10} /></button>
                  </span>
                ))}
              </div>
            </Field>

            <Field label="Facebook / Instagram (optional)">
              <div className="flex flex-col gap-2">
                <input value={aForm.facebook_url} onChange={e => setAForm(f => ({ ...f, facebook_url: e.target.value }))}
                  placeholder="https://facebook.com/..." className="input-theme text-[13px]" />
                <input value={aForm.instagram_url} onChange={e => setAForm(f => ({ ...f, instagram_url: e.target.value }))}
                  placeholder="https://instagram.com/..." className="input-theme text-[13px]" />
              </div>
            </Field>

            <Field label="รายละเอียด (optional)">
              <textarea value={aForm.description} onChange={e => setAForm(f => ({ ...f, description: e.target.value }))}
                placeholder="ข้อมูลเพิ่มเติมเกี่ยวกับศิลปิน..."
                rows={3} className="input-theme text-[13px] resize-none" />
            </Field>

            <button onClick={submitArtist} disabled={submitting}
              className="btn-accent w-full py-3 text-[14px] flex items-center justify-center gap-2">
              {submitting ? <><Loader2 size={14} className="animate-spin" /> กำลังส่ง...</> : 'ส่งข้อมูลศิลปิน'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-muted uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function DupWarning({ items, type }: { items: any[]; type: string }) {
  if (!items.length) return null
  return (
    <div className="mt-2 rounded-xl p-3 flex gap-2"
      style={{ background: 'rgba(239,159,39,.08)', border: '1px solid rgba(239,159,39,.3)' }}>
      <AlertCircle size={14} style={{ color: '#EF9F27', flexShrink: 0, marginTop: 1 }} />
      <div>
        <p className="text-[11px] font-medium" style={{ color: '#EF9F27' }}>
          พบข้อมูลที่คล้ายกันในระบบ กรุณาตรวจสอบก่อนส่ง
        </p>
        {items.map(item => (
          <p key={item.id} className="text-[11px] text-muted mt-1">
            • {item.title || item.name}
            {item.start_date ? ` (${item.start_date})` : ''}
            {item.name_en ? ` / ${item.name_en}` : ''}
          </p>
        ))}
      </div>
    </div>
  )
}

