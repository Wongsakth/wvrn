// @ts-nocheck
'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import { X, Heart, MapPin, List } from 'lucide-react'
import type { Event } from '@/types'

// ── Lat/Lng ของทุกจังหวัดในไทย ─────────────────────────────────────────────
const PROVINCE_COORDS: Record<string, [number, number]> = {
  'กรุงเทพมหานคร': [13.7563, 100.5018],
  'กาญจนบุรี':     [14.0023, 99.5328],
  'จันทบุรี':      [12.6105, 102.1039],
  'ฉะเชิงเทรา':   [13.6904, 101.0779],
  'ชลบุรี':        [13.3611, 100.9847],
  'ชัยนาท':        [15.1851, 100.1251],
  'ตราด':          [12.2427, 102.5173],
  'นครนายก':      [14.2069, 101.2131],
  'นครปฐม':       [13.8199, 100.0624],
  'นนทบุรี':      [13.8622, 100.5133],
  'ปทุมธานี':      [14.0208, 100.5250],
  'ประจวบคีรีขันธ์': [11.8126, 99.7975],
  'ปราจีนบุรี':    [14.0518, 101.3707],
  'พระนครศรีอยุธยา': [14.3692, 100.5877],
  'เพชรบุรี':      [13.1119, 99.9399],
  'ระยอง':         [12.6814, 101.2816],
  'ราชบุรี':       [13.5282, 99.8134],
  'ลพบุรี':        [14.7996, 100.6534],
  'สมุทรปราการ':  [13.5991, 100.5998],
  'สมุทรสงคราม':  [13.4098, 100.0022],
  'สมุทรสาคร':    [13.5475, 100.2747],
  'สระแก้ว':      [13.8240, 102.0645],
  'สระบุรี':       [14.5289, 100.9103],
  'สิงห์บุรี':     [14.8905, 100.3968],
  'สุพรรณบุรี':   [14.4745, 100.1178],
  'อ่างทอง':      [14.5896, 100.4549],
  'กำแพงเพชร':    [16.4827, 99.5226],
  'เชียงราย':     [19.9105, 99.8406],
  'เชียงใหม่':    [18.7883, 98.9853],
  'ตาก':           [16.8798, 99.1257],
  'นครสวรรค์':    [15.7030, 100.1374],
  'น่าน':          [18.7756, 100.7930],
  'พะเยา':        [19.1665, 99.9019],
  'พิจิตร':       [16.4416, 100.3491],
  'พิษณุโลก':     [16.8211, 100.2659],
  'เพชรบูรณ์':    [16.4191, 101.1588],
  'แพร่':         [18.1445, 100.1403],
  'แม่ฮ่องสอน':   [19.3023, 97.9654],
  'ลำปาง':        [18.2888, 99.4925],
  'ลำพูน':        [18.5744, 98.9869],
  'สุโขทัย':      [17.0068, 99.8265],
  'อุตรดิตถ์':    [17.6202, 100.0993],
  'อุทัยธานี':    [15.3835, 100.0248],
  'กาฬสินธุ์':    [16.4314, 103.5058],
  'ขอนแก่น':      [16.4419, 102.8360],
  'ชัยภูมิ':      [15.8068, 102.0317],
  'นครพนม':       [17.3923, 104.7751],
  'นครราชสีมา':   [14.9799, 102.0978],
  'บึงกาฬ':       [18.3609, 103.6466],
  'บุรีรัมย์':    [14.9950, 103.1025],
  'มหาสารคาม':    [16.0132, 103.1615],
  'มุกดาหาร':     [16.5425, 104.7236],
  'ยโสธร':        [15.7924, 104.1452],
  'ร้อยเอ็ด':     [16.0538, 103.6520],
  'เลย':           [17.4860, 101.7223],
  'ศรีสะเกษ':     [15.1186, 104.3220],
  'สกลนคร':       [17.1661, 104.1486],
  'สุรินทร์':     [14.8823, 103.4937],
  'หนองคาย':      [17.8782, 102.7415],
  'หนองบัวลำภู':  [17.2218, 102.4260],
  'อำนาจเจริญ':   [15.8656, 104.6257],
  'อุดรธานี':     [17.4138, 102.7872],
  'อุบลราชธานี':  [15.2287, 104.8563],
  'กระบี่':       [8.0863, 98.9063],
  'ชุมพร':        [10.4930, 99.1800],
  'ตรัง':         [7.5591, 99.6114],
  'นครศรีธรรมราช': [8.4325, 99.9630],
  'นราธิวาส':     [6.4254, 101.8253],
  'พัทลุง':       [7.6165, 100.0742],
  'พังงา':        [8.4510, 98.5250],
  'ภูเก็ต':       [7.8804, 98.3923],
  'ยะลา':         [6.5415, 101.2806],
  'ระนอง':        [9.9529, 98.6084],
  'สงขลา':        [7.1756, 100.6142],
  'สตูล':         [6.6238, 100.0674],
  'สุราษฎร์ธานี': [9.1382, 99.3217],
}

interface Props {
  events:      any[]
  followedIds: Set<string>
  onClose:     () => void
}

export default function ConcertMap({ events, followedIds, onClose }: Props) {
  const mapRef    = useRef<any>(null)
  const mapElRef  = useRef<HTMLDivElement>(null)
  const markersRef = useRef<any[]>([])
  const [filter, setFilter] = useState<'all' | 'followed' | 'today'>('all')
  const [selectedProv, setSelectedProv] = useState<string | null>(null)
  const [leafletLoaded, setLeafletLoaded] = useState(false)

  // Group events by province
  const provinceMap = useMemo(() => {
    const map = new Map<string, any[]>()
    const today = new Date().toISOString().slice(0, 10)

    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const monthStr = startOfMonth.toISOString().slice(0, 10)

    let evs = events.filter(e => !e.deleted_at && e.start_date >= monthStr)

    if (filter === 'followed') {
      evs = evs.filter(e =>
        e.artists?.some((a: any) => followedIds.has(a.id))
      )
    } else if (filter === 'today') {
      evs = evs.filter(e => e.start_date?.slice(0, 10) === today)
    }

    for (const ev of evs) {
      const prov = ev.venue?.province || ev.province
      if (!prov || !PROVINCE_COORDS[prov]) continue
      if (!map.has(prov)) map.set(prov, [])
      map.get(prov)!.push(ev)
    }
    return map
  }, [events, filter, followedIds])

  // Load Leaflet dynamically
  useEffect(() => {
    if (typeof window === 'undefined') return
    if ((window as any).L) { setLeafletLoaded(true); return }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
    document.head.appendChild(link)
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
    script.onload = () => setLeafletLoaded(true)
    document.head.appendChild(script)
  }, [])

  // Init map
  useEffect(() => {
    if (!leafletLoaded || !mapElRef.current) return
    const L = (window as any).L
    if (mapRef.current) return
    mapRef.current = L.map(mapElRef.current, {
      center: [13.0, 101.5],
      zoom: 5.5,
      zoomControl: true,
      attributionControl: false,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18 }).addTo(mapRef.current)
  }, [leafletLoaded])

  // Update markers
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current) return
    const L = (window as any).L
    markersRef.current.forEach(m => mapRef.current.removeLayer(m))
    markersRef.current = []

    provinceMap.forEach((evs, prov) => {
      const [lat, lng] = PROVINCE_COORDS[prov]
      const hasFollow  = evs.some(e => e.artists?.some((a: any) => followedIds.has(a.id)))
      const allFollow  = evs.every(e => e.artists?.some((a: any) => followedIds.has(a.id)))
      const count      = evs.length
      const size       = count >= 5 ? 38 : count >= 3 ? 30 : 24
      const color      = allFollow ? '#6366F1' : '#EF9F27'
      const ring       = hasFollow
        ? `box-shadow:0 0 0 3px rgba(99,102,241,.35),0 2px 8px rgba(99,102,241,.4);`
        : `box-shadow:0 2px 8px rgba(239,159,39,.45);`
      const heartBadge = hasFollow && !allFollow
        ? `<div style="position:absolute;top:-5px;right:-5px;width:16px;height:16px;border-radius:50%;background:#6366F1;display:flex;align-items:center;justify-content:center;font-size:9px;color:white;border:2px solid white;">♥</div>`
        : ''

      const icon = L.divIcon({
        className: '',
        html: `<div style="position:relative;width:${size}px;height:${size}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;color:white;font-size:${size >= 38 ? 13 : 11}px;font-weight:500;font-family:sans-serif;${ring}border:2.5px solid white;">${count}${heartBadge}</div>`,
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
        popupAnchor: [0, -(size/2 + 8)],
      })

      const followEvs = evs.filter(e => e.artists?.some((a: any) => followedIds.has(a.id)))
      const popupContent = `
        <div style="font-family:sans-serif;min-width:180px;max-width:220px;">
          <div style="font-size:13px;font-weight:500;color:#1a1a1a;margin-bottom:8px;display:flex;align-items:center;gap:6px;">
            ${prov}
            <span style="font-size:10px;background:${hasFollow ? 'rgba(99,102,241,.15)' : 'rgba(239,159,39,.15)'};color:${hasFollow ? '#6366F1' : '#ba7517'};padding:2px 7px;border-radius:99px;">${evs.length} งาน${followEvs.length > 0 ? ` · ♥ ${followEvs.length}` : ''}</span>
          </div>
          ${evs.slice(0, 4).map(e => {
            const isF = e.artists?.some((a: any) => followedIds.has(a.id))
            const artistNames = e.artists?.map((a: any) => a.name).join(', ') || ''
            return `
              <div style="padding:5px 0;border-bottom:0.5px solid #f0ece6;">
                <div style="font-size:10px;color:${isF ? '#6366F1' : '#EF9F27'};font-weight:500;">${e.start_date?.slice(0,10)}</div>
                <div style="font-size:11px;color:#333;margin-top:1px;line-height:1.35;">${e.title}</div>
                ${isF ? `<div style="font-size:9px;color:#6366F1;background:rgba(99,102,241,.1);padding:1px 5px;border-radius:99px;display:inline-block;margin-top:2px;">♥ ${artistNames}</div>` : `<div style="font-size:10px;color:#888;margin-top:1px;">${artistNames}</div>`}
              </div>
            `
          }).join('')}
          ${evs.length > 4 ? `<div style="font-size:10px;color:#888;padding-top:4px;">+${evs.length - 4} งานเพิ่มเติม...</div>` : ''}
        </div>
      `

      const marker = L.marker([lat, lng], { icon })
        .addTo(mapRef.current)
        .bindPopup(popupContent, { maxWidth: 240, minWidth: 190 })
        .on('click', () => setSelectedProv(prov))

      markersRef.current.push(marker)
    })
  }, [provinceMap, leafletLoaded, followedIds])

  const selectedEvents = selectedProv ? (provinceMap.get(selectedProv) || []) : []
  const totalEvents    = Array.from(provinceMap.values()).reduce((s, e) => s + e.length, 0)
  const totalProvs     = provinceMap.size

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'var(--surface-0)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'var(--surface-1)',
        borderBottom: '0.5px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <MapPin size={18} style={{ color: 'var(--accent)' }} />
          <div>
            <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>Concert Map</p>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{totalEvents} งาน · {totalProvs} จังหวัด</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 5 }}>
            {([
              { id: 'all',      label: 'ทั้งหมด' },
              { id: 'followed', label: '♥ ติดตาม' },
              { id: 'today',    label: 'วันนี้' },
            ] as const).map(f => (
              <button key={f.id} onClick={() => setFilter(f.id)}
                style={{
                  fontSize: 11, padding: '3px 10px', borderRadius: 99,
                  border: `0.5px solid ${filter === f.id ? (f.id === 'followed' ? '#6366F1' : 'var(--accent)') : 'var(--border)'}`,
                  background: filter === f.id ? (f.id === 'followed' ? '#6366F1' : 'var(--accent)') : 'transparent',
                  color: filter === f.id ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                }}>
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%',
            border: '0.5px solid var(--border)',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </div>

      {/* Legend bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        padding: '6px 16px',
        background: 'var(--surface-0)',
        borderBottom: '0.5px solid var(--border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#EF9F27', border: '2px solid white', boxShadow: '0 2px 6px rgba(239,159,39,.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 500 }}>3</div>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>งานทั่วไป</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#6366F1', border: '2px solid white', boxShadow: '0 0 0 2px rgba(99,102,241,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'white', fontWeight: 500 }}>2</div>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>ศิลปินที่ติดตาม</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ position: 'relative', width: 20, height: 20 }}>
            <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#EF9F27', border: '2px solid white', boxShadow: '0 0 0 2px rgba(99,102,241,.3)' }} />
            <div style={{ position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: '50%', background: '#6366F1', border: '1.5px solid white', fontSize: 7, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>♥</div>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>มีทั้งคู่</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>ขนาดหมุด = จำนวนงาน · กดหมุดเพื่อดูรายละเอียด</span>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Map */}
        <div ref={mapElRef} style={{ flex: 1 }} />

        {/* Side panel — ถ้า select จังหวัด */}
        {selectedProv && selectedEvents.length > 0 && (
          <div style={{
            width: 280, background: 'var(--surface-1)',
            borderLeft: '0.5px solid var(--border)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 14px',
              borderBottom: '0.5px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{selectedProv}</p>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{selectedEvents.length} งาน</p>
              </div>
              <button onClick={() => setSelectedProv(null)} style={{
                background: 'transparent', border: 'none', cursor: 'pointer', padding: 4,
              }}>
                <X size={14} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {selectedEvents.map(ev => {
                const isF = ev.artists?.some((a: any) => followedIds.has(a.id))
                const artistNames = ev.artists?.map((a: any) => a.name).join(', ') || ''
                return (
                  <a key={ev.id} href={`/events/${ev.slug || ev.id}`}
                    style={{
                      display: 'block', padding: '8px 14px 10px',
                      borderBottom: '0.5px solid var(--border)',
                      borderLeft: `2px solid ${isF ? '#6366F1' : 'transparent'}`,
                      background: isF ? 'rgba(99,102,241,.03)' : 'transparent',
                      textDecoration: 'none',
                      transition: 'background 0.1s',
                    }}>
                    <p style={{ fontSize: 10, color: isF ? '#6366F1' : 'var(--accent)', fontWeight: 500 }}>
                      {ev.start_date?.slice(0, 10)}
                      {ev.start_time ? ` · ${ev.start_time.slice(0, 5)}` : ''}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-primary)', marginTop: 2, lineHeight: 1.4 }}>{ev.title}</p>
                    {artistNames && (
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{artistNames}</p>
                    )}
                    {ev.venue?.name && (
                      <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 1 }}>📍 {ev.venue.name}</p>
                    )}
                    {isF && (
                      <span style={{
                        fontSize: 9, color: '#6366F1',
                        background: 'rgba(99,102,241,.1)',
                        padding: '1px 6px', borderRadius: 99,
                        display: 'inline-block', marginTop: 4,
                      }}>♥ ติดตามอยู่</span>
                    )}
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
