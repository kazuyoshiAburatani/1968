import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// Stripe Webhook、応援団（一回 3,000 円）の payment_intent.succeeded を主に扱う。
// 完全無料化以降は subscription を新規作成しないが、過去のサブスク event は
// （存在し続ける場合の互換のため）静かに無視する。

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
        await handleCheckoutCompleted(admin, session);
        break;
      }
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await handleSupporterPayment(admin, intent);
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

// Checkout 完了、Customer ID を users.stripe_customer_id に保存する
async function handleCheckoutCompleted(
  admin: ReturnType<typeof getSupabaseAdminClient>,
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
}

// 応援団の支払い成功、supporters テーブルに insert
async function handleSupporterPayment(
  admin: ReturnType<typeof getSupabaseAdminClient>,
  intent: Stripe.PaymentIntent,
) {
  const purpose = intent.metadata?.purpose;
  if (purpose !== "supporter") {
    // 応援団以外の payment は無視
    return;
  }

  const userId = intent.metadata?.user_id;
  const yearStr = intent.metadata?.supporter_year;
  if (!userId || !yearStr) {
    console.error("[stripe/webhook] supporter payment missing metadata", {
      userId,
      yearStr,
      intent: intent.id,
    });
    return;
  }

  const year = Number(yearStr);
  if (!Number.isInteger(year) || year < 2026 || year > 2100) {
    console.error("[stripe/webhook] invalid supporter year", yearStr);
    return;
  }

  const chargeId =
    typeof intent.latest_charge === "string"
      ? intent.latest_charge
      : (intent.latest_charge?.id ?? null);

  // 同一年に重複 insert されないよう upsert（PK は user_id, year）
  const { error } = await admin.from("supporters").upsert(
    {
      user_id: userId,
      year,
      paid_at: new Date(intent.created * 1000).toISOString(),
      amount_yen: intent.amount,
      stripe_payment_intent_id: intent.id,
      stripe_charge_id: chargeId,
      granted_by: "paid",
    },
    { onConflict: "user_id,year" },
  );

  if (error) {
    console.error(
      "[stripe/webhook] supporter upsert failed:",
      error.message,
      intent.id,
    );
  }
}
