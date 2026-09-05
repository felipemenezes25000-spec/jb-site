"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertCircle, MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";

import {
  definirEnderecoPadrao,
  removerEndereco,
  salvarEndereco,
  type EstadoMinhaJb,
} from "@/app/acoes/minha-jb";
import { Botao } from "@/components/ui/button";
import { BotaoConfirmar } from "@/components/ui/confirmar";
import { CampoCep, type EnderecoCep } from "@/components/ui/campos-br";
import { Etiqueta, Vazio } from "@/components/ui/data";
import { Campo, Marcador } from "@/components/ui/form";
import { Painel } from "@/components/ui/painel";
import { formatarCep } from "@/lib/format";

/**
 * Endereços da conta.
 *
 * A lista é desenhada aqui a partir do que o servidor mandou, e o cadastro
 * acontece num painel — sem trocar de página, porque quase sempre se cadastra
 * endereço no meio de outra tarefa (abrir chamado, fechar pedido).
 *
 * O CEP puxa rua, bairro e cidade do ViaCEP e preenche os campos, que
 * continuam editáveis: CEP de quadra inteira não traz número, e endereço novo
 * às vezes ainda não está na base. O que vale é o que a pessoa confirma.
 */

export type EnderecoConta = {
  id: string;
  rotulo: string;
  destinatario: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  referencia: string;
  padrao: boolean;
};

const NOVO: EnderecoConta = {
  id: "",
  rotulo: "",
  destinatario: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  referencia: "",
  padrao: false,
};

function resumo(endereco: EnderecoConta) {
  return [
    [endereco.logradouro, endereco.numero].filter(Boolean).join(", "),
    endereco.complemento,
    endereco.bairro,
    [endereco.cidade, endereco.uf].filter(Boolean).join("/"),
  ]
    .filter(Boolean)
    .join(" — ");
}

function FormularioEndereco({
  valores,
  aoSalvar,
}: {
  valores: EnderecoConta;
  aoSalvar: () => void;
}) {
  const [estado, acao, enviando] = useActionState<EstadoMinhaJb, FormData>(
    salvarEndereco,
    {},
  );

  const [cep, setCep] = useState(valores.cep);
  const [logradouro, setLogradouro] = useState(valores.logradouro);
  const [bairro, setBairro] = useState(valores.bairro);
  const [cidade, setCidade] = useState(valores.cidade);
  const [uf, setUf] = useState(valores.uf);

  useEffect(() => {
    if (estado.ok) aoSalvar();
  }, [estado.ok, aoSalvar]);

  function preencher(encontrado: EnderecoCep) {
    if (encontrado.logradouro) setLogradouro(encontrado.logradouro);
    if (encontrado.bairro) setBairro(encontrado.bairro);
    if (encontrado.cidade) setCidade(encontrado.cidade);
    if (encontrado.uf) setUf(encontrado.uf);
  }

  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);
  const erroGeral = estado.erro && !estado.campo ? estado.erro : null;

  return (
    <form id="formulario-endereco" action={acao} noValidate className="space-y-5">
      {valores.id ? <input type="hidden" name="id" value={valores.id} /> : null}

      <p aria-live="polite" className="sr-only">
        {estado.campo ? estado.erro : ""}
      </p>

      {erroGeral ? (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-jb-200 bg-jb-50 px-4 py-3 text-sm leading-relaxed text-jb-800"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{erroGeral}</span>
        </p>
      ) : null}

      <Campo
        rotulo="Nome do endereço"
        name="rotulo"
        required
        maxLength={40}
        defaultValue={valores.rotulo}
        placeholder="Ex.: Clínica, Casa, Unidade 2"
        erro={erroDe("rotulo")}
      />

      <Campo
        rotulo="Quem recebe"
        name="destinatario"
        maxLength={120}
        autoComplete="name"
        defaultValue={valores.destinatario}
        ajuda="Deixe em branco para usar o nome do titular da conta."
        erro={erroDe("destinatario")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <CampoCep
          name="cep"
          valor={cep}
          aoMudar={setCep}
          aoEncontrar={preencher}
          required
          erro={erroDe("cep")}
        />

        <Campo
          rotulo="Número"
          name="numero"
          required
          maxLength={20}
          defaultValue={valores.numero}
          placeholder="Ex.: 200 ou S/N"
          erro={erroDe("numero")}
        />
      </div>

      <Campo
        rotulo="Rua ou avenida"
        name="logradouro"
        required
        maxLength={160}
        autoComplete="address-line1"
        value={logradouro}
        onChange={(evento) => setLogradouro(evento.currentTarget.value)}
        erro={erroDe("logradouro")}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          rotulo="Complemento"
          name="complemento"
          maxLength={80}
          defaultValue={valores.complemento}
          placeholder="Sala, bloco, andar"
          erro={erroDe("complemento")}
        />

        <Campo
          rotulo="Bairro"
          name="bairro"
          required
          maxLength={80}
          value={bairro}
          onChange={(evento) => setBairro(evento.currentTarget.value)}
          erro={erroDe("bairro")}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-[1fr_7rem]">
        <Campo
          rotulo="Cidade"
          name="cidade"
          required
          maxLength={80}
          value={cidade}
          onChange={(evento) => setCidade(evento.currentTarget.value)}
          erro={erroDe("cidade")}
        />

        <Campo
          rotulo="UF"
          name="uf"
          required
          maxLength={2}
          value={uf}
          onChange={(evento) => setUf(evento.currentTarget.value.toUpperCase())}
          placeholder="SP"
          erro={erroDe("uf")}
        />
      </div>

      <Campo
        rotulo="Ponto de referência"
        name="referencia"
        maxLength={160}
        defaultValue={valores.referencia}
        ajuda="Ajuda o técnico a achar o lugar na primeira tentativa."
        erro={erroDe("referencia")}
      />

      <Marcador
        name="padrao"
        rotulo="Usar como endereço padrão"
        ajuda="É o endereço sugerido na compra e no chamado de assistência."
        defaultChecked={valores.padrao}
        value="1"
      />

      <div className="flex flex-wrap gap-3 pt-1">
        <Botao type="submit" carregando={enviando}>
          {enviando ? "Salvando…" : valores.id ? "Salvar alterações" : "Cadastrar endereço"}
        </Botao>
      </div>
    </form>
  );
}

export function Enderecos({ enderecos }: { enderecos: EnderecoConta[] }) {
  const [emEdicao, setEmEdicao] = useState<EnderecoConta | null>(null);

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <Botao type="button" onClick={() => setEmEdicao(NOVO)}>
          <Plus className="size-4" aria-hidden />
          Adicionar endereço
        </Botao>
      </div>

      {enderecos.length === 0 ? (
        <Vazio
          icone={MapPin}
          titulo="Nenhum endereço cadastrado"
          descricao="Cadastre onde a clínica fica: o endereço passa a vir preenchido na compra e no chamado de assistência, e o técnico chega no lugar certo."
          acao={
            <Botao type="button" onClick={() => setEmEdicao(NOVO)}>
              <Plus className="size-4" aria-hidden />
              Cadastrar endereço
            </Botao>
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {enderecos.map((endereco) => (
            <li
              key={endereco.id}
              className="flex flex-col rounded-xl border border-graf-200 bg-white p-5 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-sm font-bold text-graf-950">{endereco.rotulo}</p>
                {endereco.padrao ? (
                  <Etiqueta tom="ok">
                    <Star className="size-3" aria-hidden />
                    Padrão
                  </Etiqueta>
                ) : null}
              </div>

              <address className="mt-2 flex-1 not-italic text-sm leading-relaxed text-graf-600">
                {endereco.destinatario ? (
                  <span className="block font-medium text-graf-800">
                    {endereco.destinatario}
                  </span>
                ) : null}
                {resumo(endereco)}
                {endereco.cep ? (
                  <span className="block">CEP {formatarCep(endereco.cep)}</span>
                ) : null}
                {endereco.referencia ? (
                  <span className="block text-graf-500">
                    Referência: {endereco.referencia}
                  </span>
                ) : null}
              </address>

              <div className="mt-4 flex flex-wrap gap-2">
                <Botao
                  type="button"
                  variante="secundario"
                  tamanho="sm"
                  onClick={() => setEmEdicao(endereco)}
                >
                  <Pencil className="size-4" aria-hidden />
                  Editar
                </Botao>

                {!endereco.padrao ? (
                  <form action={definirEnderecoPadrao}>
                    <input type="hidden" name="id" value={endereco.id} />
                    <Botao type="submit" variante="sutil" tamanho="sm">
                      <Star className="size-4" aria-hidden />
                      Tornar padrão
                    </Botao>
                  </form>
                ) : null}

                <form action={removerEndereco} className="ml-auto">
                  <input type="hidden" name="id" value={endereco.id} />
                  <BotaoConfirmar
                    rotulo={
                      <>
                        <Trash2 className="size-4" aria-hidden />
                        Remover
                      </>
                    }
                    tamanho="sm"
                    pergunta={`Remover o endereço “${endereco.rotulo}”?`}
                    detalhe="Pedidos e chamados antigos guardam o endereço usado na época, então nada do histórico se perde."
                    rotuloConfirmar="Remover endereço"
                  />
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Painel
        aberto={emEdicao !== null}
        aoFechar={() => setEmEdicao(null)}
        titulo={emEdicao?.id ? "Editar endereço" : "Novo endereço"}
        descricao="Digite o CEP e o resto do endereço vem preenchido — dá para corrigir tudo depois."
        lado="direita"
        tamanho="md"
      >
        {emEdicao ? (
          <FormularioEndereco
            key={emEdicao.id || "novo"}
            valores={emEdicao}
            aoSalvar={() => setEmEdicao(null)}
          />
        ) : null}
      </Painel>
    </div>
  );
}
