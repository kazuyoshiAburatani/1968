import "server-only";
import Stripe from "stripe";

// Stripe server-side クライアントのシングルトン。
// API バージョンは固定して、Stripe 側のスキーマ変更の影響を受けないようにする。
let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeClient) return stripeClient;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY が設定されていません");
  }
  stripeClient = new Stripe(secretKey, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
    appInfo: {
      name: "1968",
      url: "https://1968.love",
    },
  });
  return stripeClient;
}

// Price ID を env から取り出す、サブスク作成時に plan_type と対応付けて使う
export function getStripePriceIds(): { monthly: string; yearly: string } {
  const monthly = process.env.STRIPE_PRICE_MONTHLY;
  const yearly = process.env.STRIPE_PRICE_YEARLY;
  if (!monthly || !yearly) {
    throw new Error(
      "STRIPE_PRICE_MONTHLY と STRIPE_PRICE_YEARLY を設定してください",
    );
  }
  return { monthly, yearly };
}

// Price ID から plan_type 文字列（DB の check 制約に合うもの）に変換
export function priceIdToPlanType(
  priceId: string,
): "regular_monthly" | "regular_yearly" | null {
  const { monthly, yearly } = getStripePriceIds();
  if (priceId === monthly) return "regular_monthly";
  if (priceId === yearly) return "regular_yearly";
  return null;
}
