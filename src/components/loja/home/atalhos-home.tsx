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
    rotulo: "Equipamentos",
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
    rotulo: "Comparar",
    apoio: "Até 3 lado a lado",
  },
  {
    href: "/assistencia-tecnica/solicitar",
    icone: Wrench,
    rotulo: "Assistência",
    apoio: "Direto com a equipe JB",
  },
] as const;

export function AtalhosHome() {
  return (
    <nav aria-label="Acesso rápido à loja" className="relative z-10 bg-white py-4 sm:py-5">
      <div className="container-jb max-w-[112rem]">
        <div className="flex items-center gap-4 pb-3 lg:hidden">
          <p className="text-[0.64rem] font-black uppercase tracking-[0.18em] text-jb-700">
            Acesso rápido
          </p>
          <span className="h-px flex-1 bg-jb-100" aria-hidden />
        </div>

        <ul className="flex snap-x snap-mandatory overflow-x-auto rounded-full bg-[#fff9f9] shadow-[0_18px_50px_-40px_rgba(115,12,18,0.45)] ring-1 ring-jb-100/80 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ATALHOS.map(({ href, icone: Icone, rotulo, apoio }, indice) => (
            <li
              key={href}
              className="relative min-w-[15.2rem] flex-1 snap-start after:absolute after:inset-y-4 after:right-0 after:w-px after:bg-jb-100 last:after:hidden"
            >
              <Link
                href={href}
                className="group foco-jb flex min-h-[5rem] items-center gap-3.5 rounded-full px-4 py-3 text-graf-950 transition-[background-color,transform] duration-200 hover:bg-white hover:-translate-y-px sm:px-5"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-jb-700 shadow-[0_10px_24px_-18px_rgba(133,12,18,0.7)] ring-1 ring-jb-100 transition-[transform,background-color,color] duration-200 group-hover:-rotate-6 group-hover:scale-105 group-hover:bg-jb-500 group-hover:text-white">
                  <Icone className="size-[1.05rem]" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.58rem] font-black uppercase tracking-[0.16em] text-jb-700">
                    0{indice + 1}
                  </span>
                  <strong className="mt-0.5 block text-[0.82rem] font-black leading-tight text-graf-950">
                    {rotulo}
                  </strong>
                  <small className="mt-1 block text-[0.69rem] font-semibold leading-tight text-graf-950/65">
                    {apoio}
                  </small>
                </span>
                <span
                  className="ml-auto size-1.5 shrink-0 rounded-full bg-jb-300 transition-transform duration-200 group-hover:scale-150 group-hover:bg-jb-500"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
