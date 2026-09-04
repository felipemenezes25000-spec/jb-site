/**
 * As mesmas folhas de estilo do site original, na mesma ordem. Ficam só na
 * árvore do site público — o painel usa Tailwind e não pode herdar o
 * Bootstrap 3 daqui. O React 19 içá estas tags para o <head>.
 */
export function LegacyStyles() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css?family=Lato:300,400,700&display=swap"
        precedence="jb-0"
      />
      <link rel="stylesheet" href="/css/bootstrap.min.css" precedence="jb-1" />
      <link rel="stylesheet" href="/css/font-awesome.min.css" precedence="jb-2" />
      <link rel="stylesheet" href="/css/prettyPhoto.css" precedence="jb-3" />
      <link rel="stylesheet" href="/css/animate.css" precedence="jb-4" />
      <link rel="stylesheet" href="/css/main.css" precedence="jb-5" />
      <link
        rel="apple-touch-icon-precomposed"
        sizes="144x144"
        href="/images/ico/apple-touch-icon-144-precomposed.png"
      />
      <link
        rel="apple-touch-icon-precomposed"
        sizes="114x114"
        href="/images/ico/apple-touch-icon-114-precomposed.png"
      />
      <link
        rel="apple-touch-icon-precomposed"
        sizes="72x72"
        href="/images/ico/apple-touch-icon-72-precomposed.png"
      />
      <link
        rel="apple-touch-icon-precomposed"
        href="/images/ico/apple-touch-icon-57-precomposed.png"
      />
    </>
  );
}
