'use client'
import { useState, useEffect } from 'react'
import Navbar from '@/components/layout/Navbar'
import CalendarView from '@/components/calendar/CalendarView'
import { createClient } from '@/lib/supabase'
import { Loader2 } from 'lucide-react'

export default function CalendarPage() {
  const [events,  setEvents]  = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const sb = createClient()

  useEffect(() => {
    sb.from('events')
      .select('*, venue:venues(id,name,province), event_artists(artist:artists(id,name))')
      .order('start_date', { ascending: true })
      .then(({ data }) => {
        setEvents((data || []).map((ev: any) => ({
          ...ev,
          artists: ev.event_artists?.map((ea: any) => ea.artist).filter(Boolean) ?? [],
        })))
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen pb-24 md:pb-8" style={{ background: 'var(--surface-0)' }}>
      <Navbar />
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="text-[22px] font-medium text-primary mb-5">ปฏิทิน</h1>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-muted" />
          </div>
        ) : (
          <CalendarView events={events} likedIds={new Set()} bookmarkIds={new Set()}
            onLike={() => {}} onBookmark={() => {}} />
        )}
      </div>
    </div>
  )
}
