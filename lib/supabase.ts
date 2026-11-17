import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let browser: SupabaseClient | null = null;
/** 브라우저용 (로그인 세션 유지) */
export function sb(): SupabaseClient {
  if (!browser) browser = createClient(url, key);
  return browser;
}
/** 서버 라우트용 (세션 없음, 익명 권한 = RLS 공개 범위만) */
export function sbServer(): SupabaseClient {
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
