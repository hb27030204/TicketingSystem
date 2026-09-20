import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

// Phone is the real identity now, but Supabase's own `auth.users.email`
// column is still globally unique at the DB level, and generateLink()
// (see mintSession below) needs an email to operate on. This synthetic,
// never-delivered address exists purely to drive that mechanism - the
// real, non-unique contact email lives only in profiles.email.
export function internalAuthEmail(phone10Digit: string): string {
  return `${phone10Digit}@phone.internal`
}

// MSG91 already verified the OTP by the time this is called - this just
// gets Supabase to issue a real session for a user we've independently
// confirmed, without Supabase ever sending anything itself. Verified
// this session: generateLink() returns a hashed_token without emailing
// anyone, and that token_hash can be fed straight into verifyOtp() to
// mint a session. Used for both login (existing user) and the tail end
// of signup (user just created via admin.createUser) - by the time this
// runs the auth.users row already exists either way.
export async function mintSession(admin: SupabaseClient, authEmail: string) {
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: authEmail,
  })

  if (linkError || !linkData.properties?.hashed_token) {
    throw new Error(linkError?.message || 'Could not create a session.')
  }

  const { data: verifyData, error: verifyError } = await admin.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  })

  if (verifyError || !verifyData.session) {
    throw new Error(verifyError?.message || 'Could not create a session.')
  }

  return verifyData.session
}
