/**
 * Zona, cena e ponteiro do Motion System, gravados no `<html>`.
 *
 * As folhas `motion*.css` penduram as entradas de cena nesses atributos. Se
 * eles chegassem depois da primeira pintura — como chegavam, num `useEffect` —
 * toda entrada virava um piscar: o servidor pintava a página inteira, a
 * hidratação gravava a cena e a animação arrancava de `opacity: 0` por cima do
 * que a pessoa já estava lendo.
 *
 * A assistência pública agora é uma zona própria. Ela já tem coreografia e
 * reveal específicos dentro de `(site)`, então não precisa da aura/tilt e dos
 * efeitos herdados da antiga vitrine comercial.
 *
 * Por isso esta função roda duas vezes com o mesmo corpo: serializada num
 * `<script>` do `<head>` (antes de o navegador pintar o `<body>`) e no cliente,
 * a cada troca de rota, antes da pintura da rota nova. `toString()` leva só o
 * corpo — ela não pode depender de import, constante do módulo nem sintaxe que
 * peça helper do compilador.
 */
export function marcarCenaDoMotion(caminho: string) {
  const raiz = document.documentElement;
  const comeca = function (prefixo: string) {
    return caminho === prefixo || caminho.indexOf(prefixo + "/") === 0;
  };

  let zona = "assistencia";
  if (comeca("/admin")) zona = "admin";
  else if (comeca("/minha-jb")) zona = "clinica";
  else if (comeca("/checkout") || comeca("/carrinho")) zona = "checkout";
  else if (
    comeca("/entrar") ||
    comeca("/cadastro") ||
    comeca("/recuperar-senha") ||
    comeca("/redefinir-senha")
  ) {
    zona = "acesso";
  }

  let cena = "institucional";
  if (caminho === "/") cena = "home";
  else if (caminho === "/loja" || caminho === "/seminovos" || comeca("/categoria")) cena = "catalogo";
  else if (comeca("/loja")) cena = "produto";
  else if (comeca("/comparar")) cena = "comparador";
  else if (zona === "clinica" || zona === "checkout" || zona === "admin") cena = zona;

  const ponteiroFino = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  raiz.setAttribute("data-motion-enhanced", "true");
  raiz.setAttribute("data-motion-zone", zona);
  raiz.setAttribute("data-motion-scene", cena);
  raiz.setAttribute("data-motion-pointer", ponteiroFino ? "fine" : "coarse");
  if (reduzido) raiz.setAttribute("data-motion-reduced", "true");
  else raiz.removeAttribute("data-motion-reduced");
}

/** O `<script>` do `<head>`: falha de script vira "sem cena", nunca erro na página. */
export const SCRIPT_DA_CENA = `try{(${marcarCenaDoMotion.toString()})(location.pathname)}catch(e){}`;
