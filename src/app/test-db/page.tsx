'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function TestDB() {
  const [status, setStatus] = useState('กำลังเชื่อมต่อ...')
  const [artists, setArtists] = useState<any[]>([])

  useEffect(() => {
    async function test() {
      try {
        const sb = createClient()
        const { data, error } = await sb.from('artists').select('*')
        if (error) throw error
        setArtists(data || [])
        setStatus('✅ เชื่อมต่อ Supabase สำเร็จ!')
      } catch (err: any) {
        setStatus('❌ Error: ' + err.message)
      }
    }
    test()
  }, [])

  return (
    <div style={{ padding: 32, fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: 20, marginBottom: 16 }}>WVRN — DB Connection Test</h1>
      <p style={{ fontSize: 16, marginBottom: 24 }}>{status}</p>
      {artists.length > 0 && (
        <div>
          <p style={{ marginBottom: 8 }}>ศิลปินในฐานข้อมูล ({artists.length} คน):</p>
          <ul>
            {artists.map(a => (
              <li key={a.id}>• {a.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}