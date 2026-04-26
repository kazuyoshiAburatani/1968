import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth/require-session";
import { ChatOnboarding } from "@/components/onboarding/chat-onboarding";

export const metadata: Metadata = {
  title: "プロフィール作成",
};

export default async function OnboardingPage() {
  const { supabase, user } = await requireSession();

  // 既にプロフィール作成済みなら /mypage へ
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingProfile) {
    redirect("/mypage");
  }

  return <ChatOnboarding email={user.email ?? ""} />;
}
