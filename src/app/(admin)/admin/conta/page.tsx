import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleUser, ShieldCheck } from "lucide-react";

import { FormularioSenhaStaff } from "@/components/admin/formulario-senha-staff";
import { CabecalhoDeSecao } from "@/components/admin/conteudo/cabecalho";
import { Aviso } from "@/components/ui/aviso";
import { Cartao, CabecalhoCartao, Etiqueta } from "@/components/ui/data";
import { formatarDataHora } from "@/lib/format";
import { DESCRICAO_PAPEL, ROTULO_PAPEL, exigirStaffAdmin } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

/*
 * Toda tela do painel lê a sessão do staff antes de qualquer outra coisa, e
 * sessão é dado de requisição: nenhuma delas prerenderiza, nem deveria.
 *
 * `instant = false` é a saída documentada, e o guia é explícito em que ela vale
 * para o SEGMENTO que levanta a validação — não cascateia do layout
 * (node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md,
 * "Adopting incrementally"). Sem esta linha em cada página, a validação dispara
 * na compilação sob demanda e o vigia de console do E2E derruba o teste que
 * estiver rodando na hora.
 */
export const instant = false;

export const metadata: Metadata = {
  title: "Minha conta",
  description: "Seus dados de acesso ao painel e troca da própria senha.",
};

/**
 * Minha conta — a tela de cada pessoa da equipe, não uma área do backoffice.
 *
 * Por isso a guarda é `exigirStaffAdmin()` e não `exigirArea(...)`: não existe
 * área "conta" em `@/lib/permissoes`, e não deveria existir — qualquer papel
 * abre a sua, ninguém abre a de outra pessoa. Não há parâmetro de rota aqui
 * justamente para que não haja o que adulterar: o id vem sempre da sessão.
 *
 * Nome, e-mail e papel são somente leitura. Quem muda isso é um administrador
 * em Usuários — deixar a pessoa editar o próprio papel seria escada para
 * qualquer um virar admin.
 */
export default async function PaginaMinhaConta() {
  const sessao = await exigirStaffAdmin();

  // Os dados vêm do banco, não do cookie: o token dura 8h e pode estar velho
  // em relação ao papel, ao nome e à situação do acesso.
  const pessoa = await prisma.user.findUnique({
    where: { id: sessao.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  // O registro sumiu do banco com o cookie ainda válido — não há conta para
  // mostrar. Limpar o cookie aqui não é possível (renderização de página não
  // escreve cookie neste App Router), então a tela de entrada resolve.
  if (!pessoa) redirect("/admin/entrar");

  // Linha sem valor sai da lista: telefone em branco não vira "não informado".
  const telefone = pessoa.phone?.trim();
  const dados: { rotulo: string; valor: string }[] = [
    { rotulo: "Nome", valor: pessoa.name },
    { rotulo: "E-mail", valor: pessoa.email },
    ...(telefone ? [{ rotulo: "Telefone", valor: telefone }] : []),
    { rotulo: "Papel", valor: ROTULO_PAPEL[pessoa.role] },
    {
      rotulo: "Último acesso",
      valor: pessoa.lastLoginAt
        ? formatarDataHora(pessoa.lastLoginAt)
        : "Este é o seu primeiro acesso",
    },
    { rotulo: "Acesso criado em", valor: formatarDataHora(pessoa.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <CabecalhoDeSecao
        titulo="Minha conta"
        descricao="Seus dados de acesso ao painel e a troca da sua senha."
        etiqueta={
          pessoa.active ? (
            <Etiqueta tom="ok" ponto>
              Acesso ativo
            </Etiqueta>
          ) : (
            <Etiqueta tom="neutro" ponto>
              Acesso desativado
            </Etiqueta>
          )
        }
      />

      {!pessoa.active ? (
        <Aviso tom="atencao" titulo="Este acesso está desativado">
          Você continua na sessão aberta até ela expirar, mas não conseguirá entrar de novo.
          Fale com um administrador.
        </Aviso>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Cartao>
          <CabecalhoCartao
            titulo={
              <span className="flex items-center gap-2">
                <CircleUser className="size-4 text-graf-500" aria-hidden />
                Seus dados
              </span>
            }
            descricao="Para corrigir nome, e-mail ou papel, peça a um administrador."
          />
          <dl className="divide-y divide-graf-100">
            {dados.map((linha) => (
              <div
                key={linha.rotulo}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-5 py-3"
              >
                <dt className="text-sm text-graf-500">{linha.rotulo}</dt>
                <dd className="min-w-0 break-words text-right text-sm font-semibold text-graf-900">
                  {linha.valor}
                </dd>
              </div>
            ))}
          </dl>
          <div className="border-t border-graf-200 bg-graf-50 px-5 py-3">
            <p className="text-[0.8125rem] leading-relaxed text-graf-600">
              <span className="font-semibold text-graf-800">
                {ROTULO_PAPEL[pessoa.role]}:
              </span>{" "}
              {DESCRICAO_PAPEL[pessoa.role]}.
            </p>
          </div>
        </Cartao>

        <Cartao>
          <CabecalhoCartao
            titulo={
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-graf-500" aria-hidden />
                Trocar a senha
              </span>
            }
            descricao="Se você entrou com uma senha temporária, troque-a agora."
          />
          <div className="px-5 py-4">
            <FormularioSenhaStaff />

            <div className="mt-5 space-y-2 border-t border-graf-200 pt-4 text-[0.8125rem] leading-relaxed text-graf-500">
              <p>
                A sessão do painel dura 8 horas. Trocar a senha não desconecta os aparelhos
                onde você já está dentro — se perdeu um celular ou deixou o painel aberto em
                outro computador, peça a um administrador para gerar uma senha temporária e
                desativar o acesso enquanto isso.
              </p>
              {/* Sem link para /admin/usuarios: a área é só de administrador e
                  quem não é seria mandado de volta com erro de permissão. */}
              <p>
                Perdeu a senha e não consegue entrar? Um administrador gera uma temporária
                para você em Usuários. Não há recuperação por e-mail para a equipe.
              </p>
            </div>
          </div>
        </Cartao>
      </div>
    </div>
  );
}
