@AGENTS.md

# 1968（イチキューロクハチ）プロジェクト仕様書

## プロジェクト概要

正式サービス名、1968（読み、イチキューロクハチ）
サブタイトル、1968年生まれ限定コミュニティ
運営者、油谷和好
ドメイン、1968.love
GitHubリポジトリ、https://github.com/kazuyoshiAburatani/1968.git

1968は、1968年（昭和43年）生まれの人だけが参加できる、閉鎖的な会員制コミュニティWebアプリ。同い年だけが集まる安心感と希少性を軸に、介護・夫婦・健康・お金など人には聞きにくい話題を本音で話し合える場を提供する。

## 事業要件

- ターゲット、1968年1月1日〜12月31日生まれの男女
- 収益モデル、月額課金のサブスクリプション
- 準会員、月額180円／年額1800円（年額は月額×10、実質2ヶ月分割引）
- 正会員、月額480円／年額4800円（年額は月額×10、実質2ヶ月分割引）
- 想定会員数、初年度500名、3年目で5000名

## 技術スタック

- フロントエンド、Next.js 16（App Router、Turbopackデフォルト）＋TypeScript
- React、19.2系（Next.js 16同梱）
- スタイル、Tailwind CSS v4（`@theme`ベースの新設定方式）
- データベース・認証・ストレージ、Supabase
- 決済、Stripe（サブスクリプション）
- ホスティング、Vercel
- CDN・セキュリティ、Cloudflare（フェーズ8で DNS をムームーから移管予定）
- メール配信、Resend
- エラー監視、Sentry
- パッケージマネージャ、npm

### Next.js 16 の注意点（学習データとのズレ）

- `cookies()` `headers()` `draftMode()` は async、必ず `await` する
- ページ・レイアウトの `params` `searchParams` は Promise、`await` で解決
- `middleware.ts` は `proxy.ts` に改名済み、エッジランタイム非対応
- `revalidateTag` は第2引数に `cacheLife` プロファイル必須
- Parallel Routes のスロットは `default.js` が必須
- `next/image` は `images.remotePatterns` を使用、`images.domains` は非推奨
- `next lint` は廃止、ESLint CLI を直接使う
- AMP、`serverRuntimeConfig`/`publicRuntimeConfig` は削除済み

## 会員構成（3層モデル）

### ゲスト（未登録、無料）
- 段階Aカテゴリの閲覧のみ、スレッドごとに先頭3返信まで表示
- 投稿不可、DM不可、プロフィール閲覧不可

### pending（登録済みだが未課金）
- メール認証と生年月日登録は完了、プロフィールも作成済み
- 閲覧・投稿の権限はゲスト相当（段階Aの先頭3返信まで）
- マイページから課金すると associate に昇格

### 準会員（月額180円／年額1800円）
- 認証、メアド＋パスワード＋生年月日自己申告＋クレカ課金
- 閲覧、段階A・Bの6カテゴリ完全閲覧、段階Cはタイトルのみ
- 投稿、段階Aのみ、1日1投稿まで
- DM不可、オフ会参加不可

### 正会員（月額480円／年額4800円）
- 認証、生年月日の確実な確認（身分証画像）＋クレカ課金
- 準会員からの昇格条件、プラン変更＋身分証審査承認の両方完了
- 閲覧、全12カテゴリ完全閲覧
- 投稿、全カテゴリ投稿自由
- DM可、オフ会参加可（入会3カ月以上）
- 「本人確認済」バッジ表示

## 掲示板カテゴリ（12個）

### 段階A、ゲスト閲覧可・準会員投稿可
1. 昭和43年の記憶
2. 青春時代・バブル入社組
3. 今ハマっている趣味
4. 雑談・ひとりごと

### 段階B、準会員から閲覧可、正会員のみ投稿可
5. 地元・出身地
6. 仕事・キャリアの今

### 段階C、正会員のみ閲覧・投稿可
7. 親のこと・介護
8. 子ども・孫のこと
9. 夫婦・パートナー
10. 健康・体のこと
11. お金・老後資金

### 段階D、正会員のみ、入会3カ月以上で参加
12. オフ会・集まり

## データベース設計

### users
- id（UUID、auth.users.id と同値）
- email（auth.users から複製、検索用）
- created_at
- status、審査中／有効／停止／退会
- membership_rank、guest／pending（登録済みだが未課金）／associate（準会員）／regular（正会員）
- stripe_customer_id
- 注、password_hash は auth.users 側で管理するため public.users には持たない

### admins（運営スタッフ）
- id（UUID、users.id とは別管理）
- user_id（users.id、任意リンク）
- email
- role、super_admin／moderator／support
- mfa_enabled、二段階認証必須
- created_at
- last_login_at

### profiles
- user_id（users.id）
- nickname（必須）
- birth_year、1968固定（DB制約）
- birth_month
- birth_day
- gender
- prefecture、都道府県のみ
- hometown、出身地の市区町村まで
- school、卒業した学校（任意）
- occupation、職業区分
- introduction、自己紹介200字
- avatar_url
- bio_visible、プロフィールの公開範囲設定

### verifications（身分証審査）
- user_id
- document_type、マイナカード／保険証／免許証
- submitted_at
- verified_at
- verified_by（admins.id）
- status、未審査／承認／却下
- image_storage_path、30日後にnull化
- rejection_reason

### categories
- id
- name
- description
- display_order
- access_level_view、ゲスト／準会員／正会員
- access_level_post、準会員／正会員
- posting_limit_per_day、投稿上限（準会員向け）

### threads
- id
- category_id
- user_id
- title
- body
- created_at
- updated_at
- view_count
- reply_count
- is_locked

### replies
- id
- thread_id
- user_id
- body
- created_at
- parent_reply_id（ネスト対応）

### likes
- user_id
- target_type、thread／reply
- target_id
- created_at

### reports（違反報告）
- reporter_id
- target_type
- target_id
- reason
- status、未対応／対応中／完了
- handled_at
- handled_by（admins.id）

### messages（DM、正会員のみ）
- id
- sender_id
- receiver_id
- body
- created_at
- read_at

### subscriptions（課金）
- user_id
- stripe_subscription_id
- plan_type、associate_monthly／associate_yearly／regular_monthly／regular_yearly
- status、active／past_due／canceled
- started_at
- canceled_at

### topics（今週のお題）
- id
- title
- body
- published_at、配信開始日時
- expires_at、掲載終了日時（任意）
- created_by（admins.id）
- is_active

### audit_logs（運営監査）
- admin_id（admins.id）
- action
- target_type
- target_id
- timestamp
- ip_address

## 画面一覧

### 公開画面（未ログイン）
1. トップページ（サービス紹介、価格、入会案内）
2. ゲスト用掲示板（段階Aの限定表示、スレッドごとに先頭3返信まで）
3. ログイン
4. 新規登録
5. パスワードリセット
6. 利用規約
7. プライバシーポリシー
8. 特商法表示

### 準会員・正会員共通
9. ホーム（新着投稿、今週のお題、お知らせ）
10. 掲示板カテゴリ一覧
11. カテゴリ別スレッド一覧
12. スレッド詳細・返信
13. 投稿作成・編集
14. 自分のプロフィール編集
15. 他会員のプロフィール表示
16. マイページ（課金状況、プラン変更、退会、通知設定）
17. 身分証アップロード（準会員→正会員昇格時）

### 正会員限定
18. DM一覧・DM詳細
19. オフ会一覧・申込（入会3カ月以上）

### 管理画面（運営専用）
20. 会員管理（一覧、検索、ステータス変更）
21. 身分証確認画面
22. 違反報告管理
23. お知らせ投稿
24. 今週のお題配信（topics テーブル管理）
25. 売上・会員数ダッシュボード
26. 監査ログ閲覧

## セキュリティ要件（必須）

### 認証と権限
- Supabase Authのマジックリンク方式を推奨
- 行レベルセキュリティ（RLS）を全テーブルに適用
- 管理者アカウント（admins）は二段階認証必須

### 身分証画像の取り扱い
- アップロードは暗号化保存（Supabase Storage）
- 確認後30日以内に完全削除（image_storage_path を null 化＋Storage から削除）
- GPS位置情報は自動削除
- 運営の確認担当者（admins.role=moderator 以上）のみアクセス可能

### 通信と保存
- HTTPS必須、TLS1.3、HSTS有効化
- 機密データはアプリケーション側でAES-256追加暗号化
- 全データは日次自動バックアップ（Supabase Pro）

### 攻撃対策
- Cloudflare WAFで一般的な攻撃をブロック（DNS 移管後）
- ログイン試行回数制限（5回失敗で30分ロック）
- 投稿数・DM送信数のレート制限
- XSS、CSRF、SQLインジェクション対策（標準ライブラリ使用）

### 監視とログ
- 管理画面アクセスは全て audit_logs に記録
- Sentryでエラー検知
- 不審なアクセスパターンを自動アラート

## 法的要件

### 特定商取引法に基づく表示

- 販売事業者、油谷和好
- 所在地、〒542-0081 大阪府大阪市中央区南船場3丁目2番22号おおきに南船場ビル205
- 電話番号、0722003799
- メールアドレス、support@1968.love
- 販売価格、準会員 月額180円／年額1800円、正会員 月額480円／年額4800円
- 支払い方法、クレジットカード（Stripe）
- 解約、マイページからいつでも解約可能
- 返金ポリシー、原則返金なし（虚偽申告発覚時は返金なく退会処分）

### 個人情報保護
- 個人情報保護法に準拠
- 要配慮個人情報の適切な取り扱い
- 漏洩時の72時間以内報告フロー

### 利用規約の重要項目
- 虚偽申告は返金なく退会処分
- 政治・宗教・陰謀論の投稿禁止
- 恋愛目的・交際相手探しの禁止
- 商品宣伝・営業目的の禁止
- 金銭貸借・投資勧誘・宗教勧誘の禁止

## UI/UXガイドライン

### ターゲットの特性
- 50代後半、男女比は半々程度
- スマホ閲覧が7割、PC閲覧3割
- リテラシーは中程度、mixi世代

### デザイン方針
- フォントサイズ、本文16px以上
- 行間、1.7〜1.8倍
- タップ領域、最低44×44px
- コントラスト比、WCAG AA準拠
- 色調、墨・紺・生成り系の落ち着いたトーン
- 若者向けの派手色（ピンク、蛍光色）は使用禁止
- 日本語フォント、Noto Sans JP 等の読みやすい和文フォントを使用

### トーン＆マナー
- 敬語ベース、親しみやすさはニュアンスで
- 「おじさん・おばさん」などの加齢を揶揄する表現は禁止
- 昭和の懐かしさを感じる言葉遣い（例、「会報」「集まり」「語らい」）

## 開発の進め方（フェーズ別）

### フェーズ1、環境構築とHello World（1週間）
- Next.js 16プロジェクト雛形確認
- 共通レイアウト（ヘッダー、フッター、フォント、配色トーン）
- Supabaseプロジェクト連携、疎通確認
- 環境変数運用ルール（.env.local／.env.example）
- GitHubリポジトリ初期プッシュ
- Vercelデプロイ、カスタムドメイン（1968.love）設定

### フェーズ2、認証と会員管理（2週間）
- メール＋マジックリンク認証（パスワードレス、50代配慮で最もシンプルな方式）
- ユーザープロフィール作成・編集
- 会員ランク管理（ゲスト／準会員／正会員）、新規登録直後は `pending` 仮状態、フェーズ4でクレカ課金成功時に `associate` へ昇格
- スキーマは3層構造、`auth.users`（Supabase管理）＋ `public.users`（status/rank/stripe_id）＋ `public.profiles`（個人情報）
- スキーマ管理は Supabase CLI＋マイグレーションファイル（`supabase/migrations/*.sql`）を git 管理
- RLS ポリシーを全テーブルに定義（テーブル作成と同時）
- `proxy.ts`（Next.js 16 仕様、旧 middleware）でセッションリフレッシュ
- Vitest 導入、主要ロジックのテスト必須

### フェーズ3、掲示板機能（3週間）
- カテゴリ表示
- スレッド作成・一覧・詳細
- 返信機能
- いいね
- 閲覧・投稿権限の制御（ゲストはスレッドごとに先頭3返信まで）

### フェーズ4、決済統合（2週間）
- Stripeサブスクリプション設定
- 登録フロー
- 請求管理、退会処理
- 準会員→正会員のプラン変更フロー

### フェーズ5、身分証確認（2週間）
- 画像アップロード
- 管理画面での確認
- 30日後自動削除バッチ
- プラン変更＋身分証承認の両方完了で正会員昇格

### フェーズ6、管理画面（1週間）
- 会員一覧・検索
- 違反報告管理
- 今週のお題配信
- ダッシュボード

### フェーズ7、通知・メール（1週間）
- 登録確認、決済確認、お題配信（Resend）

### フェーズ8、セキュリティ強化（2週間）
- RLS徹底確認
- DNS のムームー→Cloudflare 移管
- Cloudflare WAF 設定
- レート制限

### フェーズ9、法務対応（並行）
- 規約類整備

### フェーズ10、セキュリティ診断と公開（2週間）
- 外部診断
- 修正
- 本番公開

## Claude Codeへの指示方針

### 作業時の原則
1. 1タスクずつ、小さく作ってテストする
2. セキュリティに関わる実装は、必ず公式ドキュメントを参照してから書く
3. Supabase RLSポリシーは、テーブル作成と同時に必ず定義する
4. 環境変数（.env.local）はGitHubに絶対コミットしない
5. テストコード（Vitest）を主要機能には必ず書く
6. Next.js 16 の破壊的変更は本ファイル「Next.js 16 の注意点」節と `node_modules/next/dist/docs/` を常に参照

### 作業の粒度
- 1回の作業は最大でも「1機能」に留める
- 複雑な機能は、さらに小さいタスクに分解してから実装する
- 「掲示板を作って」のような大雑把な指示ではなく、「スレッド一覧画面を作って」のように具体化する

### コーディング規約
- 変数・関数名は英語、コメントは日本語
- ファイル名はケバブケース（例、user-profile.tsx）
- コンポーネントはPascalCase（例、UserProfile）
- 関数はcamelCase

### 禁止事項
- any型の多用
- 認証なしのAPI公開
- 個人情報のコンソール出力
- 同期的な重い処理
