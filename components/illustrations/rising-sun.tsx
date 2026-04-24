// Readdy の Associate デザインで使われる朝日モチーフに寄せたバージョン。
// 光線と太陽本体を組み合わせ、放射グラデーションで柔らかい印象に。
// 色は currentColor で親から継承、text-accent などで色を指定する。
export function RisingSun({
  size = 80,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={(size * 60) / 80}
      viewBox="0 0 80 60"
      className={className}
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="rising-sun-gradient" cx="50%" cy="100%" r="50%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.3" />
        </radialGradient>
      </defs>
      <path
        d="M40 60 L35 45 L25 50 L30 35 L15 35 L30 25 L25 10 L35 15 L40 0 L45 15 L55 10 L50 25 L65 35 L50 35 L55 50 L45 45 Z"
        fill="url(#rising-sun-gradient)"
      />
      <circle cx="40" cy="45" r="15" fill="url(#rising-sun-gradient)" />
    </svg>
  );
}
