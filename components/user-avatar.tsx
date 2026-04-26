import Image from "next/image";

// 表示用ユーザーアバター。
// avatarUrl が指定されていれば画像表示、無ければニックネームの 1 文字目で代替。
// AI ペルソナの場合は緑系の絵文字バッジ表示。

type Props = {
  name: string | null;
  avatarUrl?: string | null;
  isAi?: boolean;
  size?: number;
};

export function UserAvatar({ name, avatarUrl, isAi, size = 40 }: Props) {
  const display = name ?? "—";
  const initial = display.slice(0, 1) || "—";

  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={`${display} のプロフィール画像`}
        width={size}
        height={size}
        className="rounded-full object-cover bg-muted shrink-0"
        style={{ width: size, height: size }}
        unoptimized
      />
    );
  }

  return (
    <span
      aria-hidden
      className={`shrink-0 inline-flex items-center justify-center rounded-full font-bold ${
        isAi
          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
          : "bg-muted text-foreground/70"
      }`}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {isAi ? "💁‍♀️" : initial}
    </span>
  );
}
