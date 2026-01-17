import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

    // Debug logging
    console.log('🔍 Supabase Client Debug:')
    console.log('  URL:', supabaseUrl)
    console.log('  Key (first 20 chars):', supabaseAnonKey.substring(0, 20))
    console.log('  Is placeholder URL?', supabaseUrl.includes('placeholder-project'))
    console.log('  Is placeholder key?', supabaseAnonKey.includes('placeholder-key'))

    // Return a mock client if credentials are not configured
    if (!supabaseUrl || !supabaseAnonKey ||
        supabaseUrl.includes('placeholder-project') ||
        supabaseUrl.includes('your-project-url') ||
        supabaseAnonKey.includes('placeholder-key') ||
        supabaseAnonKey.includes('your-anon-key')) {
        console.log('⚠️ Using MOCK Supabase client (credentials not configured)')
        // Return a minimal mock client for development
        return {
            auth: {
                getSession: async () => ({ data: { session: null }, error: null }),
                getUser: async () => ({ data: { user: null }, error: null }),
                signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
                signUp: async () => ({ data: null, error: { message: 'Supabase not configured' } }),
                signOut: async () => ({ error: null }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            },
            from: () => ({
                select: () => ({ eq: () => ({ single: () => ({}) }) }),
                insert: () => ({}),
                update: () => ({}),
                delete: () => ({}),
            }),
        } as any
    }

    console.log('✅ Using REAL Supabase client')
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
