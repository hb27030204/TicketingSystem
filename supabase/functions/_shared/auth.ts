import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export async function getAuthedUser(req: Request, admin: SupabaseClient) {
  const authHeader = req.headers.get('Authorization') || ''
  const token = authHeader.replace(/^Bearer\s+/i, '')

  if (!token) {
    throw new Error('Not authenticated.')
  }

  const { data, error } = await admin.auth.getUser(token)
  if (error || !data.user) {
    throw new Error('Not authenticated.')
  }

  return data.user
}
