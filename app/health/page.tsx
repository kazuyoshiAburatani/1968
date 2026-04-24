import { createSupabaseServerClient } from "@/lib/supabase/server";

// フェーズ1の Supabase 疎通確認用の診断ページ。
// 認証サービスへのラウンドトリップが成功するかだけを見るため、スキーマ準備前でも動く。
// 本番での露出防止は今後のフェーズで検討する（例、NODE_ENV ガードや basic 認証など）。
export const dynamic = "force-dynamic";

export default async function HealthPage() {
  let status: "ok" | "error" = "ok";
  let detail = "";
  let userPresent = false;

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error && error.name !== "AuthSessionMissingError") {
      status = "error";
      detail = `${error.name}: ${error.message}`;
    } else {
      userPresent = Boolean(data.user);
    }
  } catch (e) {
    status = "error";
    detail = e instanceof Error ? e.message : String(e);
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-2xl font-bold">診断</h1>
      <dl className="mt-6 space-y-3 text-base">
        <div className="flex gap-4">
          <dt className="w-40 text-foreground/70">
            Supabase 接続
          </dt>
          <dd
            className={
              status === "ok"
                ? "font-bold text-primary"
                : "font-bold text-red-700"
            }
          >
            {status === "ok" ? "OK" : "ERROR"}
          </dd>
        </div>
        <div className="flex gap-4">
          <dt className="w-40 text-foreground/70">
            セッション
          </dt>
          <dd>{userPresent ? "ログイン中" : "未ログイン"}</dd>
        </div>
        {detail && (
          <div className="flex gap-4">
            <dt className="w-40 text-foreground/70">
              詳細
            </dt>
            <dd className="font-mono text-sm">{detail}</dd>
          </div>
        )}
      </dl>
      <p className="mt-8 text-sm text-foreground/60">
        この画面はフェーズ1の疎通確認用です。正式公開前に削除または保護予定。
      </p>
    </div>
  );
}
