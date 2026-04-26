# Supabase データバックアップ運用ガイド

1968 本番データベースの定期バックアップと復旧手順。
正式公開前に最低 1 度は手動バックアップを試しておく。

---

## TL;DR、最低限やること

| 作業 | 頻度 | 所要時間 |
|---|---|---|
| Free プランの自動バックアップが有効か確認 | 一度だけ | 1 分 |
| Storage バケット内ファイルの初回ダウンロード | 月 1 回 | 5 分 |
| `pg_dump` による手動 SQL ダンプ | 週 1 回 | 5 分 |
| ダンプを Google Drive / Dropbox にアップロード | 週 1 回 | 5 分 |
| 復旧テスト（test プロジェクトで） | 半年 1 回 | 30 分 |

---

## 1. Supabase の自動バックアップを把握する

| プラン | 自動バックアップ | 保持期間 | Point-in-Time Recovery（PITR） |
|---|---|---|---|
| Free | あり、毎日 | 7 日 | なし |
| Pro $25/mo | あり、毎日 | 14 日 | 7 日まで遡及可 |
| Team $599/mo | あり、毎日 | 14 日 | 28 日まで遡及可 |

**1968 は現状 Free プラン**、自動で毎日バックアップが取られているため、**7 日以内のクラッシュなら Supabase 側で復旧依頼可能**。

### 確認方法
1. https://supabase.com/dashboard/project/gouctopluwgejgmwvyew/database/backups
2. 「Daily backups」セクションに過去 7 日分のスナップショットが並ぶ
3. もし表示されていない場合は Support に問い合わせ

### 制限
- Free では復旧操作は **Supabase サポート経由**、自分でワンクリック復旧はできない
- Pro 以上にすればダッシュボードから直接復旧できる

---

## 2. 自分で取る、推奨手順

Supabase の自動バックアップはあるが、**ベンダーロックインのリスク回避**と **任意の時点に戻せる安心感**のため、自分でも定期的に取得する。

### 2-A、SQL ダンプ（pg_dump 経由、週 1 回）

ローカルマシン or サーバーから、

```bash
# 一度だけ、接続文字列を取得
# Supabase Dashboard → Project Settings → Database → Connection String → URI
# 形式、postgresql://postgres.xxxxx:[PASSWORD]@aws-0-xxx.pooler.supabase.com:5432/postgres

# ダンプ取得（スキーマ・データすべて）
DATABASE_URL='postgresql://postgres.xxx:[YOUR_DB_PASSWORD]@aws-0-xxx.pooler.supabase.com:5432/postgres'

pg_dump "$DATABASE_URL" \
  --schema=public \
  --schema=auth \
  --schema=storage \
  --no-owner \
  --no-privileges \
  --format=custom \
  --file="1968-backup-$(date +%Y%m%d).dump"

# サイズ確認
ls -lh 1968-backup-*.dump

# Google Drive 等にアップロード（rclone 推奨）
# rclone copy 1968-backup-$(date +%Y%m%d).dump gdrive:1968-backups/
```

### 2-B、Storage バケット内ファイルのバックアップ（月 1 回）

身分証画像（30 日で削除されるため不要）と post-media（投稿の添付画像・動画）。

```bash
# Supabase CLI を使った同期、Pro 以上は Storage Sync API がある
npx supabase storage cp "ss://post-media/*" "./storage-backup-$(date +%Y%m%d)/" --recursive

# または手動、Dashboard → Storage → 該当バケット → 全選択 → Download
```

### 2-C、cron で自動化（任意）

VPS や macOS の launchd / cron で自動実行、

```cron
# 毎週日曜 03:00 に SQL ダンプ＋ Drive アップロード
0 3 * * 0 /home/user/scripts/backup-1968.sh
```

`backup-1968.sh` の例、

```bash
#!/bin/bash
set -euo pipefail

DUMP="$HOME/backups/1968-$(date +%Y%m%d).dump"
DATABASE_URL='postgresql://postgres.xxx:[PASSWORD]@aws-0-xxx.pooler.supabase.com:5432/postgres'

pg_dump "$DATABASE_URL" \
  --schema=public --schema=auth --schema=storage \
  --no-owner --no-privileges --format=custom --file="$DUMP"

# Drive へアップロード
rclone copy "$DUMP" gdrive:1968-backups/

# 90 日より古いローカルダンプを削除
find "$HOME/backups" -name "1968-*.dump" -mtime +90 -delete

# Slack 通知（任意）
# curl -X POST -H 'Content-type: application/json' \
#   --data "{\"text\":\"1968 backup OK ${DUMP}\"}" \
#   "$SLACK_WEBHOOK"
```

---

## 3. 復旧手順

### 3-A、Supabase 自動バックアップから戻す（Free プラン）
1. Supabase サポートに連絡（dashboard 右下のチャット or support@supabase.io）
2. プロジェクト ID `gouctopluwgejgmwvyew` と、復旧したいバックアップ日時を伝える
3. 通常 1〜数時間で対応
4. 注意、**復旧後は最後のバックアップ以降のデータが消える**

### 3-B、自分の SQL ダンプから戻す
新しい Supabase プロジェクトを作成し、ダンプから復元、

```bash
# 1. 復旧先プロジェクトの接続情報を取得
NEW_DATABASE_URL='postgresql://postgres.yyy:[NEW_PASSWORD]@aws-0-yyy.pooler.supabase.com:5432/postgres'

# 2. リストア
pg_restore --dbname="$NEW_DATABASE_URL" \
  --no-owner --no-privileges \
  --clean --if-exists \
  1968-backup-20260425.dump

# 3. アプリの環境変数を新プロジェクトに切り替え
# Vercel → Settings → Environment Variables
#   NEXT_PUBLIC_SUPABASE_URL を更新
#   NEXT_PUBLIC_SUPABASE_ANON_KEY を更新
#   SUPABASE_SERVICE_ROLE_KEY を更新

# 4. Vercel 再デプロイ
```

---

## 4. 災害シナリオごとの対処

| シナリオ | 対処 |
|---|---|
| アプリのバグでデータが破壊された | 自動バックアップから戻す（Pro なら PITR で 1 時間前を選択） |
| Supabase のリージョン全体障害 | 自分の SQL ダンプから別リージョンに復旧 |
| Supabase アカウントの BAN | ダンプを使って別の PostgreSQL プロバイダ（Neon / Railway / Render）に移行 |
| 油谷さんアカウントへのアクセス喪失 | Supabase の Organization に共同管理者を最低 1 名追加しておく |

---

## 5. やっておきたい初期設定（一度だけ）

### 5-A、組織に共同管理者を追加
1 人運営の最大リスクは、油谷さんがアクセスできなくなることです。

1. https://supabase.com/dashboard/org/_/team
2. 信頼できる第三者（家族、共同創業者、顧問）のメールを招待
3. 役割は "Owner" または "Admin"
4. 緊急連絡網として記録

### 5-B、Supabase アカウントの 2FA 設定
1. https://supabase.com/dashboard/account/security
2. Authenticator app または FIDO2 セキュリティキー
3. Recovery code を別の安全な場所に保管（プリントアウト or 1Password 等）

### 5-C、データベースパスワードの保管
- パスワードマネージャ（1Password、Bitwarden）に
- 平文での Slack / Discord / メール送信は厳禁

### 5-D、Vercel 環境変数の控え
- 全環境変数を Vercel から JSON エクスポート
- パスワードマネージャ or 暗号化したテキストファイルに保管

---

## 6. Pro プランへの移行を検討すべきタイミング

以下に該当したら $25/mo の Pro へ、

- 会員数 100 人を超えた → ベータ運用本格化
- 投稿数 1,000 件を超えた → データの価値が増す
- ダウンタイム許容時間が 1 時間未満になった → PITR が必要
- 監査ログ・コンプライアンスを意識し始めた → 14 日保持が必要
- セッション Timebox を設定したい → 一部機能は Pro 以上

---

## 7. 月次運用チェックリスト

毎月最終週に以下を確認、

- [ ] Supabase Dashboard → Database → Backups で過去 7 日の自動バックアップが揃っている
- [ ] 自分が取った週次 SQL ダンプが直近 4 週分すべて Drive にある
- [ ] dump のサイズが急に小さく / 大きくなっていない（破損兆候）
- [ ] Storage バケット容量が警告レベルに近づいていないか
- [ ] Supabase アカウントの 2FA が有効になっている
- [ ] 共同管理者がアクセス可能な状態である

---

## 参考リンク

- Supabase Backups 公式、https://supabase.com/docs/guides/platform/backups
- pg_dump 公式、https://www.postgresql.org/docs/current/app-pgdump.html
- rclone（Drive アップロード）、https://rclone.org/drive/
