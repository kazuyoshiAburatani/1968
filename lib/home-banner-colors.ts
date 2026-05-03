// マイホーム上部「あいさつバー」のプリセットカラー。
// プロフィール編集画面で会員が好きなものを選べる。
// 各色には「背景色 / 文字色」のペアを定義し、コントラストを担保する。

export type BannerColorKey =
  | "default"
  | "ivory"
  | "navy"
  | "mustard"
  | "sakura"
  | "bamboo"
  | "ash"
  | "charcoal";

export type BannerColor = {
  key: BannerColorKey;
  label: string;
  bg: string;
  fg: string;
};

export const BANNER_COLORS: Record<BannerColorKey, BannerColor> = {
  default: {
    key: "default",
    label: "白（既定）",
    bg: "#ffffff",
    fg: "#1f1f1f",
  },
  ivory: {
    key: "ivory",
    label: "生成り",
    bg: "#f8f4ec",
    fg: "#1f1f1f",
  },
  navy: {
    key: "navy",
    label: "紺",
    bg: "#1e3a5f",
    fg: "#ffffff",
  },
  mustard: {
    key: "mustard",
    label: "辛子",
    bg: "#8b6f3d",
    fg: "#ffffff",
  },
  sakura: {
    key: "sakura",
    label: "桜",
    bg: "#f3d6db",
    fg: "#1f1f1f",
  },
  bamboo: {
    key: "bamboo",
    label: "若草",
    bg: "#dceadc",
    fg: "#1f1f1f",
  },
  ash: {
    key: "ash",
    label: "灰桜",
    bg: "#e8e0ce",
    fg: "#1f1f1f",
  },
  charcoal: {
    key: "charcoal",
    label: "墨",
    bg: "#1f1f1f",
    fg: "#ffffff",
  },
};

export const BANNER_COLOR_KEYS = Object.keys(BANNER_COLORS) as BannerColorKey[];

// DB に入った値からカラーを解決、未設定や不正な値なら default を返す
export function resolveBannerColor(
  value: string | null | undefined,
): BannerColor {
  if (value && value in BANNER_COLORS) {
    return BANNER_COLORS[value as BannerColorKey];
  }
  return BANNER_COLORS.default;
}
