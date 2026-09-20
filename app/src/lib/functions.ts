import { FunctionsHttpError } from '@supabase/supabase-js'

import { supabase } from './supabaseClient'

interface FunctionErrorBody {
  message?: string
}

async function extractErrorMessage(error: FunctionsHttpError): Promise<string | null> {
  try {
    const parsed = (await error.context.json()) as FunctionErrorBody
    return parsed?.message ?? null
  } catch {
    return null
  }
}

// supabase.functions.invoke() throws FunctionsHttpError for ANY non-2xx
// response and does NOT parse the body into `data` - the real
// {success:false, message} payload our functions return sits unread on
// error.context (the raw Response), so every caller doing `if (error)
// throw error` was only ever surfacing the SDK's generic "Edge Function
// returned a non-2xx status code" instead of the actual reason. This
// centralizes the fix.
export async function invokeFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })

  if (error) {
    if (error instanceof FunctionsHttpError) {
      const message = await extractErrorMessage(error)
      if (message) throw new Error(message)
    }
    throw error
  }

  return data as T
}
