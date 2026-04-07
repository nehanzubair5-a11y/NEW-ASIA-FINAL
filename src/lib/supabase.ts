import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isValidUrl = (url: string | undefined) => {
  try {
    new URL(url || '');
    return true;
  } catch (e) {
    return false;
  }
};

const finalUrl = isValidUrl(supabaseUrl) ? supabaseUrl : 'https://placeholder-project.supabase.co';
const finalKey = supabaseAnonKey && supabaseAnonKey !== 'your_supabase_anon_key' ? supabaseAnonKey : 'placeholder-anon-key';

if (!isValidUrl(supabaseUrl) || !supabaseAnonKey || supabaseAnonKey === 'your_supabase_anon_key') {
  console.warn('Supabase URL or Anon Key is missing or invalid. Please add them to your environment variables. Using placeholders for now.');
}

export const supabase = createClient(finalUrl, finalKey);
