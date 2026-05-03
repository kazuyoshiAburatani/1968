import Link from "next/link";
import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { UserAvatar } from "@/components/user-avatar";
import { publicAvatarUrl } from "@/lib/avatar";
import Image from "next/image";

export const metadata: Metadata = {
  title: "創設メンバー名簿",
  description:
    "1968 のベータ期間からご参加いただいた、創設メンバーの方々です。サービスを共に育てた、初期からの応援に感謝いたします。",
};

type Row = {
  user_id: string;
  nickname: string;
  prefecture: string | null;
  introduction: string | null;
  avatar_url: string | null;
  founding_member_since: string | null;
};

export default async function FoundingMembersPage() {
  // 公開ページ。掲載に同意した創設メンバー（profile.founding_directory_listed=true）のみ表示。
  // RLS を通すと未ログイン時に取れないため、admin クライアントで全件取得する。
  // ニックネーム / 都道府県 / 自己紹介 / アバター / 創設日 のみ。メールや本名等は出さない。
  const sb = getSupabaseAdminClient();

  let rows: Row[] = [];
  try {
    const { data } = await sb
      .from("profiles")
      .select(
        "user_id, nickname, prefecture, introduction, avatar_url, users!inner(is_founding_member, founding_member_since)",
      )
      .eq("founding_directory_listed", true)
      .eq("users.is_founding_member", true)
      .order("users(founding_member_since)", { ascending: true })
      .limit(200);
    rows = (data ?? []).map(
      (r: {
        user_id: string;
        nickname: string;
        prefecture: string | null;
        introduction: string | null;
        avatar_url: string | null;
        users:
          | { is_founding_member: boolean; founding_member_since: string | null }
          | { is_founding_member: boolean; founding_member_since: string | null }[]
          | null;
      }) => {
        const userInfo = Array.isArray(r.users) ? r.users[0] : r.users;
        return {
          user_id: r.user_id,
          nickname: r.nickname,
          prefecture: r.prefecture,
          introduction: r.introduction,
          avatar_url: r.avatar_url,
          founding_member_since: userInfo?.founding_member_since ?? null,
        };
      },
    );
  } catch (e) {
    console.error("[founding-members]", e);
    // マイグレーション未適用時、無視して空配列で続行
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:py-16">
      <header className="text-center">
        <div className="inline-block">
          <Image
            src="/badges/founding-member.svg"
            alt="創設メンバーバッジ"
            width={88}
            height={88}
            className="mx-auto"
          />
        </div>
        <h1 className="mt-4 text-3xl sm:text-4xl font-bold">
          創設メンバー名簿
        </h1>
        <p className="mt-3 text-sm sm:text-base text-foreground/80 leading-7 max-w-2xl mx-auto">
          ベータ期間からご参加いただいた、1968 創設メンバーの方々です。
          <br />
          サービスを共に育てた、初期からの応援に感謝いたします。
        </p>
        <p className="mt-2 text-xs text-foreground/60">
          ※ 掲載は希望制、ニックネームでの表示です。
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="mt-12 text-center text-foreground/60">
          掲載に同意された創設メンバーは、まだいらっしゃいません。
        </p>
      ) : (
        <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((r, i) => (
            <li
              key={r.user_id}
              className="rounded-2xl border border-amber-200 bg-background p-5 hover:shadow-sm transition-shadow"
            >
              <Link
                href={`/u/${r.user_id}`}
                className="flex items-start gap-3 no-underline"
              >
                <UserAvatar
                  name={r.nickname}
                  avatarUrl={publicAvatarUrl(r.avatar_url)}
                  size={56}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-amber-700 font-bold">
                    No. {String(i + 1).padStart(3, "0")}
                  </p>
                  <p className="font-bold text-foreground truncate">
                    {r.nickname}
                  </p>
                  {r.prefecture && (
                    <p className="text-xs text-foreground/60 mt-0.5">
                      {r.prefecture}
                    </p>
                  )}
                  {r.introduction && (
                    <p className="mt-2 text-sm text-foreground/75 line-clamp-2 leading-6">
                      {r.introduction}
                    </p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-12 text-center text-sm">
        <Link href="/">← トップへ戻る</Link>
      </p>
    </div>
  );
}
