import { createBrowserClient } from '@supabase/ssr'

// Supabase project credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bczfxxlnhhwrbsnspeat.supabase.co'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_IyyvUs9B45EJ_dTdtTvdiQ_n3xuj-A5'

export function createClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
  )
}

// Direct SQL execution via RPC for schema cache issues
export async function execSql(query: string, params?: any[]) {
  const supabase = createClient();
  
  try {
    // Try using rpc if available
    const { data, error } = await supabase.rpc('exec_sql', { 
      query,
      params: params || []
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (e) {
    // Fallback: return error for handling
    return { data: null, error: e };
  }
}
