// 空状態の汎用コンポーネント。
// イラスト + 見出し + 補足説明 + 任意の CTA を縦に積む。
// イラストは public/illustrations 配下にあるブランドのアイボリー水彩タッチ。

import Image from "next/image";

type Variant = "threads" | "messages" | "notifications" | "pending";

const ILLUSTRATIONS: Record<Variant, { src: string; alt: string }> = {
  threads: {
    src: "/illustrations/empty-threads.png",
    alt: "開いたままのノートと湯呑み、まだ投稿がない様子",
  },
  messages: {
    src: "/illustrations/empty-messages.png",
    alt: "便箋と一輪の野花、まだメッセージがない様子",
  },
  notifications: {
    src: "/illustrations/empty-notifications.png",
    alt: "夕暮れの郵便受け、まだお知らせがない様子",
  },
  pending: {
    src: "/illustrations/empty-pending.png",
    alt: "ぱらぱらとめくられる手帳、審査中の様子",
  },
};

export function EmptyState({
  variant,
  title,
  description,
  children,
}: {
  variant: Variant;
  title: string;
  description?: string;
  /** ボタンや link を任意で */
  children?: React.ReactNode;
}) {
  const ill = ILLUSTRATIONS[variant];
  return (
    <div className="mx-auto max-w-md px-4 py-10 text-center">
      <Image
        src={ill.src}
        alt={ill.alt}
        width={400}
        height={300}
        className="mx-auto w-full max-w-[320px] h-auto"
        priority={false}
      />
      <h3 className="mt-4 text-lg font-bold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-foreground/70 leading-7">
          {description}
        </p>
      )}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
