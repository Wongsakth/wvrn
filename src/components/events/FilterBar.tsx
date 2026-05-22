'use client'
import { useState, useEffect } from 'react'
import { SlidersHorizontal, X, ChevronDown, Loader2 } from 'lucide-react'
import { cn, PROVINCES } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import type { EventFilters, Genre } from '@/types'

interface Props {
  filters:       EventFilters
  onChange:      (f: EventFilters) => void
  totalCount:    number
  userProvince?: string
}

export default function FilterBar({ filters, onChange, totalCount, userProvince }: Props) {
  const [expanded,    setExpanded]    = useState(false)
  const [locLoading,  setLocLoading]  = useState(false)
  const [locError,    setLocError]    = useState('')
  const [genreList,   setGenreList]   = useState<{id:string;label_en:string;label_th:string}[]>([])
  const [categories,  setCategories]  = useState<{id:string;name:string;name_th:string}[]>([])
  const sb = createClient()

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    Promise.all([
      sb.from('genres').select('id,label_en,label_th,category').order('category').order('label_en'),
      // ดึง categories เรียงตาม event_count มากไปน้อย เฉพาะที่มี event จริง
      sb.rpc('get_categories_with_event_count', { from_date: today }),
    ]).then(([genreRes, catRes]) => {
      setGenreList(genreRes.data || [])
      setCategories((catRes.data || []).sort((a: any, b: any) => b.event_count - a.event_count))
    })
  }, [])

  function chip(label: string, active: boolean, onClick: () => void, icon?: React.ReactNode) {
    return (
      <button key={label} onClick={onClick}
        className={cn(
          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] transition-all shrink-0 border',
          active
            ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)] font-medium'
            : 'border-[var(--border)] text-secondary hover:border-[var(--border-md)]'
        )}>
        {icon}{label}{active && <X size={10} />}
      </button>
    )
  }

  async function handleNearMe() {
    if (filters.nearMe) {
      onChange({ ...filters, nearMe: undefined, province: undefined, userLat: undefined, userLng: undefined })
      return
    }
    setLocLoading(true); setLocError('')
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setLocLoading(false)
          onChange({ ...filters, nearMe: true, userLat: pos.coords.latitude, userLng: pos.coords.longitude, province: undefined })
        },
        () => {
          setLocLoading(false)
          if (userProvince) {
            onChange({ ...filters, nearMe: true, province: userProvince })
          } else {
            setLocError('ไม่ได้รับอนุญาต GPS – กรุณาเลือกจังหวัดด้านล่าง')
            setExpanded(true)
          }
        },
        { timeout: 5000 }
      )
    } else {
      setLocLoading(false)
      if (userProvince) { onChange({ ...filters, nearMe: true, province: userProvince }) }
      else { setLocError('Browser ไม่รองรับ GPS'); setExpanded(true) }
    }
  }

  const today    = new Date().toISOString().slice(0, 10)
  const weekEnd  = new Date(); weekEnd.setDate(weekEnd.getDate() + 7)
  const monthEnd = new Date(); monthEnd.setDate(monthEnd.getDate() + 30)

  function setDatePreset(p: 'today' | 'week' | 'month') {
    if (filters.datePreset === p) { onChange({ ...filters, datePreset: undefined, dateFrom: undefined, dateTo: undefined }); return }
    const dateTo = p === 'today' ? today : p === 'week' ? weekEnd.toISOString().slice(0,10) : monthEnd.toISOString().slice(0,10)
    onChange({ ...filters, datePreset: p, dateFrom: today, dateTo })
  }

  const nearLabel = filters.nearMe
    ? (filters.userLat ? '📍 GPS' : `📍 ${filters.province || userProvince || 'ใกล้ฉัน'}`)
    : '📍 ใกล้ฉัน'

  const hasFilters = !!(filters.province || filters.genre || filters.categoryId || filters.isFree || filters.nearMe || filters.datePreset)

  return (
    <div className="rounded-xl mb-4 p-3"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setExpanded(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] border transition-all shrink-0',
            expanded || hasFilters
              ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]'
              : 'border-[var(--border)] text-secondary'
          )}>
          <SlidersHorizontal size={12} />
          กรอง
          <ChevronDown size={11} className={cn('transition-transform', expanded && 'rotate-180')} />
        </button>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1">
          {chip('All', !hasFilters, () => onChange({}))}
          {chip(nearLabel, !!filters.nearMe, handleNearMe,
            locLoading ? <Loader2 size={10} className="animate-spin" /> : undefined)}
          {chip('Today',     filters.datePreset === 'today', () => setDatePreset('today'))}
          {chip('This Week', filters.datePreset === 'week',  () => setDatePreset('week'))}
          {chip('ฟรีเข้าชม', !!filters.isFree, () => onChange({ ...filters, isFree: filters.isFree ? undefined : true }))}
          {categories.slice(0, 3).map(c =>
            chip(c.name, filters.categoryId === c.id, () =>
              onChange({ ...filters, categoryId: filters.categoryId === c.id ? undefined : c.id })
            )
          )}
        </div>

        <span className="text-[11px] text-muted shrink-0 ml-auto">{totalCount} งาน</span>
      </div>

      {locError && <p className="text-[11px] mt-2 px-1" style={{ color: 'var(--accent)' }}>⚠ {locError}</p>}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-slide-up">

          {/* Province */}
          <div>
            <label className="block text-[10px] text-muted mb-1.5 uppercase tracking-wide font-medium">จังหวัด</label>
            <select value={filters.province ?? ''}
              onChange={e => onChange({ ...filters, province: e.target.value || undefined, nearMe: e.target.value ? true : undefined })}
              className="w-full text-[12px] rounded-lg px-2.5 py-2 outline-none"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <option value="">ทุกจังหวัด</option>
              {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* Event Category — from DB */}
          <div>
            <label className="block text-[10px] text-muted mb-1.5 uppercase tracking-wide font-medium">ประเภทงาน</label>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(c =>
                chip(c.name, filters.categoryId === c.id, () =>
                  onChange({ ...filters, categoryId: filters.categoryId === c.id ? undefined : c.id })
                )
              )}
            </div>
          </div>

          {/* Genre */}
          <div className="sm:col-span-2">
            <label className="block text-[10px] text-muted mb-1.5 uppercase tracking-wide font-medium">แนวเพลง</label>
            <div className="flex flex-wrap gap-1.5">
              {genreList.map(g =>
                chip(g.label_en, filters.genre === g.id, () =>
                  onChange({ ...filters, genre: filters.genre === g.id ? undefined : (g.id as Genre) })
                )
              )}
            </div>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-[10px] text-muted mb-1.5 uppercase tracking-wide font-medium">ช่วงวันที่</label>
            <div className="flex gap-1.5 mb-2">
              {(['today','week','month'] as const).map(p => (
                <button key={p} onClick={() => setDatePreset(p)}
                  className={cn('flex-1 py-1.5 rounded-lg text-[11px] border transition-all',
                    filters.datePreset === p
                      ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]'
                      : 'border-[var(--border)] text-muted')}>
                  {p === 'today' ? 'Today' : p === 'week' ? 'Week' : 'Month'}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="date" value={filters.dateFrom ?? ''}
                onChange={e => onChange({ ...filters, dateFrom: e.target.value || undefined, datePreset: undefined })}
                className="flex-1 text-[12px] rounded-lg px-2 py-2 outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <input type="date" value={filters.dateTo ?? ''}
                onChange={e => onChange({ ...filters, dateTo: e.target.value || undefined, datePreset: undefined })}
                className="flex-1 text-[12px] rounded-lg px-2 py-2 outline-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
          </div>

          {hasFilters && (
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button onClick={() => onChange({})}
                className="flex items-center gap-1.5 text-[12px] text-muted hover:text-primary transition-colors">
                <X size={12} /> ล้างตัวกรอง
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
