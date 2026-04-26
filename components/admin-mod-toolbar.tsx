"use client";

import { useState } from "react";
import {
  adminDeleteReply,
  adminDeleteThread,
  adminEditReply,
  adminEditThread,
} from "@/app/board/[slug]/[thread]/admin-actions";

// 管理者にだけ表示する小さなモデレーションツールバー、
// 編集／削除をその場で行えるアコーディオン。誤操作防止のため
// 削除は確認ダイアログを挟む。

type ThreadProps = {
  kind: "thread";
  slug: string;
  threadId: string;
  title: string;
  body: string;
};

type ReplyProps = {
  kind: "reply";
  slug: string;
  threadId: string;
  replyId: string;
  body: string;
};

type Props = ThreadProps | ReplyProps;

export function AdminModToolbar(props: Props) {
  const [open, setOpen] = useState<"none" | "edit" | "delete">("none");
  const [draftTitle, setDraftTitle] = useState(
    props.kind === "thread" ? props.title : "",
  );
  const [draftBody, setDraftBody] = useState(props.body);
  const [editReason, setEditReason] = useState("");
  const [deleteReason, setDeleteReason] = useState("");

  return (
    <div className="mt-2 inline-block">
      {open === "none" && (
        <div className="inline-flex items-center gap-1.5">
          <span className="inline-block px-1.5 py-px rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
            運営
          </span>
          <button
            type="button"
            onClick={() => setOpen("edit")}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-900 text-[11px] font-medium hover:bg-amber-100"
          >
            <i className="ri-pencil-line text-xs" aria-hidden />
            編集
          </button>
          <button
            type="button"
            onClick={() => setOpen("delete")}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-rose-300 bg-rose-50 text-rose-900 text-[11px] font-medium hover:bg-rose-100"
          >
            <i className="ri-delete-bin-line text-xs" aria-hidden />
            削除
          </button>
        </div>
      )}

      {open === "edit" && (
        <form
          action={
            props.kind === "thread" ? adminEditThread : adminEditReply
          }
          className="mt-2 w-full max-w-xl rounded-xl border border-amber-300 bg-amber-50/40 p-3 space-y-2"
        >
          <input type="hidden" name="slug" value={props.slug} />
          <input
            type="hidden"
            name="thread_id"
            value={props.threadId}
          />
          {props.kind === "reply" && (
            <input type="hidden" name="reply_id" value={props.replyId} />
          )}
          {props.kind === "thread" && (
            <input
              type="text"
              name="title"
              required
              maxLength={120}
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full px-3 py-2 rounded border border-border bg-background text-sm font-bold"
              placeholder="タイトル"
            />
          )}
          <textarea
            name="body"
            required
            rows={props.kind === "thread" ? 6 : 4}
            maxLength={props.kind === "thread" ? 5000 : 3000}
            value={draftBody}
            onChange={(e) => setDraftBody(e.target.value)}
            className="w-full px-3 py-2 rounded border border-border bg-background text-sm leading-7"
            placeholder="本文"
          />
          <input
            type="text"
            name="reason"
            value={editReason}
            onChange={(e) => setEditReason(e.target.value)}
            maxLength={300}
            placeholder="編集理由（任意、監査ログに残ります）"
            className="w-full px-3 py-2 rounded border border-border bg-background text-xs"
          />
          <p className="text-[11px] text-amber-900">
            ⚠ 運営として {props.kind === "thread" ? "スレッド" : "返信"} を編集します。
            投稿者の表示には「運営により編集されました」と明記され、
            監査ログ（/admin/audit-logs）に記録されます。
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex items-center min-h-[36px] px-4 rounded-full bg-primary text-white text-xs font-medium active:opacity-90"
            >
              この内容で保存
            </button>
            <button
              type="button"
              onClick={() => setOpen("none")}
              className="inline-flex items-center min-h-[36px] px-3 rounded-full border border-border text-xs"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}

      {open === "delete" && (
        <form
          action={
            props.kind === "thread" ? adminDeleteThread : adminDeleteReply
          }
          className="mt-2 w-full max-w-xl rounded-xl border border-rose-300 bg-rose-50/60 p-3 space-y-2"
        >
          <input
            type="hidden"
            name="id"
            value={props.kind === "thread" ? props.threadId : props.replyId}
          />
          <input type="hidden" name="slug" value={props.slug} />
          {props.kind === "reply" && (
            <input type="hidden" name="thread_id" value={props.threadId} />
          )}
          <p className="text-sm font-bold text-rose-900">
            本当に削除しますか？
          </p>
          <p className="text-xs text-rose-900/80 leading-6">
            {props.kind === "thread"
              ? "スレッド本体と紐づく返信・いいね・通報を一括で削除します。元に戻せません。"
              : "この返信を削除します。元に戻せません。"}
          </p>
          <input
            type="text"
            name="reason"
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            required
            maxLength={300}
            placeholder="削除理由（必須、監査ログに残ります）例：規約違反、個人情報を含む"
            className="w-full px-3 py-2 rounded border border-rose-300 bg-background text-xs"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={deleteReason.trim().length === 0}
              className="inline-flex items-center min-h-[36px] px-4 rounded-full bg-rose-700 text-white text-xs font-medium active:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              削除する
            </button>
            <button
              type="button"
              onClick={() => setOpen("none")}
              className="inline-flex items-center min-h-[36px] px-3 rounded-full border border-border text-xs bg-background"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
