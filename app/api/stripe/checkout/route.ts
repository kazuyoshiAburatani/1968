import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe, getStripePriceIds } from "@/lib/stripe/server";
import { getSiteUrl } from "@/lib/site-url";

// Stripe Checkout Session を作成して、Stripe 決済画面にリダイレクトするための URL を返す。
// 呼び出し側、<form method="post" action="/api/stripe/checkout?plan=monthly">。
export async function POST(request: NextRequest) {
  const site = getSiteUrl();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", site), { status: 303 });
  }

  // プラン判定
  const url = new URL(request.url);
  const plan = url.searchParams.get("plan");
  const prices = getStripePriceIds();
  let priceId: string;
  if (plan === "yearly") {
    priceId = prices.yearly;
  } else {
    priceId = prices.monthly;
  }

  // 既存の stripe_customer_id があれば使い回す、無ければ作成
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
    // 後続のアクセスを減らすため、ここで保存。RLS で UPDATE 拒否されるので service_role は使わず、
    // Webhook 側でも上書き保存するが、ここでも insert 相当。
    // 現状 users は service_role のみ更新可能なので、Webhook 経由に寄せる方が安全。
    // ただし Customer 作成直後の情報は Webhook に流れないため、
    // ここで RPC か service_role で書き込む設計が理想。フェーズ4 MVP では Webhook にも id を
    // メタデータ経由で渡してそこから保存する。
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${site}/mypage?stripe=success`,
    cancel_url: `${site}/mypage?stripe=canceled`,
    allow_promotion_codes: false,
    subscription_data: {
      metadata: {
        user_id: user.id,
      },
    },
    client_reference_id: user.id,
    // 支払い方法は Stripe ダッシュボードで有効化したものすべて
  });

  if (!session.url) {
    return NextResponse.json(
      { ok: false, error: "Stripe Checkout URL の取得に失敗しました" },
      { status: 500 },
    );
  }

  return NextResponse.redirect(session.url, { status: 303 });
}
