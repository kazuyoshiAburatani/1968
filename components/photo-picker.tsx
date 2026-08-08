"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { shrinkImage } from "@/lib/image-client";
import { ACCEPT_ATTR } from "@/lib/image-accept";

// 写真を 1 枚選ぶところ。二択の一言にも、お題の回答にも、同じものを使う。
//
// 作りの決め手になったこと。
//
//  ・ボタンひとつで終わらせる。「添付」「アップロード」といった言い方をせず、
//    「写真を添える」と書く。選んだら小さく出て、その横に「消す」だけがある。
//    枚数の選択も、並べ替えも無い。迷う余地を残さない。
//
//  ・選んだ写真は、その場で見せる。送るまで何が選ばれたか分からない作りだと、
//    「これで合っているのか」が分からず、送る前に手が止まる。
//
//  ・位置情報を消していることを、選んだあとに 1 行だけ書く。
//    慎重な人はこの一行の有無で出すかどうかを決める。先に長々と書くと、
//    かえって危ないものに見えるので、選んだあとに出す。
//
//  ・実物の <input type="file"> を form の中に置いたままにする。
//    縮小した写真は DataTransfer で input に書き戻すので、
//    ふつうの form 送信でもそのまま送られる。JavaScript が動かない環境でも、
//    縮小されないだけで写真は送れる。

type Props = {
  /** form に入る name。FormData から取り出すときの鍵になる */
  name: string;
  /** 席がある人か。false のとき、押すと joinHref へ送る */
  enabled?: boolean;
  /** 席が無い人が押したときの行き先。文字列で受けるのは、
      サーバコンポーネントからも置けるようにするため（関数は渡せない） */
  joinHref?: string;
  /** 選択が変わったときに呼ばれる。クライアント側の親だけが使う */
  onChange?: (file: File | null) => void;
  /** 送信中は触れないようにする */
  disabled?: boolean;
  /** 押す前のボタンの文言 */
  label?: string;
  className?: string;
};

export function PhotoPicker({
  name,
  enabled = true,
  joinHref = "/join",
  onChange,
  disabled = false,
  label = "写真を選ぶ",
  className = "",
}: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  // 画面から消えるときに、作ったプレビュー URL を片づける
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function openPicker() {
    // 席が無い人には、ここで初めて席づくりの話をする。
    // 最初から「登録してください」と出すと読まずに閉じられるが、
    // 写真を出したいと思ったあとなら、30 秒の手間は納得して払ってもらえる。
    if (!enabled) {
      router.push(joinHref);
      return;
    }
    inputRef.current?.click();
  }

  async function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setWorking(true);
    try {
      // 送る前にここで小さくする。電波の弱い場所でも待たされないように。
      const small = await shrinkImage(file);

      // 縮小したものを input に書き戻す。こうしておけば、
      // ふつうの form 送信でも FormData 経由でも、小さいほうが送られる。
      if (typeof DataTransfer !== "undefined" && inputRef.current) {
        const dt = new DataTransfer();
        dt.items.add(small);
        inputRef.current.files = dt.files;
      }

      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(small));
      setFileName(small.name);
      onChange?.(small);
    } finally {
      setWorking(false);
    }
  }

  function clear() {
    if (inputRef.current) inputRef.current.value = "";
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFileName(null);
    onChange?.(null);
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={ACCEPT_ATTR}
        onChange={handlePick}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />

      {!preview ? (
        <button
          type="button"
          onClick={openPicker}
          disabled={disabled || working}
          className="inline-flex items-center gap-1.5 min-h-[var(--spacing-tap)] px-4 rounded-full border border-border bg-background text-sm text-foreground/75 hover:border-primary hover:text-primary active:bg-primary/10 transition-colors disabled:opacity-50"
        >
          <i className="ri-image-add-line text-lg" aria-hidden />
          {working ? "読み込み中" : label}
        </button>
      ) : (
        <div className="flex items-start gap-3">
          {/* 選んだ写真そのもの。原寸は要らないので小さく出す */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt={fileName ?? "選んだ写真"}
            className="h-20 w-20 rounded-xl border border-border object-cover"
          />
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={clear}
              disabled={disabled}
              className="min-h-[var(--spacing-tap)] px-3 rounded-full border border-border text-sm text-foreground/70 hover:border-notification hover:text-notification transition-colors disabled:opacity-50"
            >
              写真を消す
            </button>
            <p className="mt-1 text-xs leading-6 text-foreground/60">
              撮影場所の記録は消してから載せます。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
