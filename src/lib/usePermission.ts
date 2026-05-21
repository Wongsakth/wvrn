// @ts-nocheck
'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { useAuth, type UserRole } from '@/lib/auth'

type PermissionMap = Record<string, boolean>

let cache: PermissionMap | null = null
let cacheRole: UserRole | null  = null

export function usePermission() {
  const { role, loading: authLoading } = useAuth()
  const [perms,   setPerms]   = useState<PermissionMap>(cache ?? {})
  const [loading, setLoading] = useState(!cache)
  const sb = createClient()

  useEffect(() => {
    if (authLoading) return
    if (cache && cacheRole === role) { setPerms(cache); setLoading(false); return }
    load()
  }, [role, authLoading])

  async function load() {
    setLoading(true)
    try {
      const { data } = await sb.from('permission_matrix').select('*')
      const map: PermissionMap = {}
      for (const row of (data || [])) {
        map[row.permission] = row[role as keyof typeof row] === true
      }
      cache     = map
      cacheRole = role
      setPerms(map)
    } catch { setPerms({}) }
    finally { setLoading(false) }
  }

  const can = useCallback((permission: string) => perms[permission] ?? false, [perms])

  return { can, loading, refresh: load }
}

