'use client'
import { useState, useEffect, useRef } from 'react'
import { Search, X, Loader2, Music, Calendar } from 'lucide-react'
import { expandQuery, smartSearch, highlightMatch, suggestQuery } from '@/lib/search'
import { createClient } from '@/lib/supabase'
import { cn, formatThaiDateShort } from '@/lib/utils'
import type { Artist, Event } from '@/types'

interface Props {
  onSearch:     (q: string) => void
  placeholder?: string
  className?:   string
}

interface SearchHit {
  type:  'artist' | 'event'
  score: number
  item:  Artist | Event
}

export default function SmartSearchBar({ onSearch, placeholder, className }: Props) {
  const [query,      setQuery]      = useState('')
  const [hits,       setHits]       = useState<SearchHit[]>([])
  const [loading,    setLoading]    = useState(false)
  const [open,       setOpen]       = useState(false)
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout>>()
  const sb = createClient()

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Debounced search
  useEffect(() => {
    clearTimeout(timerRef.current)
    if (!query.trim() || query.length < 2) {
      setHits([]); setOpen(false); setSuggestion(null); return
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const variants = expandQuery(query)
        const likeClause = variants.map(v => `name.ilike.%${v}%,name_en.ilike.%${v}%`).join(',')

        // Search artists (including aliases via DB function)
        const [arRes, evRes] = await Promise.all([
          sb.from('artists').select('id,name,name_en,genres,image_url').limit(20),
          sb.from('events').select('id,title,start_date,start_time,province,is_free,ticket_price_min').limit(20),
        ])

        const artists: Artist[] = arRes.data || []
        const events:  any[]    = evRes.data  || []

        // Smart search on client side
        const artistHits = smartSearch(artists, query).slice(0, 5)
        const eventHits  = smartSearch(events.map(e => ({ ...e, name: e.title })), query).slice(0, 5)

        const combined: SearchHit[] = [
          ...artistHits.map(h => ({ type: 'artist' as const, score: h.score, item: h.item as Artist })),
          ...eventHits .map(h => ({ type: 'event'  as const, score: h.score, item: h.item as Event  })),
        ].sort((a, b) => b.score - a.score).slice(0, 8)

        setHits(combined)
        setSuggestion(suggestQuery(query))
        setOpen(combined.length > 0 || !!suggestQuery(query))
      } finally {
        setLoading(false)
      }
    }, 250)
  }, [query])

  function handleSelect(hit: SearchHit) {
    if (hit.type === 'artist') {
      onSearch((hit.item as Artist).name)
    } else {
      onSearch((hit.item as any).title)
    }
    setQuery(hit.type === 'artist' ? (hit.item as Artist).name : (hit.item as any).title)
    setOpen(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSearch(query)
    setOpen(false)
  }

  function clear() {
    setQuery(''); setHits([]); setOpen(false); setSuggestion(null)
    onSearch('')
    inputRef.current?.focus()
  }

  const artistHits = hits.filter(h => h.type === 'artist')
  const eventHits  = hits.filter(h => h.type === 'event')

  return (
    <div ref={wrapRef} className={cn('relative', className)}>
      <form onSubmit={handleSubmit}>
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 transition-all"
          style={{
            background: 'var(--surface-1)',
            border: `1px solid ${open ? 'var(--accent)' : 'var(--border)'}`,
          }}
        >
          {loading
            ? <Loader2 size={15} className="text-muted shrink-0 animate-spin" />
            : <Search   size={15} className="text-muted shrink-0" />}

          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => hits.length > 0 && setOpen(true)}
            placeholder={placeholder ?? 'ค้นหาศิลปิน, งาน, สถานที่... (ไทย/อังกฤษ)'}
            className="bg-transparent text-[13px] text-primary outline-none flex-1 placeholder:text-muted"
          />

          {query && (
            <button type="button" onClick={clear}>
              <X size={14} className="text-muted" />
            </button>
          )}
        </div>
      </form>

      {/* ── Dropdown ── */}
      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden z-50 animate-slide-up"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', boxShadow: '0 8px 24px rgba(0,0,0,.15)' }}
        >

          {/* Spell suggestion */}
          {suggestion && (
            <div
              className="px-3 py-2 flex items-center gap-2 cursor-pointer"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--accent-muted)' }}
              onClick={() => { setQuery(suggestion); onSearch(suggestion); setOpen(false) }}
            >
              <Search size={12} style={{ color: 'var(--accent)' }} />
              <span className="text-[12px] text-muted">หมายความว่า</span>
              <span className="text-[12px] font-medium" style={{ color: 'var(--accent)' }}>"{suggestion}"</span>
              <span className="text-[10px] text-muted ml-auto">กด Enter</span>
            </div>
          )}

          {/* Artists */}
          {artistHits.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[9px] font-medium text-muted uppercase tracking-wider"
                style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                ศิลปิน
              </div>
              {artistHits.map((hit, i) => {
                const a = hit.item as Artist
                return (
                  <div
                    key={a.id}
                    onClick={() => handleSelect(hit)}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    {/* Avatar */}
                    {a.image_url ? (
                      <img src={a.image_url} alt={a.name}
                        className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-medium"
                        style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                        {a.name.slice(0, 2)}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[13px] font-medium text-primary"
                        dangerouslySetInnerHTML={{ __html: highlightMatch(a.name, query) }}
                      />
                      {a.name_en && (
                        <div
                          className="text-[11px] text-muted"
                          dangerouslySetInnerHTML={{ __html: highlightMatch(a.name_en, query) }}
                        />
                      )}
                    </div>

                    <div className="flex gap-1 shrink-0">
                      {(a.genres ?? []).slice(0, 2).map(g => (
                        <span key={g} className="text-[9px] px-1.5 py-0.5 rounded font-medium uppercase"
                          style={{ background: 'var(--accent-muted)', color: 'var(--accent)' }}>
                          {g}
                        </span>
                      ))}
                    </div>

                    {hit.matchType !== 'exact' && (
                      <span className="text-[9px] text-muted shrink-0">
                        {hit.matchType === 'alias' ? '~ชื่อพ้อง' : '~ใกล้เคียง'}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Events */}
          {eventHits.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-[9px] font-medium text-muted uppercase tracking-wider"
                style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                งาน / Event
              </div>
              {eventHits.map((hit) => {
                const ev = hit.item as any
                return (
                  <div
                    key={ev.id}
                    onClick={() => handleSelect(hit)}
                    className="flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors hover:bg-[var(--surface-2)]"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'var(--accent-muted)' }}>
                      <Calendar size={14} style={{ color: 'var(--accent)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[13px] font-medium text-primary truncate"
                        dangerouslySetInnerHTML={{ __html: highlightMatch(ev.title, query) }}
                      />
                      <div className="text-[11px] text-muted">
                        {ev.start_date && formatThaiDateShort(ev.start_date)}
                        {ev.province && ` · ${ev.province}`}
                      </div>
                    </div>
                    <span className="text-[11px] shrink-0"
                      style={{ color: ev.is_free ? '#5DCAA5' : 'var(--accent)' }}>
                      {ev.is_free ? 'ฟรี' : ev.ticket_price_min ? `฿${ev.ticket_price_min.toLocaleString()}` : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* No result */}
          {hits.length === 0 && !suggestion && query.length >= 2 && !loading && (
            <div className="px-4 py-5 text-center">
              <p className="text-[13px] text-muted">ไม่พบ "{query}"</p>
              <p className="text-[11px] text-muted mt-1 opacity-70">ลองพิมพ์ชื่อไทยหรืออังกฤษ</p>
            </div>
          )}

          {/* Search all */}
          {hits.length > 0 && (
            <button
              onClick={() => { onSearch(query); setOpen(false) }}
              className="w-full px-3 py-2.5 text-[12px] text-center transition-colors hover:bg-[var(--surface-2)]"
              style={{ color: 'var(--accent)', borderTop: '1px solid var(--border)' }}
            >
              ค้นหา "{query}" ทั้งหมด →
            </button>
          )}
        </div>
      )}

      <style>{`
        mark {
          background: var(--accent-muted);
          color: var(--accent);
          border-radius: 3px;
          padding: 0 2px;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}
