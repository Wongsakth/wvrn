'use client'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function ArtistIdRedirect() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const sb = createClient()

  useEffect(() => {
    if (!id) return
    sb.from('artists').select('slug').eq('id', id).single()
      .then(({ data }) => {
        if (data?.slug) router.replace(`/artists/${data.slug}`)
        else router.replace(`/artists/${id}`)
      })
  }, [id])

  return null
}
