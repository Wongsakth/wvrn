'use client'
import { useState, useEffect } from 'react'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'
import { cn, PROVINCES } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import type { EventFilters, Genre, EventType } from '@/types'

const EVENT_TYPES: { id: EventType; label: string }[] = [
  { id: 'concert',    label: 'Concert'    },
  { id: 'festival',   label: 'Festival'   },
  { id: 'acoustic',   label: 'Acoustic'   },
  { id: 'showcase',   label: 'Showcase'   },
  { id: 'fanmeeting', label: 'Fan Meeting' },
]

interface Props {
  filters:    EventFilters
  onChange:   (f: EventFilters) => void
  totalCount: number
}

export default function FilterBar({ filters, onChange, totalCount }: Props) {
  const [expanded,  setExpanded]  = useState(false)
  const [genreList, setGenreList] = useState<{id:string;label_th:string;label_en:string}[]>([])
  const sb = createClient()

  useEffect(() => {
    sb.from('genres').select('id,label_th,label_en,category').order('category').order('label_en')
      .then(({ data }) => setGenreList(data || []))
  }, [])

  function chip(label: string, active: boolean, onClick: () => void) {
    return (
      <button
        key={label}
        onClick={onClick}
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] transition-all shrink-0',
          'border',
          active
            ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)] font-medium'
            : 'border-[var(--border)] text-secondary hover:border-[var(--border-md)]'
        )}
      >
        {label}
        {active && <X size={11} />}
      </button>
    )
  }

  const hasFilters = !!(filters.province || filters.genre || filters.eventType || filters.isFree)

  return (
    <div
      className="rounded-xl mb-4 p-3"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
    >
      {/* Top row */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setExpanded(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border transition-all shrink-0',
            expanded || hasFilters
              ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]'
              : 'border-[var(--border)] text-secondary'
          )}
        >
          <SlidersHorizontal size={12} />
          กรอง
          <ChevronDown size={11} className={cn('transition-transform', expanded && 'rotate-180')} />
        </button>

        {/* Quick chips */}
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1">
          {chip('ทั้งหมด', !hasFilters, () => onChange({}))}
          {chip('ฟรี', !!filters.isFree, () => onChange({ ...filters, isFree: filters.isFree ? undefined : true }))}
          {genreList.slice(0, 5).map(g =>
            chip(g.label_th, filters.genre === g.id, () =>
              onChange({ ...filters, genre: filters.genre === g.id ? undefined : (g.id as Genre) })
            )
          )}
        </div>

        <span className="text-[11px] text-muted shrink-0 ml-auto">
          {totalCount} งาน
        </span>
      </div>

      {/* Expanded filter panel */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-slide-up">

          {/* Province */}
          <div>
            <label className="block text-[10px] text-muted mb-1.5 uppercase tracking-wide font-medium">จังหวัด</label>
            <select
              value={filters.province ?? ''}
              onChange={e => onChange({ ...filters, province: e.target.value || undefined })}
              className="w-full text-[12px] rounded-lg px-2.5 py-2 outline-none"
              style={{
                background: 'var(--surface-2)',
                border:     '1px solid var(--border)',
                color:      'var(--text-primary)',
              }}
            >
              <option value="">ทุกจังหวัด</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Genre */}
          <div className="sm:col-span-2">
            <label className="block text-[10px] text-muted mb-1.5 uppercase tracking-wide font-medium">แนวเพลง</label>
            <div className="flex flex-wrap gap-1.5">
              {genreList.map(g =>
                chip(g.label_th, filters.genre === g.id, () =>
                  onChange({ ...filters, genre: filters.genre === g.id ? undefined : (g.id as Genre) })
                )
              )}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-[10px] text-muted mb-1.5 uppercase tracking-wide font-medium">ประเภทงาน</label>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.map(t =>
                chip(t.label, filters.eventType === t.id, () =>
                  onChange({ ...filters, eventType: filters.eventType === t.id ? undefined : t.id })
                )
              )}
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-[10px] text-muted mb-1.5 uppercase tracking-wide font-medium">ช่วงวันที่</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={filters.dateFrom ?? ''}
                onChange={e => onChange({ ...filters, dateFrom: e.target.value || undefined })}
                className="flex-1 text-[12px] rounded-lg px-2 py-2 outline-none"
                style={{
                  background: 'var(--surface-2)',
                  border:     '1px solid var(--border)',
                  color:      'var(--text-primary)',
                }}
              />
              <input
                type="date"
                value={filters.dateTo ?? ''}
                onChange={e => onChange({ ...filters, dateTo: e.target.value || undefined })}
                className="flex-1 text-[12px] rounded-lg px-2 py-2 outline-none"
                style={{
                  background: 'var(--surface-2)',
                  border:     '1px solid var(--border)',
                  color:      'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Reset */}
          {hasFilters && (
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button
                onClick={() => onChange({})}
                className="flex items-center gap-1.5 text-[12px] text-muted hover:text-primary transition-colors"
              >
                <X size={12} />
                ล้างตัวกรอง
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
