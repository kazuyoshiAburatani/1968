import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { getStripe, priceIdToPlanType } from "@/lib/stripe/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Stripe Webhook エンドポイント。サブスクリプションのライフサイクル変化を検知して
// public.subscriptions と public.users.membership_rank を同期する。

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[stripe/webhook] STRIPE_WEBHOOK_SECRET が未設定");
    return NextResponse.json({ error: "misconfigured" }, { status: 500 });
  }

  const stripe = getStripe();
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe/webhook] signature verification failed:", message);
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const admin = getSupabaseAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(admin, stripe, session);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(admin, sub);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(admin, sub);
        break;
      }
      default:
        // 他のイベントは無視
        break;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[stripe/webhook] handler error:", event.type, message);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// 初回決済完了、Customer ID を users.stripe_customer_id に保存する
async function handleCheckoutCompleted(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session,
) {
  const userId = session.client_reference_id ?? session.metadata?.user_id;
  const customerId = session.customer as string | null;
  if (!userId || !customerId) {
    console.error("[stripe/webhook] checkout.completed, missing ids", {
      userId,
      customerId,
    });
    return;
  }

  await admin
    .from("users")
    .update({ stripe_customer_id: customerId })
    .eq("id", userId);

  // サブスクリプション情報は subscription 作成 event 側で処理されるので、ここでは不要。
  // ただし subscription が同期的に存在することも多いので、ここで upsert を試みる。
  if (session.subscription) {
    const sub = await stripe.subscriptions.retrieve(
      session.subscription as string,
    );
    await upsertSubscription(admin, sub);
  }
}

// subscription の作成・更新を DB に反映
async function upsertSubscription(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  sub: Stripe.Subscription,
) {
  const userId = (sub.metadata?.user_id ?? "") as string;
  if (!userId) {
    console.error("[stripe/webhook] subscription has no user_id metadata", sub.id);
    return;
  }

  const priceId = sub.items.data[0]?.price.id;
  const planType = priceId ? priceIdToPlanType(priceId) : null;
  if (!planType) {
    console.error("[stripe/webhook] unknown price id", priceId);
    return;
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Stripe の period 情報は items.data[0] 側にも乗るが、subscription 直接プロパティも使う
  const firstItem = sub.items.data[0];
  const periodStart = firstItem?.current_period_start ?? null;
  const periodEnd = firstItem?.current_period_end ?? null;

  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      stripe_subscription_id: sub.id,
      stripe_customer_id: customerId,
      plan_type: planType,
      status: sub.status,
      current_period_start: periodStart
        ? new Date(periodStart * 1000).toISOString()
        : null,
      current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at
        ? new Date(sub.canceled_at * 1000).toISOString()
        : null,
    },
    { onConflict: "stripe_subscription_id" },
  );

  if (error) {
    console.error("[stripe/webhook] upsert subscription failed:", error.message);
    return;
  }

  // 有効なサブスクなら users.membership_rank を regular に昇格、そうでなければ member に戻す
  const activeStatuses = new Set(["active", "trialing"]);
  if (activeStatuses.has(sub.status)) {
    await admin
      .from("users")
      .update({ membership_rank: "regular" })
      .eq("id", userId);
  } else {
    await admin
      .from("users")
      .update({ membership_rank: "member" })
      .eq("id", userId);
  }
}

// subscription 削除、regular から member に降格
async function handleSubscriptionDeleted(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  sub: Stripe.Subscription,
) {
  const userId = (sub.metadata?.user_id ?? "") as string;
  if (!userId) return;

  await admin
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", sub.id);

  await admin
    .from("users")
    .update({ membership_rank: "member" })
    .eq("id", userId);
}
