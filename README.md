# 1968（イチキューロクハチ）

1968年生まれ限定の会員制コミュニティWebアプリ

- 本番ドメイン、https://1968.love
- リポジトリ、https://github.com/kazuyoshiAburatani/1968

詳細な仕様は [CLAUDE.md](./CLAUDE.md) を参照。

## 開発環境のセットアップ

### 必要なもの
- Node.js 20.9以上（推奨 22 LTS）
- npm
- Supabaseアカウント
- Stripeアカウント
- Vercelアカウント
- Claude Code

### 初回セットアップ

1. リポジトリをクローン

```bash
git clone https://github.com/kazuyoshiAburatani/1968.git
cd 1968
```

2. パッケージインストール

```bash
npm install
```

3. 環境変数を設定

`.env.local` を作成し、以下を記載（値は各サービスのダッシュボードから取得）。

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
```

4. 開発サーバー起動

```bash
npm run dev
```

## デプロイ

GitHub の main ブランチにプッシュすると Vercel が自動デプロイ。

## 主要コマンド

- `npm run dev`、開発サーバー起動（Turbopackデフォルト）
- `npm run build`、本番ビルド
- `npm run start`、本番起動
- `npm run lint`、ESLintチェック
