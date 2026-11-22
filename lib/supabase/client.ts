let _client: ReturnType<typeof import('@supabase/ssr')['createBrowserClient']> | null = null

export function createClient() {
  if (!_client) {
    // Dynamic require to avoid Turbopack edge-runtime resolution issues
     
    const { createBrowserClient } = require('@supabase/ssr')
    _client = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return _client!
}
