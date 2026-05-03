# Phase 4-5, 4-6 — DNS をムームー → Cloudflare に移管 + WAF 設定

DNS とエッジを Cloudflare に寄せることで、

- DDoS 防御・WAF・Bot Fight Mode が無料で使える
- HTTP/3、Brotli 圧縮、自動的な TLS 1.3
- レート制限（無料枠でも 10,000 req/分まで設定可）
- アクセスログの可視化
- 将来 Workers / R2 などにも展開可能

の利点が得られる。所要時間は実作業 30 分 + DNS 浸透待ち 24〜48 時間。

---

## 事前準備、所要 5 分

1. https://dash.cloudflare.com/sign-up でアカウント作成（メール認証）
2. ログイン後「Add a site」→ `1968.love` を入力 → **Free** プラン選択
3. Cloudflare が現在の DNS レコードを自動取込み、内容を確認
   - `A`/`AAAA` → Vercel が `76.76.21.21` 等を返す
   - `CNAME` → サブドメインがあれば
   - `MX`/`TXT` → メール配信、SPF/DKIM/DMARC 等
4. 取込まれたレコードのうち、誤検知や不要なものは削除

## ネームサーバ切り替え

Cloudflare の指示通り、ムームードメイン管理画面で `1968.love` のネームサーバを以下に変更：

```
hera.ns.cloudflare.com  （例、Cloudflare 指定値）
xena.ns.cloudflare.com  （例、Cloudflare 指定値）
```

> 正確なネームサーバ名は Cloudflare ダッシュボードで提示されます。コピペで貼ってください。

設定保存後、DNS 浸透を待つ（通常 1〜24 時間）。Cloudflare ダッシュボードでステータスが「Active」になったら次へ。

## Vercel 側の確認

ネームサーバ切り替え後も Vercel の Apex/Custom Domain 設定はそのまま機能する。確認手順、

1. Vercel Dashboard → Project → Settings → Domains
2. `1968.love` と `www.1968.love` がそれぞれ正しく Verified になっているか
3. SSL/TLS 証明書が更新できなければ、Cloudflare 側で **Full (Strict)** モードに切り替える

---

## Cloudflare 推奨初期設定

### SSL/TLS
- 暗号化モード、**Full (Strict)** を選ぶ（Vercel 自前の Let's Encrypt 証明書を使うため）
- Edge Certificates → **Always Use HTTPS** ON
- HSTS、`max-age=31536000; includeSubDomains; preload` を有効化

### Speed
- Auto Minify、HTML / CSS / JS をすべて ON
- Brotli ON
- Early Hints ON

### Caching
- Browser Cache TTL、デフォルト 4 hours
- Cache Level、Standard

### Network
- HTTP/3 ON、0-RTT ON
- WebSockets ON

### Security
- **Bot Fight Mode** ON（無料）
- Security Level、Medium
- Challenge Passage、30 minutes
- Browser Integrity Check ON

### WAF（Web Application Firewall）
無料プランでも基本的なルールセットが利用可。

1. Security → WAF → Managed Rules
2. **Cloudflare Free Managed Ruleset** を Enable
3. Tools → Rate Limiting Rules で以下を設定、

   | Rule | URL | Threshold | Action |
   |---|---|---|---|
   | ログイン保護 | `/api/auth/*` | 10 req / 1分 | Block 5 分 |
   | API 保護 | `/api/*` | 60 req / 1分 | Challenge |
   | 認証フォーム | `/auth/*` | 20 req / 1分 | Challenge |
   | Webhook（Stripe）除外 | `/api/stripe/webhook` | 制限なし | Skip |

### Page Rules（または Cache Rules、Free でも 3 件まで）
- `*1968.love/api/*` → Cache Level Bypass
- `*1968.love/_next/static/*` → Cache Everything、Edge TTL 1 month
- `*1968.love/og/*` `*1968.love/illustrations/*` `*1968.love/badges/*` → Cache Everything、Edge TTL 1 week

---

## 切り替え後の動作確認

```bash
# A レコードが Cloudflare の IP を返すか
dig 1968.love @1.1.1.1 +short

# HSTS / セキュリティヘッダー
curl -sI https://1968.love | grep -iE 'strict|x-|cf-|server|vary'

# WebSocket（Realtime）が通るか
# ブラウザで /board/<slug>/<thread> を開き、別タブで投稿 → 即時表示されるか
```

---

## 運用上の注意

- **Stripe Webhook は WAF/Rate Limit から除外**してください、署名検証してるので無問題
- **Supabase の Realtime（WebSocket）** は問題なく通るはずだが、もし切れたら Network → WebSockets ON を確認
- Cloudflare Analytics でアクセスパターン異常を時々確認
- 解約は Cloudflare 側でいつでも可能、その場合は事前にネームサーバを別の DNS（ムームー or Vercel 直接）に戻す
