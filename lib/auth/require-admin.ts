import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// 管理画面用、ログイン必須かつ admins テーブルに登録されていることを確認する。
// 未ログインなら /login、admin でなければ / にリダイレクト。
export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  const { data: admin } = await supabase
    .from("admins")
    .select("id, email, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!admin) redirect("/");

  return { user, admin: admin as { id: string; email: string; role: string } };
}
