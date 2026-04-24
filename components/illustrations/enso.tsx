// 円相（えんそう）、禅の象徴。墨一筆で描いた不完全な円。
// currentColor でテキスト色を継承、size prop で描画サイズを調整。
export function Enso({
  size = 180,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M100 18
           C 55 18, 18 55, 18 100
           C 18 145, 55 182, 100 182
           C 145 182, 182 145, 182 100
           C 182 62, 155 30, 118 21"
        fill="none"
        stroke="currentColor"
        strokeWidth="14"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 筆のかすれ再現、先端に細い尾 */}
      <path
        d="M118 21 Q 125 19, 132 22"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
