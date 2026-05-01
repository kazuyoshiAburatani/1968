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

// 応援団の支払い金額（円）。年次サポーターは一回 3000 円固定。
// 価格を Stripe ダッシュボードで Price として作るのではなく、
// price_data でその場生成するのでシンプル。
export const SUPPORTER_AMOUNT_YEN = 3000;

// 旧課金プラン用の Price ID 取得は廃止。過去ログ閲覧のためだけ残し、
// 新規 checkout からは呼び出さない。
