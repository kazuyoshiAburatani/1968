"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { JoinSchema, checkBirthday } from "@/lib/validation/profile";
import { schoolYearOfBirth } from "@/lib/school-year";
import { takeDraft } from "@/lib/draft";
import { isFoundingWindow } from "@/lib/launch";

// 30 秒登録。
//
// 旧フローは「メールアドレス → 確認メール → リンクを踏む → 戻ってくる → プロフィール入力」で、
// 検証では 6 ペルソナ中 6 人がここに到達する前か途中で離脱した。
// 決定的だったのは次の 3 点で、すべて取り除いてある。
//   ・パスワードを作らせる（「絶対忘れるから」）
//   ・メールアドレスを渡させる（会員 2 名のサイトに渡す理由がない）
//   ・生年月日を口座照合と同じ情報として警戒される（金融機関勤務ペルソナ）
//
// 代わりに Supabase の匿名サインインを使い、ニックネームと生年月日だけで席を用意する。
// メールはあとから任意で紐付けられ、その時点で端末変更後も引き継げるようになる。

export async function joinAnonymously(formData: FormData) {
  const parsed = JoinSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(
      `/join?error=${encodeURIComponent(
        parsed.error.issues[0]?.message ?? "入力を確認してください",
      )}`,
    );
  }
  const input = parsed.data;

  const birthday = checkBirthday(
    input.birth_year,
    input.birth_month,
    input.birth_day,
  );
  if (!birthday.ok) {
    redirect(`/join?error=${encodeURIComponent(birthday.message)}`);
  }

  const supabase = await createSupabaseServerClient();

  // すでにログイン中なら、プロフィールだけ作って戻す
  const {
    data: { user: existing },
  } = await supabase.auth.getUser();

  let userId = existing?.id ?? null;

  if (!userId) {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      console.error("[join] signInAnonymously failed:", error?.message);
      // 匿名サインインが Supabase 側で無効になっていると必ずここに来る。
      // ダッシュボードの Authentication → Sign In / Providers で有効化が必要。
      redirect(
        `/join?error=${encodeURIComponent(
          "登録の受付に失敗しました。少し時間をおいてお試しください。",
        )}`,
      );
    }
    userId = data.user.id;
  }

  // プロフィール作成。RLS を確実に通すため service_role で入れる
  // （匿名ユーザーのセッションが確立した直後で、クッキーがまだ往復していないため）
  const admin = getSupabaseAdminClient();

  // public.users はトリガーで作られるが、匿名の場合は取りこぼしがありうるので保険を張る
  //
  // 創設メンバーについて。
  // 締切（lib/launch.ts の FOUNDING_MEMBER_UNTIL）までに席をつくった人には、
  // ここで自動的に称号を付ける。種火メンバーに声をかけるとき
  // 「いま入れば創設メンバーです」と言えるようにするため。
  // 手で付けて回る作りだと、30人ぶんの手間で運用が止まる。
  //
  // 締切を過ぎたら is_founding_member を渡さない。渡さなければ既存の値は
  // 触られないので、すでに称号を持っている人から取り上げてしまうことはない。
  const founding = isFoundingWindow();
  await admin.from("users").upsert(
    {
      id: userId,
      membership_rank: "member",
      status: "active",
      ...(founding
        ? {
            is_founding_member: true,
            founding_member_since: new Date().toISOString(),
          }
        : {}),
    },
    { onConflict: "id" },
  );

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      user_id: userId,
      nickname: input.nickname,
      birth_year: input.birth_year,
      birth_month: input.birth_month,
      birth_day: input.birth_day,
    },
    { onConflict: "user_id" },
  );

  if (profileError) {
    console.error("[join] profile upsert failed:", profileError.message);
    redirect(
      `/join?error=${encodeURIComponent(
        "保存に失敗しました。時間をおいてお試しください。",
      )}`,
    );
  }

  // 席をつくる前に書いていた文章があれば、そのまま投稿して元の場所へ返す。
  // 「書いたのに消えた」を絶対に起こさないための処理。
  const draft = await takeDraft();
  if (draft) {
    const { error: draftError } = await admin.from("topic_responses").insert({
      topic_id: draft.topicId,
      user_id: userId,
      body: draft.body,
      media: [],
      parent_response_id: draft.parentResponseId ?? null,
    });
    if (draftError) {
      console.error("[join] draft post failed:", draftError.message);
    } else {
      redirect(`${draft.returnPath}?posted=1&welcome=1`);
    }
  }

  const schoolYear = schoolYearOfBirth(
    input.birth_year,
    input.birth_month,
    input.birth_day,
  );

  redirect(`/join/done?sy=${schoolYear}`);
}

// 匿名のまま使っている人が、あとからメールを紐付けて引き継げるようにする。
// 「機種変更しても消えない」ことだけが目的で、これをもって権限は変わらない。
export async function linkEmail(formData: FormData) {
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim().toLowerCase() : "";

  if (!email || !email.includes("@")) {
    redirect(`/mypage?error=${encodeURIComponent("メールアドレスを確認してください")}`);
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/join");

  const { error } = await supabase.auth.updateUser({ email });

  if (error) {
    console.error("[join/linkEmail]", error.message);
    if (/already/i.test(error.message)) {
      redirect(
        `/mypage?error=${encodeURIComponent("そのメールアドレスは既に使われています")}`,
      );
    }
    redirect(
      `/mypage?error=${encodeURIComponent("登録できませんでした。時間をおいてお試しください")}`,
    );
  }

  redirect("/mypage?email_sent=1");
}
