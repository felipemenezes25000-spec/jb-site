import type { Metadata } from "next";
import Link from "next/link";
import { HardHat, Plus } from "lucide-react";

import {
  CabecalhoPagina,
  Dado,
  Dados,
  SUBNAV_SERVICO,
  SubNavegacao,
} from "@/components/admin/servico/cabecalho";
import { AreaAcao, CampoAcao, SelecaoAcao } from "@/components/admin/servico/campos";
import { FormularioAcao, Oculto } from "@/components/admin/servico/formulario";
import { PainelAcao } from "@/components/admin/servico/painel-acao";
import { CabecalhoCartao, Cartao, Etiqueta, Vazio } from "@/components/ui/data";
import { alternarTecnicoAtivo, salvarTecnico } from "@/app/acoes/admin-servico";
import { STATUS_CHAMADO_ABERTOS } from "@/lib/assistencia";
import { formatarData, plural } from "@/lib/format";
import { STATUS_VISITA_ABERTOS } from "@/lib/manutencao";
import { STATUS_OS_ABERTOS } from "@/lib/os";
import { ROTULO_PAPEL, exigirArea, podeEditar } from "@/lib/permissoes";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Técnicos",
};

/**
 * Equipe de campo.
 *
 * `Technician` estende um `User` já existente: aqui não se cria conta nem se
 * muda papel de acesso — isso é da área de Usuários. O que se decide aqui é
 * quem atende em campo, com quais especialidades e em que cor aparece na
 * agenda.
 *
 * A carga é contada de verdade: chamados em aberto ligados às visitas da
 * pessoa, ordens de serviço abertas e visitas preventivas a fazer. É o número
 * que responde "posso mandar mais um para ele hoje?".
 */

type CargaDoTecnico = {
  ordens: number;
  visitasTecnicas: number;
  preventivas: number;
};

export default async function PaginaTecnicos() {
  const usuario = await exigirArea("tecnicos");
  const editar = podeEditar(usuario, "tecnicos");

  const [tecnicos, semVinculo] = await Promise.all([
    prisma.technician.findMany({
      orderBy: [{ active: "desc" }, { user: { name: "asc" } }],
      select: {
        id: true,
        specialties: true,
        active: true,
        colorTag: true,
        createdAt: true,
        userId: true,
        user: { select: { id: true, name: true, email: true, role: true, active: true } },
      },
    }),
    // pessoas da equipe que ainda não são técnicos — é a lista do "novo técnico"
    prisma.user.findMany({
      where: { active: true, technician: { is: null } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true, role: true },
    }),
  ]);

  const ids = tecnicos.map((tecnico) => tecnico.id);

  const [porOS, porVisita, porPreventiva] =
    ids.length === 0
      ? [[], [], []]
      : await Promise.all([
          prisma.workOrder.groupBy({
            by: ["technicianId"],
            where: { technicianId: { in: ids }, status: { in: STATUS_OS_ABERTOS } },
            _count: { _all: true },
          }),
          prisma.serviceAppointment.groupBy({
            by: ["technicianId"],
            where: {
              technicianId: { in: ids },
              status: { in: ["agendado", "em_andamento"] },
              request: { is: { status: { in: STATUS_CHAMADO_ABERTOS } } },
            },
            _count: { _all: true },
          }),
          prisma.maintenanceVisit.groupBy({
            by: ["technicianId"],
            where: { technicianId: { in: ids }, status: { in: STATUS_VISITA_ABERTOS } },
            _count: { _all: true },
          }),
        ]);

  const carga = new Map<string, CargaDoTecnico>(
    ids.map((id) => [id, { ordens: 0, visitasTecnicas: 0, preventivas: 0 }]),
  );
  for (const linha of porOS) {
    const atual = carga.get(linha.technicianId ?? "");
    if (atual) atual.ordens = linha._count._all;
  }
  for (const linha of porVisita) {
    const atual = carga.get(linha.technicianId ?? "");
    if (atual) atual.visitasTecnicas = linha._count._all;
  }
  for (const linha of porPreventiva) {
    const atual = carga.get(linha.technicianId ?? "");
    if (atual) atual.preventivas = linha._count._all;
  }

  return (
    <div className="space-y-6">
      <CabecalhoPagina
        titulo="Técnicos"
        descricao="Quem atende em campo, com que especialidade e quanto já está na mão de cada um."
        acoes={
          editar ? (
            <PainelAcao
              rotulo="Novo técnico"
              icone={<Plus className="size-4" aria-hidden />}
              variante="primario"
              tamanho="md"
              titulo="Cadastrar técnico"
              descricao="Escolha alguém da equipe interna. O acesso ao painel continua sendo definido em Usuários."
              acao={salvarTecnico}
              rotuloConfirmar="Cadastrar"
              desabilitado={semVinculo.length === 0}
              motivoDesabilitado={
                semVinculo.length === 0
                  ? "Todos os usuários ativos já são técnicos."
                  : undefined
              }
            >
              <SelecaoAcao rotulo="Pessoa da equipe" name="userId" required>
                <option value="">Selecione…</option>
                {semVinculo.map((pessoa) => (
                  <option key={pessoa.id} value={pessoa.id}>
                    {pessoa.name} — {ROTULO_PAPEL[pessoa.role]}
                  </option>
                ))}
              </SelecaoAcao>
              <AreaAcao
                rotulo="Especialidades"
                name="especialidades"
                rows={3}
                ajuda="Uma por linha ou separadas por vírgula. Até 20."
                placeholder={"Autoclave\nCadeira odontológica\nRaio-X"}
              />
              <CampoAcao
                rotulo="Cor na agenda"
                name="cor"
                type="color"
                defaultValue="#e0141b"
                ajuda="Aparece como um ponto ao lado do compromisso. O nome do técnico vem sempre escrito junto."
              />
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  name="ativo"
                  defaultChecked
                  className="mt-0.5 size-[18px] shrink-0 rounded border-graf-300 text-jb-500 focus:ring-2 focus:ring-jb-500/30"
                />
                <span className="text-sm text-graf-700">
                  <span className="font-medium text-graf-800">Ativo na escala</span>
                  <span className="mt-0.5 block text-xs text-graf-500">
                    Só técnico ativo aparece nos formulários de agendamento.
                  </span>
                </span>
              </label>
            </PainelAcao>
          ) : null
        }
      />

      <SubNavegacao itens={SUBNAV_SERVICO} atual="/admin/tecnicos" />

      {tecnicos.length === 0 ? (
        <Vazio
          icone={HardHat}
          titulo="Nenhum técnico cadastrado"
          descricao="Sem técnico cadastrado, não é possível atribuir chamados, agendar visitas nem montar a agenda."
          acao={
            editar ? undefined : (
              <Link
                href="/admin/manutencao"
                className="text-sm font-semibold text-jb-700 hover:text-jb-500"
              >
                Voltar para manutenção
              </Link>
            )
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {tecnicos.map((tecnico) => {
            const numeros = carga.get(tecnico.id) ?? {
              ordens: 0,
              visitasTecnicas: 0,
              preventivas: 0,
            };
            const total = numeros.ordens + numeros.visitasTecnicas + numeros.preventivas;

            return (
              <li key={tecnico.id}>
                <Cartao className="h-full">
                  <CabecalhoCartao
                    titulo={
                      <span className="flex items-center gap-2">
                        {tecnico.colorTag ? (
                          <span
                            aria-hidden
                            className="size-3 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                            style={{ backgroundColor: tecnico.colorTag }}
                          />
                        ) : null}
                        {tecnico.user.name}
                      </span>
                    }
                    descricao={tecnico.user.email}
                    acao={
                      <Etiqueta tom={tecnico.active ? "ok" : "neutro"}>
                        {tecnico.active ? "Na escala" : "Fora da escala"}
                      </Etiqueta>
                    }
                  />

                  <div className="space-y-5 px-5 py-5">
                    <Dados colunas={3}>
                      <Dado rotulo="OS abertas">
                        <span className="tabular text-lg font-bold text-graf-950">
                          {numeros.ordens}
                        </span>
                      </Dado>
                      <Dado rotulo="Visitas técnicas">
                        <span className="tabular text-lg font-bold text-graf-950">
                          {numeros.visitasTecnicas}
                        </span>
                      </Dado>
                      <Dado rotulo="Preventivas">
                        <span className="tabular text-lg font-bold text-graf-950">
                          {numeros.preventivas}
                        </span>
                      </Dado>
                    </Dados>

                    <p className="text-sm text-graf-600">
                      {total === 0
                        ? "Sem trabalho em aberto no momento."
                        : `${plural(total, "atendimento em aberto", "atendimentos em aberto")} no total.`}{" "}
                      <Link
                        href={`/admin/agenda?tecnico=${tecnico.id}`}
                        className="font-semibold text-jb-700 hover:text-jb-500"
                      >
                        Ver na agenda
                      </Link>
                    </p>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-graf-500">
                        Especialidades
                      </p>
                      {tecnico.specialties.length === 0 ? (
                        <p className="mt-1 text-sm text-graf-500">Nenhuma cadastrada</p>
                      ) : (
                        <ul className="mt-1.5 flex flex-wrap gap-1.5">
                          {tecnico.specialties.map((especialidade) => (
                            <li key={especialidade}>
                              <Etiqueta tom="neutro">{especialidade}</Etiqueta>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <Dados>
                      <Dado rotulo="Papel no painel">{ROTULO_PAPEL[tecnico.user.role]}</Dado>
                      <Dado rotulo="Técnico desde">{formatarData(tecnico.createdAt)}</Dado>
                    </Dados>

                    {!tecnico.user.active ? (
                      <p className="rounded-lg bg-warn-50 px-3 py-2.5 text-sm text-warn-700 ring-1 ring-inset ring-warn-500/25">
                        O usuário desta pessoa está desativado no painel: ela não consegue entrar
                        no sistema, mesmo aparecendo na escala.
                      </p>
                    ) : null}

                    {editar ? (
                      <div className="flex flex-wrap items-center gap-2 border-t border-graf-200 pt-4">
                        <PainelAcao
                          rotulo="Editar"
                          titulo={`Editar ${tecnico.user.name}`}
                          acao={salvarTecnico}
                          rotuloConfirmar="Salvar"
                        >
                          <Oculto nome="tecnicoId" valor={tecnico.id} />
                          <Oculto nome="userId" valor={tecnico.userId} />
                          <AreaAcao
                            rotulo="Especialidades"
                            name="especialidades"
                            rows={3}
                            defaultValue={tecnico.specialties.join("\n")}
                            ajuda="Uma por linha ou separadas por vírgula."
                          />
                          <CampoAcao
                            rotulo="Cor na agenda"
                            name="cor"
                            type="color"
                            defaultValue={tecnico.colorTag ?? "#e0141b"}
                          />
                          <label className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              name="ativo"
                              defaultChecked={tecnico.active}
                              className="mt-0.5 size-[18px] shrink-0 rounded border-graf-300 text-jb-500 focus:ring-2 focus:ring-jb-500/30"
                            />
                            <span className="text-sm text-graf-700">
                              <span className="font-medium text-graf-800">Ativo na escala</span>
                            </span>
                          </label>
                        </PainelAcao>

                        <FormularioAcao
                          acao={alternarTecnicoAtivo}
                          rotulo={tecnico.active ? "Tirar da escala" : "Voltar à escala"}
                          variante={tecnico.active ? "perigo" : "secundario"}
                          tamanho="sm"
                          className="space-y-0"
                        >
                          <Oculto nome="tecnicoId" valor={tecnico.id} />
                          <input
                            type="hidden"
                            name="ativo"
                            value={tecnico.active ? "" : "on"}
                          />
                        </FormularioAcao>
                      </div>
                    ) : null}
                  </div>
                </Cartao>
              </li>
            );
          })}
        </ul>
      )}

      {editar && semVinculo.length > 0 ? (
        <p className="text-sm text-graf-500">
          {plural(semVinculo.length, "pessoa da equipe ainda não é técnica", "pessoas da equipe ainda não são técnicas")}.
          Cadastrar aqui não muda o acesso ao painel — isso continua sendo definido em{" "}
          <Link href="/admin/usuarios" className="font-semibold text-jb-700 hover:text-jb-500">
            Usuários
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
