import Link from "next/link";
import { BadgeCheck, Boxes, PackageSearch, Wrench } from "lucide-react";

const ATALHOS = [
  {
    href: "/loja",
    icone: Boxes,
    rotulo: "Loja",
    apoio: "Todos os produtos",
  },
  {
    href: "/seminovos",
    icone: BadgeCheck,
    rotulo: "Seminovos",
    apoio: "Unidades disponíveis",
  },
  {
    href: "/pecas-e-acessorios",
    icone: PackageSearch,
    rotulo: "Peças e acessórios",
    apoio: "Reposição e complementos",
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
    <nav aria-label="Acesso rápido" className="border-b border-graf-200 bg-white">
      <div className="container-jb max-w-[100rem]">
        <ul className="grid sm:grid-cols-2 lg:grid-cols-4">
          {ATALHOS.map(({ href, icone: Icone, rotulo, apoio }, indice) => (
            <li
              key={href}
              className={indice > 0 ? "border-t border-graf-200 sm:border-t-0 sm:border-l" : ""}
            >
              <Link
                href={href}
                className="foco-jb group flex min-h-[5.2rem] items-center gap-3 px-1 py-4 sm:px-4 lg:px-5"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-graf-50 text-jb-700 transition-colors group-hover:bg-jb-50">
                  <Icone className="size-4.5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm font-bold text-graf-950 transition-colors group-hover:text-jb-700">
                    {rotulo}
                  </strong>
                  <small className="mt-0.5 block text-[0.8125rem] text-graf-500">{apoio}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
