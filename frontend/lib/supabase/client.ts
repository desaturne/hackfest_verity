import { createClient, SupabaseClient } from "@supabase/supabase-js"

let cachedClient: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null
  if (cachedClient) return cachedClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    console.warn(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Auth will fail until you add them to your environment.",
    )
    return null
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      autoRefreshToken: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  })

  return cachedClient
}

export default getSupabaseClient
