import { cookies } from "next/headers";

// 未登録の人が書いた下書きを、登録が終わるまで預かる仕組み。
//
// 検証で繰り返し出たのが「書いたのに登録画面に飛ばされて、文章が消えた」ときの落胆で、
// 一度これを食らうと二度と書かない。そこで、
//   1. ゲストのまま書ける（入力欄は最初から開いている）
//   2. 送信した瞬間に文章をクッキーへ預け、席づくり（30秒）へ案内する
//   3. 席ができたら、預かった文章をそのまま投稿して元の場所へ戻す
// という順にした。書いたものは絶対に捨てない。

const COOKIE_NAME = "v1968_draft";
const TEN_MINUTES = 60 * 10;

export type Draft = {
  topicId: string;
  body: string;
  returnPath: string;
  parentResponseId?: string;
};

export async function saveDraft(draft: Draft): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, JSON.stringify(draft), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TEN_MINUTES,
  });
}

export async function takeDraft(): Promise<Draft | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  store.delete(COOKIE_NAME);

  try {
    const parsed = JSON.parse(raw) as Partial<Draft>;
    if (
      typeof parsed.topicId === "string" &&
      typeof parsed.body === "string" &&
      parsed.body.trim().length > 0
    ) {
      return {
        topicId: parsed.topicId,
        body: parsed.body,
        returnPath:
          typeof parsed.returnPath === "string" ? parsed.returnPath : "/",
        parentResponseId:
          typeof parsed.parentResponseId === "string"
            ? parsed.parentResponseId
            : undefined,
      };
    }
  } catch {
    // 壊れていたら黙って捨てる
  }
  return null;
}

/** 下書きを預かっているかどうかだけを見る（消さない）。 */
export async function hasDraft(): Promise<boolean> {
  const store = await cookies();
  return !!store.get(COOKIE_NAME)?.value;
}
