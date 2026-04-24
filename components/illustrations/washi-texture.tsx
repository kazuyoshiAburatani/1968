// 和紙のような点在模様、ヒーロー背景として薄く敷く。
// SVG パターンを repeat で画面全体に広げる。
export function WashiTexture({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="washi-dots"
          x="0"
          y="0"
          width="60"
          height="60"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="8" cy="12" r="1.2" fill="currentColor" opacity="0.25" />
          <circle cx="34" cy="26" r="0.9" fill="currentColor" opacity="0.2" />
          <circle cx="52" cy="8" r="0.7" fill="currentColor" opacity="0.18" />
          <circle cx="14" cy="44" r="1.0" fill="currentColor" opacity="0.22" />
          <circle cx="46" cy="50" r="1.3" fill="currentColor" opacity="0.26" />
          <circle cx="26" cy="54" r="0.6" fill="currentColor" opacity="0.15" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#washi-dots)" />
    </svg>
  );
}
