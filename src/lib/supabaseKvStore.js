import { isSupabaseConfigured, supabase } from "./supabaseClient";

const TABLE_NAME = "app_kv_store";

/**
 * Lê um valor JSON por chave. Quando a tabela/chave não existe, retorna `null`.
 */
export async function readStoreJson(key) {
  if (!isSupabaseConfigured || !supabase) return { data: null, error: null };

  const { data, error, status } = await supabase
    .from(TABLE_NAME)
    .select("value")
    .eq("key", key)
    .maybeSingle();

  // maybeSingle retorna erro 406/PGRST116 quando não encontra linha.
  if (error && status !== 406 && error.code !== "PGRST116") {
    return { data: null, error };
  }

  return { data: data?.value ?? null, error: null };
}

/**
 * Persiste (upsert) um valor JSON por chave.
 */
export async function writeStoreJson(key, value) {
  if (!isSupabaseConfigured || !supabase) return { error: null };

  const { error } = await supabase.from(TABLE_NAME).upsert(
    {
      key,
      value,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" }
  );

  return { error: error ?? null };
}
