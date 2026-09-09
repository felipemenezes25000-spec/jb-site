import Link from "next/link";
import {
  BadgeCheck,
  Boxes,
  GitCompareArrows,
  PackageSearch,
  Wrench,
} from "lucide-react";

const ATALHOS = [
  {
    href: "/loja",
    icone: Boxes,
    rotulo: "Todos os equipamentos",
    apoio: "Catálogo completo",
  },
  {
    href: "/seminovos",
    icone: BadgeCheck,
    rotulo: "Seminovos JB",
    apoio: "Revisados e com garantia",
  },
  {
    href: "/pecas-e-acessorios",
    icone: PackageSearch,
    rotulo: "Peças e acessórios",
    apoio: "Encontre por necessidade",
  },
  {
    href: "/comparar",
    icone: GitCompareArrows,
    rotulo: "Comparar equipamentos",
    apoio: "Até 3 lado a lado",
  },
  {
    href: "/assistencia-tecnica/solicitar",
    icone: Wrench,
    rotulo: "Assistência técnica",
    apoio: "Abrir chamado",
  },
] as const;

export function AtalhosHome() {
  return (
    <nav
      aria-label="Acesso rápido à loja"
      className="relative z-10 border-b border-graf-950 bg-white"
    >
      <div className="container-jb max-w-[112rem] py-4">
        <div className="mb-3 flex items-center justify-between gap-4 lg:hidden">
          <p className="text-[0.66rem] font-black uppercase tracking-[0.17em] text-graf-950">
            Navegue rápido
          </p>
          <span className="h-px flex-1 bg-jb-200" aria-hidden />
        </div>

        <ul className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
          {ATALHOS.map(({ href, icone: Icone, rotulo, apoio }, indice) => (
            <li key={href} className="min-w-[14.5rem] snap-start lg:min-w-0">
              <Link
                href={href}
                className="group foco-jb flex min-h-[5.2rem] items-center gap-3.5 rounded-xl border border-graf-950 bg-white px-4 py-3 text-graf-950 transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-jb-500 hover:shadow-raised"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-jb-500 text-white transition-transform duration-200 group-hover:rotate-[-5deg] group-hover:scale-105">
                  <Icone className="size-[1.05rem]" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.64rem] font-black uppercase tracking-[0.15em] text-jb-700">
                    0{indice + 1}
                  </span>
                  <strong className="mt-0.5 block text-[0.82rem] font-black leading-tight text-graf-950">
                    {rotulo}
                  </strong>
                  <small className="mt-1 block text-[0.7rem] font-bold leading-tight text-graf-950">
                    {apoio}
                  </small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
