import Script from "next/script";

/**
 * O site antigo injetava o ga.js (legado). Mesma função, com o gtag atual:
 * só entra quando há um código configurado no painel.
 */
export function Analytics({ id }: { id: string }) {
  if (!id.trim()) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`}
        strategy="afterInteractive"
      />
      <Script id="ga" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${id}');`}
      </Script>
    </>
  );
}
