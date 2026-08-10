import Script from "next/script";

// 解析タグ、Microsoft Clarity、Google Analytics 4、Meta ピクセル。
// 本番環境のみ発火、開発・プレビューでは ID 無し or NODE_ENV != production で読み込まない。
// クライアントスクリプトは next/script の afterInteractive 戦略で読み込む。
//   - 初期 HTML には載らないので Core Web Vitals に響かない
//   - hydration 完了後、ブラウザがアイドルになってから挿入される

export function Analytics() {
  if (process.env.NODE_ENV !== "production") return null;

  const clarityId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  // Meta ピクセル。広告の成果計測と、サイトを見た人への再配信に使う。
  // 訪問者の記録は入れた日からしか貯まらないので、広告を回す前に入れておくこと。
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;

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
      {pixelId && (
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){
            n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
            t=b.createElement(e);t.async=!0;t.src=v;
            s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
            document,'script','https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');`}
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
