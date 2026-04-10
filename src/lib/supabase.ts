import { createClient } from '@supabase/supabase-js';

const sanitizeUrl = (val: string | undefined) => {
  if (!val) return '';
  return val.replace(/[^\x20-\x7E]/g, '').trim();
};

const sanitizeKey = (val: string | undefined) => {
  if (!val) return '';
  // Remove all whitespace and non-ASCII characters
  return val.replace(/[\s]/g, '').replace(/[^\x20-\x7E]/g, '');
};

const supabaseUrl = sanitizeUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = sanitizeKey(import.meta.env.VITE_SUPABASE_ANON_KEY);

const isValidUrl = (url: string | undefined) => {
  try {
    new URL(url || '');
    return true;
  } catch (e) {
    return false;
  }
};

export const isSupabaseConfigured = isValidUrl(supabaseUrl) && supabaseAnonKey && supabaseAnonKey !== 'your_supabase_anon_key';

const finalUrl = isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder-project.supabase.co';
const finalKey = supabaseAnonKey && supabaseAnonKey !== 'your_supabase_anon_key' ? supabaseAnonKey : 'placeholder-anon-key';

if (!isSupabaseConfigured) {
  console.warn('Supabase URL or Anon Key is missing or invalid. Please add them to your environment variables. Using placeholders for now.');
}

export const supabase = createClient(finalUrl, finalKey);

// Secondary client specifically for signing up users without changing the current session
export const supabaseAdminAuth = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  }
});
