import type { Metadata } from "next";
import Image from "next/image";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { reviewVerification } from "./actions";
import { DOCUMENT_TYPE_LABELS } from "@/lib/validation/verification";

export const metadata: Metadata = { title: "身分証審査" };

type Verif = {
  id: string;
  user_id: string;
  document_type: keyof typeof DOCUMENT_TYPE_LABELS;
  status: "pending" | "approved" | "rejected";
  image_storage_path: string | null;
  rejection_reason: string | null;
  submitted_at: string;
  verified_at: string | null;
};

type Props = {
  searchParams: Promise<{ filter?: "pending" | "approved" | "rejected" | "all" }>;
};

const STATUS_LABEL: Record<Verif["status"], string> = {
  pending: "審査中",
  approved: "承認済",
  rejected: "却下",
};
const STATUS_COLOR: Record<Verif["status"], string> = {
  pending: "bg-amber-50 text-amber-900 border-amber-300",
  approved: "bg-emerald-50 text-emerald-900 border-emerald-300",
  rejected: "bg-stone-100 text-stone-700 border-stone-300",
};

export default async function AdminVerificationsPage({ searchParams }: Props) {
  const { filter = "pending" } = await searchParams;
  const admin = getSupabaseAdminClient();

  let query = admin
    .from("verifications")
    .select(
      "id, user_id, document_type, status, image_storage_path, rejection_reason, submitted_at, verified_at",
    )
    .order("submitted_at", { ascending: false })
    .limit(100);
  if (filter !== "all") {
    query = query.eq("status", filter);
  }

  const { data } = await query;
  const items = (data ?? []) as Verif[];

  // 申請者のメールとニックネームを補助情報として取得
  const userIds = items.map((i) => i.user_id);
  const [{ data: usersData }, { data: profilesData }] = await Promise.all([
    userIds.length > 0
      ? admin.from("users").select("id, email").in("id", userIds)
      : Promise.resolve({ data: [] as { id: string; email: string }[] }),
    userIds.length > 0
      ? admin
          .from("profiles")
          .select("user_id, nickname")
          .in("user_id", userIds)
      : Promise.resolve(
          {} as { data: { user_id: string; nickname: string }[] },
        ),
  ]);
  const userMap = new Map(
    (usersData ?? []).map((u: { id: string; email: string }) => [u.id, u]),
  );
  const profileMap = new Map(
    (profilesData ?? []).map(
      (p: { user_id: string; nickname: string }) => [p.user_id, p],
    ),
  );

  // 各画像の signed URL を発行（10 分有効）
  const signedUrls = new Map<string, string>();
  await Promise.all(
    items.map(async (i) => {
      if (!i.image_storage_path) return;
      const { data: signed } = await admin.storage
        .from("verification-documents")
        .createSignedUrl(i.image_storage_path, 600);
      if (signed?.signedUrl) signedUrls.set(i.id, signed.signedUrl);
    }),
  );

  return (
    <div>
      <h1 className="text-2xl font-bold">身分証審査</h1>

      <nav className="mt-3 flex gap-2 text-sm">
        {(["pending", "approved", "rejected", "all"] as const).map((k) => (
          <a
            key={k}
            href={`/admin/verifications?filter=${k}`}
            className={`px-3 py-1 rounded-full border ${
              filter === k
                ? "border-primary bg-primary/10 text-primary font-bold"
                : "border-border hover:bg-muted"
            } no-underline`}
          >
            {k === "pending" && "審査中"}
            {k === "approved" && "承認済"}
            {k === "rejected" && "却下"}
            {k === "all" && "すべて"}
          </a>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className="mt-12 text-center text-foreground/70">
          {filter === "pending"
            ? "審査待ちはありません。"
            : "該当する申請はありません。"}
        </p>
      ) : (
        <ul className="mt-6 space-y-6">
          {items.map((v) => {
            const user = userMap.get(v.user_id);
            const profile = profileMap.get(v.user_id);
            const url = signedUrls.get(v.id);
            return (
              <li
                key={v.id}
                className="rounded-xl border border-border bg-background p-5"
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <p className="font-bold">
                      {profile?.nickname ?? "（不明）"}
                    </p>
                    <p className="text-xs text-foreground/60">
                      {user?.email ?? "-"} ・{" "}
                      {DOCUMENT_TYPE_LABELS[v.document_type]}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded border ${STATUS_COLOR[v.status]}`}
                  >
                    {STATUS_LABEL[v.status]}
                  </span>
                </div>

                <p className="mt-2 text-xs text-foreground/60">
                  申請日時、{new Date(v.submitted_at).toLocaleString("ja-JP")}
                  {v.verified_at && (
                    <>
                      {" ・ "}審査日時、
                      {new Date(v.verified_at).toLocaleString("ja-JP")}
                    </>
                  )}
                </p>

                {url ? (
                  <div className="mt-4">
                    {/* 拡大して見せる、画像が大きい場合は max-h で抑える */}
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      <Image
                        src={url}
                        alt="提出された身分証画像"
                        width={800}
                        height={600}
                        unoptimized
                        className="max-h-[400px] w-auto rounded border border-border bg-muted/30"
                      />
                    </a>
                    <p className="mt-1 text-xs text-foreground/50">
                      クリックで原寸表示。署名URLは10分有効。
                    </p>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-foreground/60">
                    画像はすでに削除されています（30日経過 or 運営削除）。
                  </p>
                )}

                {v.status === "rejected" && v.rejection_reason && (
                  <p className="mt-3 text-sm text-red-900 bg-red-50 p-3 rounded">
                    却下理由、{v.rejection_reason}
                  </p>
                )}

                {v.status === "pending" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <form action={reviewVerification}>
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="action" value="approve" />
                      <button
                        type="submit"
                        className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full bg-primary text-white text-sm font-medium hover:opacity-90"
                      >
                        承認する
                      </button>
                    </form>
                    <form
                      action={reviewVerification}
                      className="flex items-center gap-2 flex-wrap"
                    >
                      <input type="hidden" name="id" value={v.id} />
                      <input type="hidden" name="action" value="reject" />
                      <input
                        type="text"
                        name="rejection_reason"
                        placeholder="却下理由を入力"
                        required
                        maxLength={200}
                        className="px-3 min-h-[var(--spacing-tap)] rounded border border-border text-sm"
                      />
                      <button
                        type="submit"
                        className="inline-flex items-center min-h-[var(--spacing-tap)] px-4 rounded-full border border-border text-sm hover:bg-muted"
                      >
                        却下する
                      </button>
                    </form>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
