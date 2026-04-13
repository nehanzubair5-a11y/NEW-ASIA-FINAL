import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://quuzovthseomjhphzxvi.supabase.co';
const supabaseAnonKey = 'sb_publishable_TtGzxyrqZCKTz7cFI3enMA_4b7ic9BL';

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Secondary client specifically for signing up users without changing the current session
export const supabaseAdminAuth = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    }
  }
);
