"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// 退会処理。
// auth.users を消すと、public.users / profiles / topic_responses / likes は
// いずれも on delete cascade で連鎖的に消える。poll_votes は user_id が
// on delete set null なので、票の総数は保たれたまま本人との結びつきだけが切れる。
export async function leaveCommunity(formData: FormData) {
  if (formData.get("confirm") !== "on") {
    redirect("/mypage/leave?error=confirm");
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const admin = getSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("[mypage/leave] deleteUser failed:", error.message);
    redirect(
      `/mypage/leave?error=${encodeURIComponent("退会の処理に失敗しました。お手数ですが support@1968.love までご連絡ください。")}`,
    );
  }

  await supabase.auth.signOut();
  redirect("/?left=1");
}
