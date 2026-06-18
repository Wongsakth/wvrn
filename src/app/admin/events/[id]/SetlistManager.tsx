// app/admin/events/[id]/SetlistManager.tsx
// จัดการ setlist ต่อ artist ต่อ event
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import {
  Music, Plus, Trash2, GripVertical, Edit2, Check, X,
  Loader2, Sparkles, ChevronDown, ChevronUp, Save,
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Song {
  id?: string
  song_title: string
  order_num: number
  duration_sec?: number
  is_cover?: boolean
  is_encore?: boolean
  note?: string
}

interface Setlist {
  id?: string
  event_id: string
  artist_id: string
  artist_name: string
  artist_image?: string
  source: string
  is_prediction: boolean
  prediction_conf?: number
  notes?: string
  songs: Song[]
}

interface Props {
  eventId: string
  eventTitle: string
  artists: { id: string; name: string; image_url?: string }[]
}

export default function SetlistManager({ eventId, eventTitle, artists }: Props) {
  const [setlists,    setSetlists]    = useState<Setlist[]>([])
  const [loading,     setLoading]     = useState(true)
  const [saving,      setSaving]      = useState<string | null>(null)
  const [predicting,  setPredicting]  = useState<string | null>(null)
  const [expanded,    setExpanded]    = useState<string | null>(null)
  const [editSong,    setEditSong]    = useState<{setlistIdx: number; songIdx: number} | null>(null)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [songCache,   setSongCache]   = useState<Record<string, string[]>>({}) // artistId → songs

  const sb = createClient()

  // ดึงชื่อเพลงทั้งหมดของศิลปินนี้จาก past setlists
  async function loadSongSuggestions(artistId: string) {
    if (songCache[artistId]) return // cache แล้ว
    const { data } = await sb
      .from('setlist_songs')
      .select('song_title, setlist:setlists!inner(artist_id)')
      .eq('setlist.artist_id', artistId)
      .order('song_title')
    const songs = [...new Set((data || []).map((s: any) => s.song_title))].sort()
    setSongCache(prev => ({ ...prev, [artistId]: songs }))
  }

  // ─── Load setlists ────────────────────────────────────────
  async function load() {
    setLoading(true)
    try {
      const { data: slData } = await sb
        .from('setlists')
        .select('*, setlist_songs(*)')
        .eq('event_id', eventId)
        .order('created_at')

      // merge กับ artists list
      const result: Setlist[] = artists.map(a => {
        const existing = slData?.find(s => s.artist_id === a.id)
        return {
          id: existing?.id,
          event_id: eventId,
          artist_id: a.id,
          artist_name: a.name,
          artist_image: a.image_url,
          source: existing?.source ?? 'manual',
          is_prediction: existing?.is_prediction ?? false,
          prediction_conf: existing?.prediction_conf,
          notes: existing?.notes ?? '',
          songs: (existing?.setlist_songs ?? [])
            .sort((a: any, b: any) => a.order_num - b.order_num)
            .map((s: any) => ({
              id: s.id,
              song_title: s.song_title,
              order_num: s.order_num,
              duration_sec: s.duration_sec,
              is_cover: s.is_cover,
              is_encore: s.is_encore,
              note: s.note,
            })),
        }
      })
      setSetlists(result)
      if (result.length === 1) setExpanded(result[0].artist_id)
    } catch (e: any) { toast.error(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [eventId])

  // ─── Save setlist ─────────────────────────────────────────
  async function saveSetlist(idx: number) {
    const sl = setlists[idx]
    setSaving(sl.artist_id)
    try {
      let setlistId = sl.id

      // upsert setlist header
      if (setlistId) {
        await sb.from('setlists').update({
          source: sl.source, is_prediction: sl.is_prediction,
          prediction_conf: sl.prediction_conf, notes: sl.notes,
          updated_at: new Date().toISOString(),
        }).eq('id', setlistId)
      } else {
        const { data, error } = await sb.from('setlists').insert({
          event_id: eventId, artist_id: sl.artist_id,
          source: sl.source, is_prediction: sl.is_prediction,
          prediction_conf: sl.prediction_conf, notes: sl.notes,
        }).select('id').single()
        if (error) throw error
        setlistId = data.id
      }

      // delete old songs then re-insert
      await sb.from('setlist_songs').delete().eq('setlist_id', setlistId)
      if (sl.songs.length > 0) {
        const { error } = await sb.from('setlist_songs').insert(
          sl.songs.map((s, i) => ({
            setlist_id: setlistId,
            song_title: s.song_title,
            order_num: i + 1,
            duration_sec: s.duration_sec || null,
            is_cover: s.is_cover || false,
            is_encore: s.is_encore || false,
            note: s.note || null,
          }))
        )
        if (error) throw error
      }

      toast.success(`บันทึก setlist ${sl.artist_name} แล้ว`)
      load()
    } catch (e: any) { toast.error('บันทึกไม่ได้: ' + e.message) }
    finally { setSaving(null) }
  }

  // ─── AI Predict ───────────────────────────────────────────
  async function predictSetlist(idx: number) {
    const sl = setlists[idx]
    setPredicting(sl.artist_id)
    try {
      const res = await fetch('/api/admin/predict-setlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artistId: sl.artist_id,
          artistName: sl.artist_name,
          eventTitle,
          eventId,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Prediction failed')

      setSetlists(prev => prev.map((s, i) => i !== idx ? s : {
        ...s,
        songs: data.songs.map((title: string, j: number) => ({
          song_title: title, order_num: j + 1,
          is_cover: false, is_encore: false,
        })),
        source: 'ai_prediction',
        is_prediction: true,
        prediction_conf: data.confidence,
      }))
      toast.success(`AI ทำนาย ${data.songs.length} เพลง (conf: ${(data.confidence * 100).toFixed(0)}%)`)
    } catch (e: any) { toast.error('Predict ไม่ได้: ' + e.message) }
    finally { setPredicting(null) }
  }

  // ─── Song helpers ─────────────────────────────────────────
  function addSong(idx: number) {
    setSetlists(prev => prev.map((s, i) => i !== idx ? s : {
      ...s,
      songs: [...s.songs, { song_title: '', order_num: s.songs.length + 1 }],
    }))
    setEditSong({ setlistIdx: idx, songIdx: setlists[idx].songs.length })
  }

  function removeSong(setlistIdx: number, songIdx: number) {
    setSetlists(prev => prev.map((s, i) => i !== setlistIdx ? s : {
      ...s,
      songs: s.songs.filter((_, j) => j !== songIdx).map((song, j) => ({ ...song, order_num: j + 1 })),
    }))
  }

  function updateSong(setlistIdx: number, songIdx: number, field: string, value: any) {
    setSetlists(prev => prev.map((s, i) => i !== setlistIdx ? s : {
      ...s,
      songs: s.songs.map((song, j) => j !== songIdx ? song : { ...song, [field]: value }),
    }))
  }

  function moveSong(setlistIdx: number, songIdx: number, dir: 'up' | 'down') {
    setSetlists(prev => prev.map((s, i) => {
      if (i !== setlistIdx) return s
      const songs = [...s.songs]
      const target = dir === 'up' ? songIdx - 1 : songIdx + 1
      if (target < 0 || target >= songs.length) return s;
      [songs[songIdx], songs[target]] = [songs[target], songs[songIdx]]
      return { ...s, songs: songs.map((song, j) => ({ ...song, order_num: j + 1 })) }
    }))
  }

  function formatDuration(sec?: number) {
    if (!sec) return ''
    return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  }

  function parseDuration(str: string): number | undefined {
    if (!str) return undefined
    const parts = str.split(':')
    if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1])
    return parseInt(str)
  }

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={20} className="animate-spin text-muted" />
    </div>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Music size={16} style={{ color: 'var(--accent)' }} />
        <h3 className="text-[15px] font-medium text-primary">Setlist</h3>
        <span className="text-[12px] text-muted">{artists.length} ศิลปิน</span>
      </div>

      {setlists.map((sl, idx) => (
        <div key={sl.artist_id} className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)', background: 'var(--surface-1)' }}>

          {/* Artist header */}
          <div className="flex items-center gap-3 px-4 py-3">
            {sl.artist_image ? (
              <img src={sl.artist_image} alt={sl.artist_name}
                className="w-9 h-9 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[12px] font-medium"
                style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                {sl.artist_name.slice(0, 2)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-primary">{sl.artist_name}</p>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted">{sl.songs.length} เพลง</span>
                {sl.is_prediction && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(124,58,237,.1)', color: '#7C3AED' }}>
                    ⚡ AI {sl.prediction_conf ? `${(sl.prediction_conf * 100).toFixed(0)}%` : ''}
                  </span>
                )}
                {sl.songs.length > 0 && !sl.is_prediction && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                    style={{ background: 'rgba(29,158,117,.1)', color: '#1D9E75' }}>
                    ✓ Confirmed
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {/* AI Predict */}
              <button
                onClick={() => predictSetlist(idx)}
                disabled={predicting === sl.artist_id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={{ background: 'rgba(124,58,237,.08)', color: '#7C3AED', border: '1px solid rgba(124,58,237,.2)' }}>
                {predicting === sl.artist_id
                  ? <><Loader2 size={11} className="animate-spin" /> กำลังทำนาย...</>
                  : <><Sparkles size={11} /> AI Predict</>}
              </button>

              {/* Save */}
              <button
                onClick={() => saveSetlist(idx)}
                disabled={saving === sl.artist_id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={{ background: 'var(--accent)', color: 'white' }}>
                {saving === sl.artist_id
                  ? <><Loader2 size={11} className="animate-spin" /> บันทึก...</>
                  : <><Save size={11} /> บันทึก</>}
              </button>

              {/* Expand */}
              <button onClick={() => setExpanded(expanded === sl.artist_id ? null : sl.artist_id)}
                className="icon-btn w-8 h-8">
                {expanded === sl.artist_id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
            </div>
          </div>

          {/* Song list */}
          {expanded === sl.artist_id && (loadSongSuggestions(sl.artist_id), true) && (
            <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}>

              {/* Notes */}
              <div className="px-4 pt-3 pb-2">
                <input value={sl.notes || ''} onChange={e => setSetlists(prev => prev.map((s, i) => i !== idx ? s : { ...s, notes: e.target.value }))}
                  placeholder="หมายเหตุ เช่น acoustic set, encore 2 เพลง..."
                  className="input-theme text-[12px] w-full" />
              </div>

              {/* Songs */}
              <div className="px-4 pb-2">
                {sl.songs.length === 0 ? (
                  <p className="text-[12px] text-muted py-3 text-center">ยังไม่มีเพลง — กด AI Predict หรือเพิ่มเอง</p>
                ) : (
                  <div className="flex flex-col gap-1 mb-2">
                    {sl.songs.map((song, songIdx) => (
                      <div key={songIdx} className="flex items-center gap-2 px-2 py-1.5 rounded-lg group"
                        style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

                        {/* Order */}
                        <span className="text-[11px] text-muted w-5 text-right shrink-0">{songIdx + 1}</span>

                        {/* Song title */}
                        {editSong?.setlistIdx === idx && editSong?.songIdx === songIdx ? (
                          <div className="flex-1 relative">
                            <input
                              value={song.song_title}
                              onChange={e => {
                                updateSong(idx, songIdx, 'song_title', e.target.value)
                                const q = e.target.value.toLowerCase()
                                const cache = songCache[sl.artist_id] || []
                                setSuggestions(q.length >= 1 ? cache.filter(s => s.toLowerCase().includes(q)).slice(0, 8) : [])
                              }}
                              onBlur={() => { setTimeout(() => { setEditSong(null); setSuggestions([]) }, 150) }}
                              onKeyDown={e => { if (e.key === 'Enter') { setEditSong(null); setSuggestions([]) } }}
                              className="w-full bg-transparent text-[13px] text-primary outline-none border-b"
                              style={{ borderColor: 'var(--accent)' }}
                              autoFocus
                            />
                            {suggestions.length > 0 && (
                              <div className="absolute left-0 top-full mt-1 z-50 rounded-xl overflow-hidden shadow-lg"
                                style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', minWidth: 200 }}>
                                {suggestions.map(s => (
                                  <button key={s}
                                    onMouseDown={() => {
                                      updateSong(idx, songIdx, 'song_title', s)
                                      setSuggestions([])
                                      setEditSong(null)
                                    }}
                                    className="w-full text-left px-3 py-2 text-[12px] text-primary hover:bg-[var(--surface-2)] transition-colors">
                                    {s}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="flex-1 text-[13px] text-primary truncate cursor-pointer"
                            onClick={() => setEditSong({ setlistIdx: idx, songIdx })}>
                            {song.song_title || <span className="text-muted">คลิกเพื่อพิมพ์ชื่อเพลง</span>}
                          </span>
                        )}

                        {/* Badges */}
                        {song.is_encore && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ background: 'rgba(245,158,11,.1)', color: '#D97706' }}>encore</span>
                        )}
                        {song.is_cover && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ background: 'rgba(99,102,241,.1)', color: '#6366F1' }}>cover</span>
                        )}
                        {song.note && (
                          <span className="text-[9px] text-muted truncate max-w-[80px] shrink-0">{song.note}</span>
                        )}

                        {/* Duration */}
                        <input
                          value={formatDuration(song.duration_sec)}
                          onChange={e => updateSong(idx, songIdx, 'duration_sec', parseDuration(e.target.value))}
                          placeholder="3:30"
                          className="w-12 bg-transparent text-[11px] text-muted outline-none text-center shrink-0"
                        />

                        {/* Move + delete (show on hover) */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button onClick={() => moveSong(idx, songIdx, 'up')} className="icon-btn w-6 h-6" disabled={songIdx === 0}>
                            <ChevronUp size={11} />
                          </button>
                          <button onClick={() => moveSong(idx, songIdx, 'down')} className="icon-btn w-6 h-6" disabled={songIdx === sl.songs.length - 1}>
                            <ChevronDown size={11} />
                          </button>
                          <button onClick={() => updateSong(idx, songIdx, 'is_encore', !song.is_encore)}
                            className="icon-btn w-6 h-6 text-[9px]" title="toggle encore"
                            style={{ color: song.is_encore ? '#D97706' : undefined }}>E</button>
                          <button onClick={() => updateSong(idx, songIdx, 'is_cover', !song.is_cover)}
                            className="icon-btn w-6 h-6 text-[9px]" title="toggle cover"
                            style={{ color: song.is_cover ? '#6366F1' : undefined }}>C</button>
                          <button onClick={() => removeSong(idx, songIdx)} className="icon-btn w-6 h-6"
                            style={{ color: '#E24B4A' }}><Trash2 size={11} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add song */}
                <button onClick={() => addSong(idx)}
                  className="flex items-center gap-1.5 text-[12px] py-2 w-full justify-center rounded-lg transition-colors hover:bg-[var(--surface-1)]"
                  style={{ color: 'var(--accent)', border: '1px dashed var(--border)' }}>
                  <Plus size={12} /> เพิ่มเพลง
                </button>
              </div>

              {/* Confirm prediction */}
              {sl.is_prediction && sl.songs.length > 0 && (
                <div className="px-4 pb-3">
                  <button
                    onClick={() => setSetlists(prev => prev.map((s, i) => i !== idx ? s : { ...s, is_prediction: false, source: 'manual' }))}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[12px] font-medium"
                    style={{ background: 'rgba(29,158,117,.08)', color: '#1D9E75', border: '1px solid rgba(29,158,117,.2)' }}>
                    <Check size={13} /> ยืนยัน Setlist นี้ว่าถูกต้อง
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
