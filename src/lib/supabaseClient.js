import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
/** Chave pública: nova `sb_publishable_...` ou legada `eyJ...` (anon), conforme o painel do Supabase. */
const publicKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() ||
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

/** True quando URL e chave pública estão definidas (ex.: `.env.local`). */
export const isSupabaseConfigured = Boolean(url && publicKey);

/**
 * Cliente Supabase para o browser. Use só chave **anon** ou **publishable**; nunca `service_role` no front.
 * Enquanto `isSupabaseConfigured` for false, este valor é `null` (app segue só com localStorage).
 */
export const supabase = isSupabaseConfigured ? createClient(url, publicKey) : null;
