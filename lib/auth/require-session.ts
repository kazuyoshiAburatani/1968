import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// サーバーサイドでセッションを取得し、未ログインなら /login にリダイレクトする。
// Server Component、Server Action、Route Handler のいずれからも呼び出せる。
// 戻り値の supabase クライアントはそのまま後続クエリに使える（セッション読み込み済み）。
export async function requireSession() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return { supabase, user };
}
