'use client'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

type Rank = 'listener' | 'fan' | 'enthusiast' | 'rockstar' | 'maestro'

const RANKS: Record<Rank, { color: string; next: Rank | null; nextPts: number; label: string }> = {
  listener:   { color: '#94A3B8', next: 'fan',        nextPts: 50,   label: 'Listener'   },
  fan:        { color: '#60A5FA', next: 'enthusiast', nextPts: 200,  label: 'Fan'        },
  enthusiast: { color: '#A78BFA', next: 'rockstar',   nextPts: 500,  label: 'Enthusiast' },
  rockstar:   { color: '#F472B6', next: 'maestro',    nextPts: 1000, label: 'Rockstar'   },
  maestro:    { color: '#FBBF24', next: null,         nextPts: 9999, label: 'Maestro'    },
}

function NoteIcon({ rank, size = 48 }: { rank: Rank; size?: number }) {
  const c = RANKS[rank].color
  const s = size
  const ns = s * 0.18  // note head rx
  const nl = s * 0.13  // note head ry
  const sw = s * 0.055 // stroke width
  const bw = s * 0.065 // beam width

  if (rank === 'listener') return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <ellipse cx="16" cy="36" rx="9" ry="6" fill={c}/>
      <line x1="25" y1="36" x2="25" y2="10" stroke={c} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
  if (rank === 'fan') return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <ellipse cx="14" cy="37" rx="9" ry="6" fill={c}/>
      <line x1="23" y1="37" x2="23" y2="10" stroke={c} strokeWidth="3" strokeLinecap="round"/>
      <path d="M23 10 Q36 6 34 18" fill="none" stroke={c} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  )
  if (rank === 'enthusiast') return (
    <svg width={s} height={s} viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <ellipse cx="14" cy="42" rx="9" ry="6" fill={c}/>
      <ellipse cx="36" cy="48" rx="9" ry="6" fill={c}/>
      <line x1="23" y1="42" x2="23" y2="12" stroke={c} strokeWidth="3" strokeLinecap="round"/>
      <line x1="45" y1="48" x2="45" y2="18" stroke={c} strokeWidth="3" strokeLinecap="round"/>
      <line x1="23" y1="12" x2="45" y2="18" stroke={c} strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="23" y1="21" x2="45" y2="27" stroke={c} strokeWidth="3.5" strokeLinecap="round"/>
    </svg>
  )
  if (rank === 'rockstar') return (
    <svg width={s} height={s} viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <ellipse cx="14" cy="42" rx="9" ry="6" fill={c}/>
      <ellipse cx="36" cy="48" rx="9" ry="6" fill={c}/>
      <line x1="23" y1="42" x2="23" y2="10" stroke={c} strokeWidth="3" strokeLinecap="round"/>
      <line x1="45" y1="48" x2="45" y2="16" stroke={c} strokeWidth="3" strokeLinecap="round"/>
      <line x1="23" y1="10" x2="45" y2="16" stroke={c} strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="23" y1="19" x2="45" y2="25" stroke={c} strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="23" y1="28" x2="45" y2="34" stroke={c} strokeWidth="3.5" strokeLinecap="round"/>
    </svg>
  )
  // maestro
  return (
    <svg width={s} height={s} viewBox="0 0 60 60" fill="none" aria-hidden="true">
      <ellipse cx="14" cy="46" rx="9" ry="6" fill={c}/>
      <ellipse cx="38" cy="52" rx="9" ry="6" fill={c}/>
      <line x1="23" y1="46" x2="23" y2="12" stroke={c} strokeWidth="3" strokeLinecap="round"/>
      <line x1="47" y1="52" x2="47" y2="18" stroke={c} strokeWidth="3" strokeLinecap="round"/>
      <line x1="23" y1="12" x2="47" y2="18" stroke={c} strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="23" y1="21" x2="47" y2="27" stroke={c} strokeWidth="3.5" strokeLinecap="round"/>
      <line x1="23" y1="30" x2="47" y2="36" stroke={c} strokeWidth="3.5" strokeLinecap="round"/>
      <path d="M17 12 L23 4 L29 12" fill={c}/>
      <circle cx="23" cy="4" r="3" fill={c}/>
    </svg>
  )
}

interface Props {
  score:       number
  rank:        Rank
  submitted?:  number
  approved?:   number
  followed?:   number
}

export default function ScoreCard({ score, rank, submitted = 0, approved = 0, followed = 0 }: Props) {
  const [showDetail, setShowDetail] = useState(false)
  const conf     = RANKS[rank]
  const nextConf = conf.next ? RANKS[conf.next] : null
  const progress = conf.next
    ? Math.min(100, ((score - (conf.nextPts === 50 ? 0 : conf.nextPts === 200 ? 50 : conf.nextPts === 500 ? 200 : conf.nextPts === 1000 ? 500 : 0)) /
        (conf.nextPts - (conf.nextPts === 50 ? 0 : conf.nextPts === 200 ? 50 : conf.nextPts === 500 ? 200 : conf.nextPts === 1000 ? 500 : 0))) * 100)
    : 100

  // prev threshold lookup
  const THRESHOLDS: Record<Rank, number> = { listener: 0, fan: 50, enthusiast: 200, rockstar: 500, maestro: 1000 }
  const pct = conf.next
    ? Math.min(100, Math.round(((score - THRESHOLDS[rank]) / (conf.nextPts - THRESHOLDS[rank])) * 100))
    : 100

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ border: `1px solid ${conf.color}30`, background: 'var(--surface-1)' }}>

      {/* Main row */}
      <div className="flex items-center gap-4 p-4"
        style={{ background: `${conf.color}08` }}>

        {/* Note icon */}
        <NoteIcon rank={rank} size={52} />

        {/* Score */}
        <div className="flex-1 min-w-0">
          <div className="text-[28px] font-medium leading-none mb-1"
            style={{ color: conf.color }}>{score}</div>
          <div className="text-[11px] text-muted">คะแนน</div>
        </div>

        {/* Progress to next */}
        <div className="text-right shrink-0">
          {conf.next ? (
            <>
              <div className="text-[11px] text-muted mb-1">→ {nextConf?.label}</div>
              <div className="w-24 h-1.5 rounded-full overflow-hidden"
                style={{ background: 'var(--surface-3)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: conf.color }} />
              </div>
              <div className="text-[10px] text-muted mt-1">
                อีก {conf.nextPts - score} คะแนน
              </div>
            </>
          ) : (
            <div className="text-[11px]" style={{ color: conf.color }}>
              ระดับสูงสุด 👑
            </div>
          )}
        </div>
      </div>

      {/* Toggle detail */}
      <button
        onClick={() => setShowDetail(v => !v)}
        className="w-full flex items-center justify-center gap-1 py-2 text-[11px] text-muted transition-colors hover:text-primary"
        style={{ borderTop: `1px solid ${conf.color}20` }}>
        {showDetail ? <><ChevronUp size={12} /> ซ่อน</> : <><ChevronDown size={12} /> ดูรายละเอียด</>}
      </button>

      {/* Detail slide */}
      {showDetail && (
        <div className="px-4 pb-4 flex flex-col gap-2"
          style={{ borderTop: `1px solid ${conf.color}15` }}>
          {[
            { label: 'ส่งข้อมูล',          pts: submitted * 5,  count: submitted  },
            { label: 'ได้รับ Approve',      pts: approved  * 3,  count: approved   },
            { label: 'Follow / มีส่วนร่วม', pts: followed  * 1,  count: followed   },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between text-[12px] pt-2"
              style={{ borderTop: '1px solid var(--border)' }}>
              <span className="text-muted">{row.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-secondary">{row.count} ครั้ง</span>
                <span className="font-medium" style={{ color: conf.color }}>+{row.pts}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
