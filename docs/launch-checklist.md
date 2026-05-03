# Phase 4-9 — 本番公開チェックリスト

正式ローンチ前に確認すべき項目を網羅。順番にチェックを入れていく。

---

## 1. インフラ・運用

- [ ] Vercel 本番環境のデプロイが最新コミットで成功
- [ ] Supabase 本番プロジェクトの全マイグレーションが適用済み
  - [ ] `20260501013000_overhaul_to_free_with_supporter.sql`
  - [ ] `20260504013000_strip_ai_persona_intro_from_threads.sql`
  - [ ] `20260504020000_add_home_banner_color.sql`
  - [ ] `20260504030000_add_lounge_categories.sql`
  - [ ] `20260504040000_founding_directory_opt_in.sql`
  - [ ] `20260504050000_messages_rls_operator_channel.sql`
  - [ ] `20260504060000_create_topics_table.sql`
  - [ ] `20260504070000_create_recommendations.sql`
- [ ] Cloudflare DNS 移管完了、A レコード正常応答
- [ ] Cloudflare SSL モード = Full (Strict)
- [ ] Cloudflare WAF と Rate Limiting Rules が稼働
- [ ] Stripe Live モード切替、Webhook エンドポイント変更
- [ ] Resend Live API key へ切替、SPF/DKIM/DMARC 設定
- [ ] Sentry 本番環境登録（任意）
- [ ] Vercel 環境変数すべて Production にチェック
  - [ ] `NEXT_PUBLIC_SITE_URL=https://1968.love`
  - [ ] `NEXT_PUBLIC_SUPABASE_*` `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `STRIPE_SECRET_KEY`（Live）`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`（Live）`STRIPE_WEBHOOK_SECRET`（Live）
  - [ ] `RESEND_API_KEY`（Live）
  - [ ] `NEXT_PUBLIC_CLARITY_PROJECT_ID`
  - [ ] `NEXT_PUBLIC_GA_MEASUREMENT_ID`
  - [ ] `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
  - [ ] `NEXT_PUBLIC_BING_SITE_VERIFICATION`

## 2. 法務

- [ ] 利用規約、プライバシーポリシー、特商法の最新版が公開されている
- [ ] 弁護士による最終レビュー（任意、ベータでは不要、正式公開時推奨）
- [ ] 法務文書から「ドラフト」表示を削除
- [ ] 1968 認証フロー、応援団返金条件の説明が齟齬なく一貫
- [ ] Cookie 同意バナーが表示・動作

## 3. SEO / AEO

- [ ] Google Search Console、所有権確認 + sitemap.xml 送信
- [ ] Bing Webmaster Tools、所有権確認 + sitemap.xml 送信
- [ ] Google Business プロフィール作成（必要なら、運営者情報として）
- [ ] OG / Twitter カード、各重要ページで正しく表示
  - [ ] `https://1968.love/` → og-tagline.png
  - [ ] `https://1968.love/beta` → og-beta.png
- [ ] JSON-LD（Organization / WebSite / FAQPage / WebPage）が正しい
- [ ] robots.txt と sitemap.xml が公開されている
- [ ] llms.txt が公開されている
- [ ] [Google リッチリザルトテスト](https://search.google.com/test/rich-results) で全ページ Pass
- [ ] [PageSpeed Insights](https://pagespeed.web.dev/) で 90 点以上、モバイル

## 4. セキュリティ

- [ ] 外部脆弱性診断完了、Critical / High はすべて修正済み
- [ ] HTTPS 強制（HSTS preload 含む）
- [ ] Content Security Policy（CSP）が適切
- [ ] Stripe Webhook 署名検証が動作
- [ ] Supabase RLS、すべてのテーブルで適用確認
- [ ] パスワード（auth.users）のハッシュ保管確認
- [ ] 管理者アカウント、二段階認証（MFA）有効化
- [ ] 不正アクセス試行のログ収集、Sentry / Cloudflare アラート設定
- [ ] バックアップ、Supabase Pro の自動日次バックアップ有効

## 5. 機能の最終確認、ユーザー体験

ブラウザを以下で検証、

- [ ] iPhone Safari（最新）
- [ ] iPhone Chrome
- [ ] Android Chrome
- [ ] PC Chrome
- [ ] PC Safari

各端末で以下を実行、

- [ ] 新規会員登録（メール magic link）
- [ ] Google OAuth ログイン
- [ ] 1968 認証フロー（誓約 + 200字エッセイ）の申請 → 承認 → ランク変化確認
- [ ] 段階A 投稿、画像添付付き
- [ ] 段階B〜D の閲覧 / 投稿（認証済アカウント）
- [ ] DM 送受信、画像添付付き
- [ ] 運営宛 DM（直通チャンネル）
- [ ] プロフィール編集、アバター変更、バナー色変更
- [ ] 応援団 Stripe 決済（テスト → 本番カードで小額確認）
- [ ] 創設メンバー名簿への opt-in / opt-out
- [ ] ベータ応募フォーム送信 → 受付メール受信 → 運営通知メール受信
- [ ] 通知ページの未読カウント
- [ ] モバイル、ヘッダーロゴ・タブバー・FAB すべて崩れない
- [ ] 横スクロールが発生しない
- [ ] スクリーンリーダー（VoiceOver）でメインフローが操作できる

## 6. 解析・モニタリング

- [ ] Google Analytics 4 にリアルタイム訪問が記録される
- [ ] Microsoft Clarity の Recordings が反映される
- [ ] Cloudflare Analytics でアクセス数の急増異常が無いか
- [ ] Vercel ログで 5xx エラーが極小であること
- [ ] Supabase ログで遅いクエリが無いか確認

## 7. ローンチ告知

- [ ] Instagram、X、Facebook の公式アカウント準備
- [ ] ベータテスター（30 名）への正式公開メール送付
- [ ] プレスリリース（任意、PR TIMES 等）
- [ ] 関係者・知人への共有リンク
- [ ] note / ブログでの開始宣言記事

## 8. ローンチ翌日〜1 週間

- [ ] 毎朝、Sentry のエラー件数チェック
- [ ] 毎朝、Cloudflare Analytics で異常アクセスチェック
- [ ] 毎朝、新規登録数・離脱率を GA4 / Clarity で確認
- [ ] DM 直通チャンネルへの問い合わせ対応
- [ ] 法務文書、サイト表示で気になる箇所を継続修正

---

## ローンチ判定基準

以下がすべて Yes なら GO、

- セキュリティ診断で Critical / High = 0
- ブラウザ動作確認、3 端末以上でメインフロー全成功
- バックアップが取れている
- 緊急時の連絡フロー（Stripe / Supabase / Cloudflare）が文書化されている

ひとつでも No なら、ローンチ延期 + 原因対応。
