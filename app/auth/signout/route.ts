import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";

// ログアウト、POST で受けてセッションを破棄しトップへ戻す。
// CSRF 対策で GET は受けない。フォーム側から POST で送る想定。
export async function POST(_request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", getSiteUrl()), { status: 303 });
}
