import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey   = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const anonKey      = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Server-side client with service role (bypasses RLS for admin ops) */
export const supabaseAdmin = () =>
  createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

/** Server-side client with anon key for user-scoped operations */
export const supabaseServer = () =>
  createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
