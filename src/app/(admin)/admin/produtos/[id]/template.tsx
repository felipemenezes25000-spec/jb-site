"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { ArrowRight, Network } from "lucide-react";

export default function ProdutoAdminTemplate({ children }: { children: ReactNode }) {
  const params = useParams<{ id: string }>();
  const pathname = usePathname();
  const id = typeof params.id === "string" ? params.id : "";
  const naTelaDeCrossSell = pathname.endsWith("/relacionamentos");

  return (
    <>
      {!naTelaDeCrossSell && id ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-jb-200 bg-jb-50/55 px-4 py-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-jb-700 shadow-xs">
              <Network className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold text-graf-950">Cross-sell inteligente</p>
              <p className="mt-0.5 text-xs leading-5 text-graf-600">
                Classifique alternativas, acessórios e produtos complementares para a PDP não misturar intenções.
              </p>
            </div>
          </div>
          <Link
            href={`/admin/produtos/${id}/relacionamentos`}
            className="foco-jb inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-graf-950 px-3.5 text-xs font-extrabold text-white hover:bg-graf-800"
          >
            Configurar cross-sell
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      ) : null}
      {children}
    </>
  );
}
