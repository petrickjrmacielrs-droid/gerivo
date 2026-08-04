import "server-only";
import { createClient } from "@supabase/supabase-js";

export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) {
    throw new Error("Chave administrativa do Supabase não configurada. Defina SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY na Vercel.");
  }
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function normalizeUsername(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9.]/g, "")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.|\.$/g, "");
}
