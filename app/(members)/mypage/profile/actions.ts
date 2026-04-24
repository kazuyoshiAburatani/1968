"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/require-session";
import { ProfileUpdateSchema } from "@/lib/validation/profile";

export async function updateProfile(formData: FormData) {
  const parsed = ProfileUpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    redirect(`/mypage/profile?error=${encodeURIComponent(first.message)}`);
  }

  const { supabase, user } = await requireSession();

  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("user_id", user.id);

  if (error) {
    console.error("[profile-edit] update failed:", error.message);
    redirect(
      `/mypage/profile?error=${encodeURIComponent("更新に失敗しました、時間をおいてお試しください")}`,
    );
  }

  revalidatePath("/mypage");
  revalidatePath("/mypage/profile");
  redirect("/mypage/profile?saved=1");
}
