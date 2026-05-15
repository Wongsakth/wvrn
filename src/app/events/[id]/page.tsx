'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function EventIdRedirect() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const sb = createClient()

  useEffect(() => {
    if (!id) return
    // ถ้าเป็น UUID ให้ redirect ไป slug
    sb.from('events').select('slug').eq('id', id).single()
      .then(({ data }) => {
        if (data?.slug) router.replace(`/events/${data.slug}`)
        else router.replace(`/events/${id}`) // fallback ถ้าไม่มี slug
      })
  }, [id])

  return null
}
