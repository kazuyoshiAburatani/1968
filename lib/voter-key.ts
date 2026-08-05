import { cookies } from "next/headers";

// 未登録のまま投票・検定に参加できるようにするための識別子。
//
// 検証では、二択投票が「登録不要・1タップ」であることが参加率の決め手だった。
// 一方で anon に poll_votes への直接 insert を許すと票の水増しが容易になるため、
// 書き込みは必ず Server Action（service_role）を通し、識別子はサーバ側が
// httpOnly クッキーで発行する。クライアントからは読めない。
//
// 完全な不正防止にはならないが、
//   ・同じブラウザからの二重投票は防げる
//   ・票を積むにはクッキーを捨てて再訪する手間が要る
// という程度の抑止で、この規模の集まりには十分と判断した。

const COOKIE_NAME = "v1968_vk";
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * 投票用の識別子を読む。無ければ発行して書き込む。
 * Server Action / Route Handler から呼ぶこと（Server Component からは書き込めない）。
 */
export async function getOrCreateVoterKey(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE_NAME)?.value;
  if (existing && isUuid(existing)) return existing;

  const key = crypto.randomUUID();
  store.set(COOKIE_NAME, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return key;
}

/**
 * 投票用の識別子を読むだけ。まだ無ければ null。
 * Server Component から「自分がどちらに入れたか」を表示するのに使う。
 */
export async function peekVoterKey(): Promise<string | null> {
  const store = await cookies();
  const v = store.get(COOKIE_NAME)?.value;
  return v && isUuid(v) ? v : null;
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    v,
  );
}
