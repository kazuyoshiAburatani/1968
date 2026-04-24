"use server";

import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { OnboardingSchema, isValidCalendarDate } from "@/lib/validation/profile";

export async function createProfile(formData: FormData) {
  const parsed = OnboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    redirect(`/onboarding?error=${encodeURIComponent(first.message)}`);
  }
  const input = parsed.data;

  if (!isValidCalendarDate(1968, input.birth_month, input.birth_day)) {
    redirect("/onboarding?error=存在しない日付です");
  }

  const { supabase, user } = await requireSession();

  const { error } = await supabase.from("profiles").insert({
    user_id: user.id,
    nickname: input.nickname,
    birth_year: 1968,
    birth_month: input.birth_month,
    birth_day: input.birth_day,
    gender: input.gender,
    prefecture: input.prefecture,
    hometown: input.hometown,
    school: input.school,
    occupation: input.occupation,
    introduction: input.introduction,
    bio_visible: input.bio_visible,
  });

  if (error) {
    console.error("[onboarding] insert profile failed:", error.message);
    redirect(
      `/onboarding?error=${encodeURIComponent("保存に失敗しました、時間をおいてお試しください")}`,
    );
  }

  redirect("/mypage");
}
