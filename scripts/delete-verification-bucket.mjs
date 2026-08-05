#!/usr/bin/env node
// 身分証バケット（verification-documents）を中身ごと削除する。
//
// 2026-08-05 のリニューアルで身分証確認そのものを撤去したが、
// Storage は SQL からの直接削除が禁じられているため（storage.protect_delete）、
// Storage API を通す必要がある。DB 側の verifications テーブルは既に消えているので、
// バケットに残っている画像は行き場のない個人情報になっている。早めに消すこと。
//
// 使い方、
//   .env.local に本番の NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を入れた状態で、
//   node scripts/delete-verification-bucket.mjs
//
// 鍵は読み込むだけで、画面にも出力にも出さない。

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const BUCKET = "verification-documents";

function loadEnv() {
  const env = { ...process.env };
  try {
    const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !env[m[1]]) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // .env.local が無ければ環境変数だけで動かす
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です。",
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false },
});

async function main() {
  console.log(`対象、${new URL(url).host} の ${BUCKET}`);

  const { data: buckets, error: listBucketsError } =
    await supabase.storage.listBuckets();
  if (listBucketsError) {
    console.error("バケット一覧の取得に失敗しました、", listBucketsError.message);
    process.exit(1);
  }
  if (!buckets.some((b) => b.name === BUCKET)) {
    console.log("バケットは既にありません。作業は不要です。");
    return;
  }

  // 中身を再帰的に集める
  const paths = [];
  async function walk(prefix) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .list(prefix, { limit: 1000 });
    if (error) throw new Error(error.message);
    for (const item of data ?? []) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) {
        await walk(full); // フォルダ
      } else {
        paths.push(full);
      }
    }
  }
  await walk("");

  console.log(`${paths.length} 件のファイルが残っています。`);

  if (paths.length > 0) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths);
    if (error) {
      console.error("ファイルの削除に失敗しました、", error.message);
      process.exit(1);
    }
    console.log("ファイルを削除しました。");
  }

  const { error: deleteError } = await supabase.storage.deleteBucket(BUCKET);
  if (deleteError) {
    console.error("バケットの削除に失敗しました、", deleteError.message);
    process.exit(1);
  }
  console.log("バケットを削除しました。身分証画像は残っていません。");
}

main().catch((e) => {
  console.error("失敗しました、", e.message);
  process.exit(1);
});
