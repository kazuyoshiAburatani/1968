// 朝日を思わせる放射状の線、正会員ダッシュボードの装飾用。
// 墨・金茶のアクセントで「新しい一日の始まり」を象徴。
export function SunLines({
  size = 160,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const cx = 100;
  const cy = 120;
  const innerR = 24;
  const outerR = 95;
  // 18度間隔で10本、半円（180度）に広げる
  const lines = Array.from({ length: 10 }, (_, i) => {
    const angle = Math.PI + (Math.PI * (i + 0.5)) / 10;
    const x1 = cx + innerR * Math.cos(angle);
    const y1 = cy + innerR * Math.sin(angle);
    const x2 = cx + outerR * Math.cos(angle);
    const y2 = cy + outerR * Math.sin(angle);
    return { x1, y1, x2, y2, key: i };
  });

  return (
    <svg
      viewBox="0 0 200 140"
      width={size}
      height={(size * 140) / 200}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {lines.map((l) => (
        <line
          key={l.key}
          x1={l.x1}
          y1={l.y1}
          x2={l.x2}
          y2={l.y2}
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.6"
        />
      ))}
      {/* 中心の太陽（半月形） */}
      <path
        d={`M ${cx - innerR} ${cy} A ${innerR} ${innerR} 0 0 1 ${cx + innerR} ${cy}`}
        fill="currentColor"
      />
    </svg>
  );
}
