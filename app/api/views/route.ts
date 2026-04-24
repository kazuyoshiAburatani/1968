import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// スレッドの閲覧カウント用エンドポイント。
// 同じセッションで24時間以内に同じスレッドを開いた場合はカウントしない（クッキーでデデュプ）。
export async function POST(request: NextRequest) {
  const threadId = new URL(request.url).searchParams.get("thread");
  if (!threadId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(threadId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const cookieStore = await cookies();
  const cookieName = `vt_${threadId.replace(/-/g, "")}`;
  if (cookieStore.get(cookieName)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("increment_thread_view", {
    p_thread_id: threadId,
  });
  if (error) {
    console.error("[views] increment failed:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  cookieStore.set(cookieName, "1", {
    maxAge: 60 * 60 * 24,
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  });
  return NextResponse.json({ ok: true });
}
