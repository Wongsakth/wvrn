// src/lib/audit.ts
// Helper สำหรับบันทึก audit log

import { createClient } from '@/lib/supabase'

export type AuditAction =
  | 'approve'
  | 'reject'
  | 'create'
  | 'edit'
  | 'delete'
  | 'restore'

export type AuditTargetType =
  | 'event'
  | 'artist'
  | 'venue'
  | 'label'
  | 'submission'
  | 'genre'
  | 'user'

export async function logAudit({
  action,
  targetType,
  targetId,
  targetName,
  metadata,
}: {
  action:      AuditAction
  targetType:  AuditTargetType
  targetId?:   string
  targetName?: string
  metadata?:   Record<string, any>
}) {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return

    await (sb.from('audit_logs') as any).insert({
      actor_id:    user.id,
      actor_email: user.email,
      action,
      target_type: targetType,
      target_id:   targetId,
      target_name: targetName,
      metadata,
    })
  } catch (e) {
    console.error('audit log error:', e)
  }
}
