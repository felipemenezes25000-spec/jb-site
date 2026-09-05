"use client";

import { useId, useState } from "react";
import { PhoneCall } from "lucide-react";

import { abrirChamadoNoPainel } from "@/app/acoes/admin-servico";
import { AreaAcao, CampoAcao, SelecaoAcao } from "@/components/admin/servico/campos";
import { FormularioAcao, Oculto } from "@/components/admin/servico/formulario";
import { CampoCep, CampoTelefone } from "@/components/ui/campos-br";
import { CabecalhoCartao, Cartao } from "@/components/ui/data";
import { Campo } from "@/components/ui/form";

/* ============================================================================
   Abertura de chamado pelo painel — o atendimento por telefone

   Quem preenche não é o dentista: é quem atendeu a ligação. Por isso o
   formulário tem a ordem da conversa, e não a ordem da tabela — primeiro o
   equipamento (é o que a pessoa fala primeiro), depois o problema, depois onde
   e quando.

   Três decisões de tela:

   1. O equipamento sai do prontuário quando existe. Escolher da lista liga o
      chamado ao histórico do aparelho; só quando ele não está cadastrado é que
      marca, modelo e série são digitados à mão.

   2. O endereço não é redigitado à toa. Sem tocar em nada, o chamado herda o
      endereço da unidade escolhida — e, sem unidade, o endereço padrão do
      cliente. "Outro endereço" existe para o caso real de o equipamento estar
      numa clínica que ainda não foi cadastrada.

   3. O contato vem preenchido com os dados do cliente, mas continua editável:
      quem liga costuma ser a recepção, e é o telefone dela que precisa estar
      no chamado para o técnico confirmar a visita.
   ============================================================================ */

export type EquipamentoDoCliente = {
  id: string;
  nome: string;
  detalhe: string;
};

export type UnidadeDoCliente = {
  id: string;
  nome: string;
  endereco: string;
};

export type ClienteDoChamado = {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  enderecoPadrao: string;
  equipamentos: EquipamentoDoCliente[];
  unidades: UnidadeDoCliente[];
};

export type OpcaoSimples = { valor: string; rotulo: string };

const DESCREVER = "";
const OUTRO_ENDERECO = "outro";

export function FormularioChamado({
  cliente,
  categorias,
  urgencias,
}: {
  /** Nulo no chamado avulso: quem liga ainda não tem cadastro. */
  cliente: ClienteDoChamado | null;
  categorias: OpcaoSimples[];
  urgencias: OpcaoSimples[];
}) {
  const [equipamentoId, setEquipamentoId] = useState(
    cliente?.equipamentos[0]?.id ?? DESCREVER,
  );
  const [ondeAtender, setOndeAtender] = useState(
    cliente?.unidades[0]?.id ?? (cliente ? "" : OUTRO_ENDERECO),
  );

  const [logradouro, setLogradouro] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");

  const idNumero = useId();

  const descrevendo = equipamentoId === DESCREVER;
  const enderecoNovo = ondeAtender === OUTRO_ENDERECO;

  const resumoDoLocal = enderecoNovo
    ? ""
    : ondeAtender
      ? (cliente?.unidades.find((u) => u.id === ondeAtender)?.endereco ?? "")
      : (cliente?.enderecoPadrao ?? "");

  return (
    <FormularioAcao
      acao={abrirChamadoNoPainel}
      rotulo="Abrir chamado"
      icone={<PhoneCall className="size-4" aria-hidden />}
      className="space-y-6"
    >
      {({ estado }) => (
        <>
          <Oculto nome="customerId" valor={cliente?.id ?? ""} />
          {/* Sem unidade escolhida — ou com endereço digitado — o campo vai
              vazio e a camada de domínio resolve o endereço sozinha. */}
          <Oculto nome="unidadeId" valor={enderecoNovo ? "" : ondeAtender} />

          <Cartao>
            <CabecalhoCartao
              titulo="Equipamento"
              descricao={
                cliente
                  ? "Escolha o aparelho do prontuário para o chamado entrar no histórico dele."
                  : "Sem cadastro, o equipamento é descrito pelo que a pessoa souber informar."
              }
            />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {cliente && cliente.equipamentos.length > 0 ? (
                <SelecaoAcao
                  rotulo="Equipamento do prontuário"
                  name="equipamentoId"
                  value={equipamentoId}
                  onChange={(evento) => setEquipamentoId(evento.target.value)}
                  className="sm:col-span-2"
                >
                  {cliente.equipamentos.map((equipamento) => (
                    <option key={equipamento.id} value={equipamento.id}>
                      {equipamento.nome}
                      {equipamento.detalhe ? ` — ${equipamento.detalhe}` : ""}
                    </option>
                  ))}
                  <option value={DESCREVER}>Não está no prontuário — descrever</option>
                </SelecaoAcao>
              ) : (
                <>
                  <Oculto nome="equipamentoId" valor="" />
                  {cliente ? (
                    <p className="text-sm text-graf-500 sm:col-span-2">
                      Este cliente ainda não tem equipamento no prontuário. Descreva o
                      aparelho abaixo — a ficha dele pode ser criada depois, pela tela de
                      equipamentos.
                    </p>
                  ) : null}
                </>
              )}

              {descrevendo ? (
                <>
                  <SelecaoAcao rotulo="Categoria" name="categoriaId">
                    <option value="">Não sei dizer</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.valor} value={categoria.valor}>
                        {categoria.rotulo}
                      </option>
                    ))}
                  </SelecaoAcao>
                  <CampoAcao
                    rotulo="Marca"
                    name="marca"
                    maxLength={80}
                    placeholder="Gnatus, Kavo, Dabi…"
                  />
                  <CampoAcao rotulo="Modelo" name="modelo" maxLength={80} />
                  <CampoAcao
                    rotulo="Número de série"
                    name="serie"
                    maxLength={80}
                    ajuda="Costuma estar numa etiqueta atrás ou embaixo do aparelho."
                  />
                </>
              ) : null}
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao
              titulo="O problema"
              descricao="Escreva o que a pessoa falou, não o diagnóstico que você imagina."
            />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <CampoAcao
                rotulo="Tipo do problema"
                name="tipoProblema"
                maxLength={120}
                placeholder="Não liga, vazamento, ruído, erro no painel…"
              />

              <SelecaoAcao rotulo="Urgência" name="urgencia" defaultValue="normal" required>
                {urgencias.map((urgencia) => (
                  <option key={urgencia.valor} value={urgencia.valor}>
                    {urgencia.rotulo}
                  </option>
                ))}
              </SelecaoAcao>

              <AreaAcao
                rotulo="Relato"
                name="descricao"
                rows={4}
                required
                maxLength={4000}
                className="sm:col-span-2"
                ajuda="Mínimo de dez caracteres. É o texto que o técnico lê antes de sair."
                placeholder="Ex.: a cadeira parou de subir hoje de manhã; faz um estalo e o pedal não responde."
              />

              <CampoAcao
                rotulo="Melhor horário para a visita"
                name="disponibilidade"
                maxLength={300}
                className="sm:col-span-2"
                placeholder="Terças e quintas antes das 11h"
              />
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao
              titulo="Onde atender"
              descricao="É o endereço que vai para a agenda do técnico."
            />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <SelecaoAcao
                rotulo="Local do atendimento"
                name="localDoAtendimento"
                value={ondeAtender}
                onChange={(evento) => setOndeAtender(evento.target.value)}
                className="sm:col-span-2"
              >
                {cliente ? (
                  <>
                    <option value="">Endereço padrão do cliente</option>
                    {cliente.unidades.map((unidade) => (
                      <option key={unidade.id} value={unidade.id}>
                        {unidade.nome}
                        {unidade.endereco ? ` — ${unidade.endereco}` : ""}
                      </option>
                    ))}
                  </>
                ) : null}
                <option value={OUTRO_ENDERECO}>Informar outro endereço</option>
              </SelecaoAcao>

              {enderecoNovo ? (
                <>
                  <CampoCep
                    name="cep"
                    erro={estado.campo === "cep" ? estado.erro : undefined}
                    aoEncontrar={(endereco) => {
                      setLogradouro(endereco.logradouro);
                      setBairro(endereco.bairro);
                      setCidade(endereco.cidade);
                      setUf(endereco.uf);
                      document.getElementById(idNumero)?.focus();
                    }}
                  />

                  <Campo
                    id={idNumero}
                    rotulo="Número"
                    name="numero"
                    maxLength={20}
                    placeholder="s/n quando não houver"
                  />

                  <Campo
                    rotulo="Logradouro"
                    name="logradouro"
                    maxLength={160}
                    value={logradouro}
                    onChange={(evento) => setLogradouro(evento.target.value)}
                    className="sm:col-span-2"
                  />

                  <Campo rotulo="Complemento" name="complemento" maxLength={80} />

                  <Campo
                    rotulo="Bairro"
                    name="bairro"
                    maxLength={120}
                    value={bairro}
                    onChange={(evento) => setBairro(evento.target.value)}
                  />

                  <Campo
                    rotulo="Cidade"
                    name="cidade"
                    maxLength={120}
                    value={cidade}
                    onChange={(evento) => setCidade(evento.target.value)}
                  />

                  <Campo
                    rotulo="UF"
                    name="uf"
                    maxLength={2}
                    value={uf}
                    onChange={(evento) => setUf(evento.target.value.toUpperCase())}
                    placeholder="SP"
                  />
                </>
              ) : (
                <p className="text-sm leading-relaxed text-graf-600 sm:col-span-2">
                  {resumoDoLocal
                    ? `O chamado usa: ${resumoDoLocal}`
                    : "Este cliente ainda não tem endereço cadastrado. O chamado nasce sem endereço e a triagem pergunta — ou informe um agora."}
                </p>
              )}
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao
              titulo="Quem está falando"
              descricao={
                cliente
                  ? "Já vem do cadastro. Ajuste quando quem liga é a recepção."
                  : "Obrigatório: é por aqui que a JB retorna."
              }
            />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <CampoAcao
                rotulo="Nome do contato"
                name="contatoNome"
                maxLength={160}
                required={!cliente}
                defaultValue={cliente?.nome}
                autoComplete="off"
              />
              <CampoAcao
                rotulo="E-mail do contato"
                name="contatoEmail"
                type="email"
                maxLength={160}
                required={!cliente}
                defaultValue={cliente?.email}
                autoComplete="off"
              />
              <CampoTelefone
                name="contatoTelefone"
                rotulo="Telefone do contato"
                valorInicial={cliente?.telefone ?? ""}
                erro={estado.campo === "contatoTelefone" ? estado.erro : undefined}
              />
            </div>
          </Cartao>

          <Cartao>
            <CabecalhoCartao
              titulo="Nota interna"
              descricao="Fica só do lado de cá. O cliente nunca lê este texto."
            />
            <div className="p-5">
              <AreaAcao
                rotulo="Observações da triagem"
                name="notaInterna"
                rows={3}
                maxLength={4000}
                placeholder="Ex.: já tentou desligar da tomada; equipamento fora da garantia."
              />
            </div>
          </Cartao>
        </>
      )}
    </FormularioAcao>
  );
}
