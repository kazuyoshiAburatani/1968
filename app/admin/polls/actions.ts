"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { PollUpsertSchema } from "@/lib/validation/topic";
import { hasFile, removeImage, storeImage } from "@/lib/image-upload";
import { isValidPollIcon } from "@/lib/poll-icon";

function fail(message: string): never {
  redirect(`/admin/polls?error=${encodeURIComponent(message)}`);
}

// 選択肢の写真を受け取って保存する。
//
// 片方だけ写真がある状態は作らせない。写真のあるほうが目に入るぶん選ばれやすく、
// 「同じ学年の何割がどちらか」という数字が意味を持たなくなるため。
// DB 側にも同じ制約を置いてあるが、ここで先に止めて、分かる文言を返す。
async function readOptionImages(
  formData: FormData,
  pollId: string,
  current: { a: string | null; b: string | null },
): Promise<{ option_a_image: string | null; option_b_image: string | null }> {
  // 「字だけに戻す」が選ばれていたら、両方外して実体も消す
  if (formData.get("clear_images") === "1") {
    await removeImage("poll-media", current.a);
    await removeImage("poll-media", current.b);
    return { option_a_image: null, option_b_image: null };
  }

  const a = formData.get("option_a_photo");
  const b = formData.get("option_b_photo");
  const newA = hasFile(a);
  const newB = hasFile(b);

  if (!newA && !newB) {
    return { option_a_image: current.a, option_b_image: current.b };
  }

  // 片方だけ差し替えるのは、もう片方が既に入っているときだけ許す
  const willHaveA = newA || current.a !== null;
  const willHaveB = newB || current.b !== null;
  if (willHaveA !== willHaveB) {
    fail("選択肢の写真は、左右そろえて入れてください（片方だけにはできません）");
  }

  const uploaded: {
    option_a_image: string | null;
    option_b_image: string | null;
  } = { option_a_image: current.a, option_b_image: current.b };

  if (newA) {
    const r = await storeImage(a, "poll-media", pollId);
    if (!r.ok) fail(r.message);
    await removeImage("poll-media", current.a);
    uploaded.option_a_image = r.image.path;
  }
  if (newB) {
    const r = await storeImage(b, "poll-media", pollId);
    if (!r.ok) fail(r.message);
    await removeImage("poll-media", current.b);
    uploaded.option_b_image = r.image.path;
  }

  return uploaded;
}

// 設問の上に出す写真。こちらは 1 枚だけなので、左右そろえる制約はない。
async function readHeaderImage(
  formData: FormData,
  pollId: string,
  current: string | null,
): Promise<string | null> {
  if (formData.get("clear_header") === "1") {
    await removeImage("poll-media", current);
    return null;
  }
  const file = formData.get("header_photo");
  if (!hasFile(file)) return current;

  const r = await storeImage(file, "poll-media", pollId);
  if (!r.ok) fail(r.message);
  await removeImage("poll-media", current);
  return r.image.path;
}

function readIcon(formData: FormData): string | null {
  const raw = formData.get("icon");
  return isValidPollIcon(raw) ? raw : null;
}

function readForm(formData: FormData) {
  return {
    question: formData.get("question"),
    option_a: formData.get("option_a"),
    option_b: formData.get("option_b"),
    blurb: formData.get("blurb") ?? "",
    era: formData.get("era") ?? "",
    gender_lean: formData.get("gender_lean") ?? "both",
    // 一覧に無い値は保存しない。空文字は「自動で選ぶ」なので null にする
    icon: readIcon(formData),
    published_at: formData.get("published_at"),
    expires_at: formData.get("expires_at") ?? "",
    is_active: formData.get("is_active") ?? undefined,
  };
}

export async function createPoll(formData: FormData) {
  const parsed = PollUpsertSchema.safeParse(readForm(formData));
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  const { admin } = await requireAdmin();
  const sb = getSupabaseAdminClient();

  // 先に行を作って id を得る。写真はその id のフォルダに置くので、
  // あとから「どの二択の写真か」を辿れるようになる。
  const { data: created, error } = await sb
    .from("polls")
    .insert({ ...parsed.data, created_by: admin.id })
    .select("id")
    .single();
  if (error || !created) {
    console.error("[admin/polls/create]", error?.message);
    fail("二択の作成に失敗しました");
  }

  const images = await readOptionImages(formData, created.id, {
    a: null,
    b: null,
  });
  const headerImage = await readHeaderImage(formData, created.id, null);
  if (images.option_a_image || headerImage) {
    const { error: imgError } = await sb
      .from("polls")
      .update({ ...images, header_image: headerImage })
      .eq("id", created.id);
    if (imgError) {
      console.error("[admin/polls/create:images]", imgError.message);
      fail("写真の保存に失敗しました。二択そのものは作成できています");
    }
  }

  revalidatePath("/admin/polls");
  revalidatePath("/");
  redirect("/admin/polls?saved=created");
}

const UpdateSchema = PollUpsertSchema.extend({ id: z.string().uuid() });

export async function updatePoll(formData: FormData) {
  const parsed = UpdateSchema.safeParse({
    id: formData.get("id"),
    ...readForm(formData),
  });
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "入力内容を確認してください");
  }

  await requireAdmin();
  const sb = getSupabaseAdminClient();
  const { id, ...rest } = parsed.data;

  const { data: before } = await sb
    .from("polls")
    .select("option_a_image, option_b_image, header_image")
    .eq("id", id)
    .maybeSingle();

  const images = await readOptionImages(formData, id, {
    a: before?.option_a_image ?? null,
    b: before?.option_b_image ?? null,
  });
  const headerImage = await readHeaderImage(
    formData,
    id,
    before?.header_image ?? null,
  );

  const { error } = await sb
    .from("polls")
    .update({ ...rest, ...images, header_image: headerImage })
    .eq("id", id);
  if (error) {
    console.error("[admin/polls/update]", error.message);
    fail("二択の更新に失敗しました");
  }

  revalidatePath("/admin/polls");
  revalidatePath("/");
  redirect("/admin/polls?saved=updated");
}

const DeleteSchema = z.object({ id: z.string().uuid() });

export async function deletePoll(formData: FormData) {
  const parsed = DeleteSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return;
  await requireAdmin();
  const sb = getSupabaseAdminClient();
  // 選択肢の写真も一緒に消す。行だけ消して Storage に残すと、
  // 誰からも辿れないファイルが増え続ける
  const { data: before } = await sb
    .from("polls")
    .select("option_a_image, option_b_image, header_image")
    .eq("id", parsed.data.id)
    .maybeSingle();

  await sb.from("polls").delete().eq("id", parsed.data.id);
  await removeImage("poll-media", before?.option_a_image);
  await removeImage("poll-media", before?.option_b_image);
  await removeImage("poll-media", before?.header_image);

  revalidatePath("/admin/polls");
  revalidatePath("/");
}
