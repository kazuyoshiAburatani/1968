import Script from "next/script";

// 解析タグ、Microsoft Clarity と Google Analytics 4。
// 本番環境のみ発火、開発・プレビューでは ID 無し or NODE_ENV != production で読み込まない。
// クライアントスクリプトは next/script の afterInteractive 戦略で読み込む。
//   - 初期 HTML には載らないので Core Web Vitals に響かない
//   - hydration 完了後、ブラウザがアイドルになってから挿入される

export function Analytics() {
  if (process.env.NODE_ENV !== "production") return null;

  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <>
      {clarityId && (
        <Script id="clarity-init" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){
            c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
            t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
            y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
          })(window, document, "clarity", "script", "${clarityId}");`}
        </Script>
      )}
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${gaId}', { anonymize_ip: true });`}
          </Script>
        </>
      )}
    </>
  );
}
