"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { FileText, Plus, Search } from "lucide-react";

import {
  salvarAdicionais,
  salvarDocumentos,
  salvarEspecificacoes,
  salvarRelacionados,
  type EstadoAcao,
} from "@/app/acoes/admin-catalogo";
import { ListaEditavel } from "@/components/admin/catalogo/lista-editavel";
import { BarraSalvar, Bloco, RegiaoEstado } from "@/components/admin/catalogo/moldura-form";
import { Botao } from "@/components/ui/button";
import { CampoMoeda } from "@/components/ui/campos-br";
import { EnviarArquivo, type ArquivoEnviado } from "@/components/ui/enviar-arquivo";
import { Campo, Marcador, Selecao } from "@/components/ui/form";
import { formatarPreco } from "@/lib/format";
import { cn } from "@/lib/utils";

/* ============================================================================
   Abas de lista do produto

   Quatro telas com o mesmo desenho: uma lista ordenável, um campo escondido
   com o JSON e um botão que salva só aquela aba. O servidor apaga e regrava as
   linhas dentro de uma transação, então nunca sobra meia lista.
   ============================================================================ */

/* ------------------------------------------------------- especificações */

export type LinhaSpec = { group: string; label: string; value: string };

export function FormularioEspecificacoes({
  produtoId,
  iniciais,
  gruposSugeridos,
  somenteLeitura,
}: {
  produtoId: string;
  iniciais: LinhaSpec[];
  gruposSugeridos: string[];
  somenteLeitura?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAcao, FormData>(
    salvarEspecificacoes,
    {},
  );
  const [linhas, setLinhas] = useState<LinhaSpec[]>(iniciais);
  const idLista = "grupos-de-especificacao";

  const grupos = useMemo(() => {
    const todos = new Set([...gruposSugeridos, ...linhas.map((linha) => linha.group)]);
    return [...todos].filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [gruposSugeridos, linhas]);

  const incompletas = linhas.filter(
    (linha) => linha.label.trim() === "" || linha.value.trim() === "",
  ).length;

  return (
    <Bloco
      titulo="Ficha técnica"
      descricao="Cada linha vira uma dupla rótulo/valor na página do produto. A ordem daqui é a ordem lá."
    >
      <form action={enviar} className="space-y-6">
        <input type="hidden" name="id" value={produtoId} />
        <input
          type="hidden"
          name="itens"
          value={JSON.stringify(
            linhas.map((linha) => ({
              group: linha.group.trim(),
              label: linha.label.trim(),
              value: linha.value.trim(),
            })),
          )}
        />
        <RegiaoEstado estado={estado} />

        <datalist id={idLista}>
          {grupos.map((grupo) => (
            <option key={grupo} value={grupo} />
          ))}
        </datalist>

        <ListaEditavel<LinhaSpec>
          itens={linhas}
          aoMudar={setLinhas}
          desabilitado={somenteLeitura}
          nomeDaLinha="especificação"
          rotuloAdicionar="Adicionar especificação"
          vazio="Nenhuma especificação. Comece por voltagem, dimensões e garantia."
          novoItem={() => ({ group: "Ficha técnica", label: "", value: "" })}
          renderizar={(linha, _indice, atualizar) => (
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo
                rotulo="Grupo"
                list={idLista}
                value={linha.group}
                onChange={(evento) => atualizar({ group: evento.target.value })}
                maxLength={80}
                placeholder="Ficha técnica"
              />
              <Campo
                rotulo="Rótulo"
                value={linha.label}
                onChange={(evento) => atualizar({ label: evento.target.value })}
                maxLength={120}
                required
                placeholder="Voltagem"
              />
              <Campo
                rotulo="Valor"
                value={linha.value}
                onChange={(evento) => atualizar({ value: evento.target.value })}
                maxLength={400}
                required
                placeholder="Bivolt"
              />
            </div>
          )}
        />

        {!somenteLeitura ? (
          <BarraSalvar
            ajuda={
              incompletas > 0
                ? `${incompletas} linha(s) sem rótulo ou valor.`
                : "Salva apenas esta aba."
            }
          >
            <Botao type="submit" carregando={enviando} disabled={incompletas > 0}>
              Salvar ficha técnica
            </Botao>
          </BarraSalvar>
        ) : null}
      </form>
    </Bloco>
  );
}

/* ------------------------------------------------------------ documentos */

export type LinhaDocumento = { title: string; url: string; kind: string };

const TIPOS_DOCUMENTO = [
  { valor: "manual", rotulo: "Manual" },
  { valor: "ficha", rotulo: "Ficha técnica" },
  { valor: "certificado", rotulo: "Certificado / registro" },
  { valor: "garantia", rotulo: "Termo de garantia" },
  { valor: "outro", rotulo: "Outro" },
];

export function FormularioDocumentos({
  produtoId,
  iniciais,
  somenteLeitura,
}: {
  produtoId: string;
  iniciais: LinhaDocumento[];
  somenteLeitura?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAcao, FormData>(salvarDocumentos, {});
  const [linhas, setLinhas] = useState<LinhaDocumento[]>(iniciais);
  const jaAdicionados = useRef(new Set(iniciais.map((linha) => linha.url)));

  function receber(arquivos: ArquivoEnviado[]) {
    const novos: LinhaDocumento[] = [];
    for (const arquivo of arquivos) {
      if (jaAdicionados.current.has(arquivo.url)) continue;
      jaAdicionados.current.add(arquivo.url);
      novos.push({ title: arquivo.nome, url: arquivo.url, kind: "manual" });
    }
    if (novos.length === 0) return;
    setLinhas((atual) => [...atual, ...novos]);
  }

  const incompletas = linhas.filter(
    (linha) => linha.title.trim() === "" || linha.url.trim() === "",
  ).length;

  return (
    <Bloco
      titulo="Documentos"
      descricao="Manual, ficha do fabricante, certificado. Ficam disponíveis para baixar na página do produto."
    >
      <form action={enviar} className="space-y-6">
        <input type="hidden" name="id" value={produtoId} />
        <input
          type="hidden"
          name="itens"
          value={JSON.stringify(
            linhas.map((linha) => ({
              title: linha.title.trim(),
              url: linha.url.trim(),
              kind: linha.kind,
            })),
          )}
        />
        <RegiaoEstado estado={estado} />

        {!somenteLeitura ? (
          <EnviarArquivo
            rotulo="Enviar arquivo"
            ajuda="Envie o arquivo para gerar o endereço, ou cole um link já existente na linha abaixo."
            aceita={["image/jpeg", "image/png", "image/webp", ".pdf"]}
            multiplo
            aoEnviado={receber}
          />
        ) : null}

        <ListaEditavel<LinhaDocumento>
          itens={linhas}
          aoMudar={setLinhas}
          desabilitado={somenteLeitura}
          nomeDaLinha="documento"
          rotuloAdicionar="Adicionar link manualmente"
          vazio="Nenhum documento anexado."
          novoItem={() => ({ title: "", url: "", kind: "manual" })}
          renderizar={(linha, _indice, atualizar) => (
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem]">
              <Campo
                rotulo="Título"
                value={linha.title}
                onChange={(evento) => atualizar({ title: evento.target.value })}
                maxLength={160}
                required
                placeholder="Manual do usuário"
              />
              <Campo
                rotulo="Endereço do arquivo"
                value={linha.url}
                onChange={(evento) => atualizar({ url: evento.target.value })}
                maxLength={600}
                required
                placeholder="/uploads/manual.pdf"
              />
              <Selecao
                rotulo="Tipo"
                value={linha.kind}
                onChange={(evento) => atualizar({ kind: evento.target.value })}
              >
                {TIPOS_DOCUMENTO.map((tipo) => (
                  <option key={tipo.valor} value={tipo.valor}>
                    {tipo.rotulo}
                  </option>
                ))}
              </Selecao>
            </div>
          )}
        />

        {!somenteLeitura ? (
          <BarraSalvar
            ajuda={
              incompletas > 0
                ? `${incompletas} documento(s) sem título ou endereço.`
                : "Salva apenas esta aba."
            }
          >
            <Botao type="submit" carregando={enviando} disabled={incompletas > 0}>
              Salvar documentos
            </Botao>
          </BarraSalvar>
        ) : null}
      </form>
    </Bloco>
  );
}

/* ------------------------------------------------------------- adicionais */

export type ServicoDisponivel = { id: string; nome: string; precoCents: number | null; tipo: string };
export type LinhaAdicional = { serviceId: string; precoCents: number; usarPadrao: boolean; required: boolean };

export function FormularioAdicionais({
  produtoId,
  iniciais,
  servicos,
  somenteLeitura,
}: {
  produtoId: string;
  iniciais: LinhaAdicional[];
  servicos: ServicoDisponivel[];
  somenteLeitura?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAcao, FormData>(salvarAdicionais, {});
  const [linhas, setLinhas] = useState<LinhaAdicional[]>(iniciais);

  const usados = new Set(linhas.map((linha) => linha.serviceId));
  const livres = servicos.filter((servico) => !usados.has(servico.id));
  const semServico = linhas.filter((linha) => linha.serviceId === "").length;

  return (
    <Bloco
      titulo="Serviços adicionais"
      descricao="Instalação, treinamento, garantia estendida. Aparecem como opção na hora de comprar."
    >
      <form action={enviar} className="space-y-6">
        <input type="hidden" name="id" value={produtoId} />
        <input
          type="hidden"
          name="itens"
          value={JSON.stringify(
            linhas.map((linha) => ({
              serviceId: linha.serviceId,
              priceCents: linha.usarPadrao ? null : linha.precoCents,
              required: linha.required,
            })),
          )}
        />
        <RegiaoEstado estado={estado} />

        {servicos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-graf-300 bg-graf-50/60 px-4 py-6 text-center text-sm text-graf-500">
            Não há serviços cadastrados ainda. Crie um em Catálogo · Serviços para poder oferecê-lo
            junto deste produto.
          </p>
        ) : (
          <ListaEditavel<LinhaAdicional>
            itens={linhas}
            aoMudar={setLinhas}
            desabilitado={somenteLeitura}
            nomeDaLinha="serviço"
            rotuloAdicionar="Adicionar serviço"
            vazio="Nenhum serviço vinculado a este produto."
            limite={servicos.length}
            novoItem={() => ({
              serviceId: livres[0]?.id ?? "",
              precoCents: livres[0]?.precoCents ?? 0,
              usarPadrao: true,
              required: false,
            })}
            renderizar={(linha, _indice, atualizar) => {
              const servico = servicos.find((item) => item.id === linha.serviceId);
              return (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Selecao
                      rotulo="Serviço"
                      value={linha.serviceId}
                      onChange={(evento) => atualizar({ serviceId: evento.target.value })}
                      required
                    >
                      <option value="">Escolha um serviço</option>
                      {servicos
                        .filter((item) => item.id === linha.serviceId || !usados.has(item.id))
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nome}
                          </option>
                        ))}
                    </Selecao>

                    {linha.usarPadrao ? (
                      <div>
                        <p className="mb-1.5 text-sm font-semibold text-graf-800">Preço</p>
                        <p className="flex h-11 items-center rounded-lg border border-graf-200 bg-graf-50 px-3.5 text-sm text-graf-600">
                          {servico?.precoCents === null || servico?.precoCents === undefined
                            ? "Sob orçamento (preço do serviço)"
                            : `${formatarPreco(servico.precoCents)} (preço do serviço)`}
                        </p>
                      </div>
                    ) : (
                      <CampoMoeda
                        rotulo="Preço só neste produto"
                        valorCents={linha.precoCents}
                        aoMudar={(centavos) => atualizar({ precoCents: centavos })}
                        ajuda="Substitui o preço padrão do serviço."
                      />
                    )}
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-3">
                    <Marcador
                      rotulo="Usar o preço padrão do serviço"
                      checked={linha.usarPadrao}
                      onChange={(evento) => atualizar({ usarPadrao: evento.target.checked })}
                    />
                    <Marcador
                      rotulo="Obrigatório"
                      ajuda="Vai junto do produto, sem opção de recusar."
                      checked={linha.required}
                      onChange={(evento) => atualizar({ required: evento.target.checked })}
                    />
                  </div>
                </div>
              );
            }}
          />
        )}

        {!somenteLeitura && servicos.length > 0 ? (
          <BarraSalvar
            ajuda={semServico > 0 ? `${semServico} linha(s) sem serviço escolhido.` : "Salva apenas esta aba."}
          >
            <Botao type="submit" carregando={enviando} disabled={semServico > 0}>
              Salvar adicionais
            </Botao>
          </BarraSalvar>
        ) : null}
      </form>
    </Bloco>
  );
}

/* ----------------------------------------------------------- relacionados */

export type ProdutoEscolhivel = { id: string; nome: string; sku: string; condicao: string };

export function FormularioRelacionados({
  produtoId,
  iniciais,
  catalogo,
  somenteLeitura,
}: {
  produtoId: string;
  iniciais: string[];
  catalogo: ProdutoEscolhivel[];
  somenteLeitura?: boolean;
}) {
  const [estado, enviar, enviando] = useActionState<EstadoAcao, FormData>(salvarRelacionados, {});
  const [escolhidos, setEscolhidos] = useState<string[]>(iniciais);
  const [busca, setBusca] = useState("");

  const porId = useMemo(
    () => new Map(catalogo.map((produto) => [produto.id, produto])),
    [catalogo],
  );

  const termo = busca.trim().toLowerCase();
  const sugestoes = useMemo(() => {
    if (termo.length < 2) return [];
    return catalogo
      .filter(
        (produto) =>
          produto.id !== produtoId &&
          !escolhidos.includes(produto.id) &&
          (produto.nome.toLowerCase().includes(termo) || produto.sku.toLowerCase().includes(termo)),
      )
      .slice(0, 8);
  }, [catalogo, escolhidos, produtoId, termo]);

  return (
    <Bloco
      titulo="Produtos relacionados"
      descricao="Aparecem como sugestão na página deste produto. A ordem daqui é a ordem lá."
    >
      <form action={enviar} className="space-y-6">
        <input type="hidden" name="id" value={produtoId} />
        <input type="hidden" name="itens" value={JSON.stringify(escolhidos)} />
        <RegiaoEstado estado={estado} />

        {!somenteLeitura ? (
          <div>
            <label htmlFor="busca-relacionado" className="mb-1.5 block text-sm font-semibold text-graf-800">
              Buscar produto
            </label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-graf-500"
                aria-hidden
              />
              <input
                id="busca-relacionado"
                type="search"
                autoComplete="off"
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Nome ou SKU — pelo menos 2 letras"
                className={cn(
                  "h-11 w-full rounded-lg border border-graf-300 bg-white pl-10 pr-3 text-sm text-graf-900 shadow-xs",
                  "placeholder:text-graf-500 hover:border-graf-400",
                  "focus:border-jb-500 focus:outline-none focus:ring-4 focus:ring-jb-500/15",
                )}
              />
            </div>

            <p aria-live="polite" className="sr-only">
              {termo.length < 2
                ? ""
                : sugestoes.length === 0
                  ? "Nenhum produto encontrado."
                  : `${sugestoes.length} produto(s) encontrado(s).`}
            </p>

            {termo.length >= 2 ? (
              sugestoes.length === 0 ? (
                <p className="mt-3 text-sm text-graf-500">Nenhum produto encontrado com esse termo.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {sugestoes.map((produto) => (
                    <li key={produto.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setEscolhidos((atual) => [...atual, produto.id]);
                          setBusca("");
                        }}
                        className={cn(
                          "flex min-h-11 w-full items-center gap-3 rounded-lg border border-graf-200 bg-white px-3 py-2 text-left transition-colors",
                          "hover:border-jb-300 hover:bg-jb-50/40",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500",
                        )}
                      >
                        <Plus className="size-4 shrink-0 text-jb-600" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-graf-900">
                            {produto.nome}
                          </span>
                          <span className="block truncate text-xs text-graf-500">
                            {produto.sku} · {produto.condicao}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </div>
        ) : null}

        <ListaEditavel<string>
          itens={escolhidos}
          aoMudar={setEscolhidos}
          desabilitado={somenteLeitura}
          nomeDaLinha="produto relacionado"
          rotuloAdicionar="Adicionar"
          ocultarAdicionar
          vazio="Nenhum produto relacionado. Use a busca acima para escolher."
          novoItem={() => ""}
          renderizar={(id) => {
            const produto = porId.get(id);
            return (
              <p className="flex min-h-11 items-center gap-2 text-sm">
                <FileText className="size-4 shrink-0 text-graf-500" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-graf-900">
                    {produto?.nome ?? "Produto removido do catálogo"}
                  </span>
                  {produto ? (
                    <span className="block truncate text-xs text-graf-500">
                      {produto.sku} · {produto.condicao}
                    </span>
                  ) : null}
                </span>
              </p>
            );
          }}
        />

        {!somenteLeitura ? (
          <BarraSalvar ajuda="Salva apenas esta aba.">
            <Botao type="submit" carregando={enviando}>
              Salvar relacionados
            </Botao>
          </BarraSalvar>
        ) : null}
      </form>
    </Bloco>
  );
}
