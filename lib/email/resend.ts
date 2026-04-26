import "server-only";

// Resend API を叩くシンプルなクライアント。
// API キー未設定時はコンソールへの出力のみで成功扱いとし、開発時の障害にしない。
//
// 環境変数、
//   RESEND_API_KEY        Resend のシークレット
//   RESEND_FROM           送信元（例 "1968 <noreply@1968.love>"）、未設定なら NOREPLY を組み立てる

export type SendOptions = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export async function sendEmail(opts: SendOptions): Promise<
  | { ok: true; id?: string }
  | { ok: false; reason: "no-api-key" | "send-failed"; detail?: string }
> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "1968 <noreply@1968.love>";

  if (!apiKey) {
    console.log(
      "[email] RESEND_API_KEY 未設定、コンソール出力のみ",
      JSON.stringify({
        to: opts.to,
        subject: opts.subject,
        text: opts.text.slice(0, 200),
      }),
    );
    return { ok: false, reason: "no-api-key" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(opts.to) ? opts.to : [opts.to],
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
        reply_to: opts.replyTo,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[email] Resend API failed", res.status, body);
      return { ok: false, reason: "send-failed", detail: body };
    }

    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[email] fetch error", detail);
    return { ok: false, reason: "send-failed", detail };
  }
}
