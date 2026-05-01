import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe, SUPPORTER_AMOUNT_YEN } from "@/lib/stripe/server";
import { getSiteUrl } from "@/lib/site-url";

// 応援団（年次サポーター）一回 3,000 円の Stripe Checkout を生成する。
// 完全無料化以降は subscription を作らず、payment mode の一回払いに統一。
//
// 呼び出し側、<form method="post" action="/api/stripe/checkout">。
// 旧 ?plan=monthly|yearly のクエリは無視される。
export async function POST(_request: NextRequest) {
  const site = getSiteUrl();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", site), { status: 303 });
  }

  // Tokyo timezone での「今年」を計算、Webhook 側でこの year に紐づけて supporters に挿入する
  const tokyoYear = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }),
  ).getFullYear();

  // 既存の stripe_customer_id があれば使い回す
  const { data: dbUser } = await supabase
    .from("users")
    .select("email, stripe_customer_id")
    .eq("id", user.id)
    .maybeSingle();

  const stripe = getStripe();
  let customerId = dbUser?.stripe_customer_id as string | null | undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: dbUser?.email ?? user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "jpy",
          unit_amount: SUPPORTER_AMOUNT_YEN,
          product_data: {
            name: `1968 ${tokyoYear} 応援団`,
            description:
              "1968 を応援する任意のご支援です。ご支援いただいた方には、その年限定の「応援団」の称号と、応援団ラウンジへのアクセス権が付与されます。",
          },
        },
        quantity: 1,
      },
    ],
    success_url: `${site}/mypage?stripe=supporter_success`,
    cancel_url: `${site}/mypage?stripe=canceled`,
    allow_promotion_codes: false,
    payment_intent_data: {
      metadata: {
        user_id: user.id,
        supporter_year: String(tokyoYear),
        purpose: "supporter",
      },
    },
    client_reference_id: user.id,
    metadata: {
      user_id: user.id,
      supporter_year: String(tokyoYear),
      purpose: "supporter",
    },
  });

  if (!session.url) {
    return NextResponse.json(
      { ok: false, error: "Stripe Checkout URL の取得に失敗しました" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(session.url, { status: 303 });
}
