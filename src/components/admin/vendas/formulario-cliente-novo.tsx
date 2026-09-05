"use client";

import { useActionState, useId, useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";

import { criarCliente, type EstadoCliente } from "@/app/acoes/admin-clientes";
import { Botao } from "@/components/ui/button";
import { CampoCep, CampoDocumento, CampoTelefone } from "@/components/ui/campos-br";
import { CabecalhoCartao, Cartao } from "@/components/ui/data";
import { Area, Campo, Selecao } from "@/components/ui/form";

/* ============================================================================
   Cadastro de cliente pela equipe

   É a tela do atendimento por telefone: o dentista liga, e a JB registra a
   pessoa sem esperar que ela crie conta. Não há campo de senha — `Customer`
   aceita `passwordHash` nulo, e é assim que fica até a própria pessoa definir
   a dela pelo site.

   O bloco de endereço é preenchido pelo CEP: o `CampoCep` consulta o ViaCEP e
   devolve logradouro, bairro, cidade e UF, que ficam editáveis (endereço novo
   e zona rural o ViaCEP não conhece). O foco vai para o número, que é o que
   sobra para digitar.

   Quando o e-mail já está no cadastro, a ação devolve o id da ficha existente
   e o erro vira um link para ela. Fundir dois cadastros é decisão de quem
   atende, nunca do formulário.
   ============================================================================ */

const INICIAL: EstadoCliente = {};

export function FormularioClienteNovo() {
  const [estado, acao, pendente] = useActionState(criarCliente, INICIAL);
  const [tipo, setTipo] = useState<"fisica" | "juridica">("fisica");

  const [logradouro, setLogradouro] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [complemento, setComplemento] = useState("");

  const idErro = useId();
  const idNumero = useId();

  const erroDe = (campo: string) => (estado.campo === campo ? estado.erro : undefined);
  // erro sem campo (ou de campo que não está na tela) fica só na região viva
  const erroGeral =
    estado.erro && !["nome", "email", "telefone", "documento", "razaoSocial", "cep", "logradouro", "numero", "bairro", "cidade", "uf"].includes(estado.campo ?? "")
      ? estado.erro
      : undefined;

  return (
    <form
      action={acao}
      className="space-y-6"
      aria-busy={pendente || undefined}
      aria-describedby={erroGeral ? idErro : undefined}
    >
      <Cartao>
        <CabecalhoCartao
          titulo="Quem é o cliente"
          descricao="Sem senha: a pessoa define a dela depois, pelo site."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Campo
            rotulo="Nome"
            name="nome"
            required
            maxLength={160}
            autoComplete="off"
            autoFocus
            placeholder="Nome de quem responde pela clínica"
            erro={erroDe("nome")}
          />

          <div>
            <Campo
              rotulo="E-mail"
              name="email"
              type="email"
              required
              maxLength={160}
              autoComplete="off"
              ajuda="É a chave do cadastro e o login da Minha JB."
              erro={erroDe("email")}
            />
            {estado.clienteExistente ? (
              <p className="mt-1.5 text-sm">
                <Link
                  href={`/admin/clientes/${estado.clienteExistente.id}`}
                  className="font-semibold text-jb-700 underline underline-offset-2 hover:text-jb-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
                >
                  Abrir a ficha de {estado.clienteExistente.nome}
                </Link>
              </p>
            ) : null}
          </div>

          <CampoTelefone name="telefone" erro={erroDe("telefone")} />

          <Selecao
            rotulo="Tipo de pessoa"
            name="tipoPessoa"
            value={tipo}
            onChange={(evento) => setTipo(evento.target.value as "fisica" | "juridica")}
          >
            <option value="fisica">Pessoa física</option>
            <option value="juridica">Pessoa jurídica</option>
          </Selecao>

          <CampoDocumento
            name="documento"
            tipo={tipo}
            rotulo={tipo === "juridica" ? "CNPJ" : "CPF"}
            ajuda="Pode ficar em branco agora e ser completado depois."
            erro={erroDe("documento")}
          />

          {tipo === "juridica" ? (
            <>
              <Campo
                rotulo="Razão social"
                name="razaoSocial"
                required
                maxLength={160}
                erro={erroDe("razaoSocial")}
              />
              <Campo rotulo="Nome fantasia" name="nomeFantasia" maxLength={160} />
              <Campo
                rotulo="Inscrição estadual"
                name="inscricaoEstadual"
                maxLength={40}
                ajuda="Deixe vazio se for isento."
              />
            </>
          ) : null}
        </div>
      </Cartao>

      <Cartao>
        <CabecalhoCartao
          titulo="Endereço"
          descricao="Opcional agora. Comece pelo CEP e o resto vem preenchido."
        />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Campo
            rotulo="Identificação do endereço"
            name="rotuloEndereco"
            maxLength={60}
            placeholder="Principal"
            ajuda="Como a equipe chama este lugar. Em branco, vira “Principal”."
          />

          <CampoCep
            name="cep"
            erro={erroDe("cep")}
            aoEncontrar={(endereco) => {
              setLogradouro(endereco.logradouro);
              setBairro(endereco.bairro);
              setCidade(endereco.cidade);
              setUf(endereco.uf);
              if (endereco.complemento) setComplemento(endereco.complemento);
              document.getElementById(idNumero)?.focus();
            }}
          />

          <Campo
            rotulo="Logradouro"
            name="logradouro"
            maxLength={160}
            value={logradouro}
            onChange={(evento) => setLogradouro(evento.target.value)}
            erro={erroDe("logradouro")}
            className="sm:col-span-2"
          />

          <Campo
            id={idNumero}
            rotulo="Número"
            name="numero"
            maxLength={20}
            placeholder="s/n quando não houver"
            erro={erroDe("numero")}
          />

          <Campo
            rotulo="Complemento"
            name="complemento"
            maxLength={80}
            value={complemento}
            onChange={(evento) => setComplemento(evento.target.value)}
            placeholder="Sala, andar, bloco"
          />

          <Campo
            rotulo="Bairro"
            name="bairro"
            maxLength={120}
            value={bairro}
            onChange={(evento) => setBairro(evento.target.value)}
            erro={erroDe("bairro")}
          />

          <Campo
            rotulo="Cidade"
            name="cidade"
            maxLength={120}
            value={cidade}
            onChange={(evento) => setCidade(evento.target.value)}
            erro={erroDe("cidade")}
          />

          <Campo
            rotulo="UF"
            name="uf"
            maxLength={2}
            value={uf}
            onChange={(evento) => setUf(evento.target.value.toUpperCase())}
            placeholder="SP"
            erro={erroDe("uf")}
          />

          <Campo
            rotulo="Ponto de referência"
            name="referencia"
            maxLength={160}
            placeholder="Em frente à praça, prédio azul"
            className="sm:col-span-2"
          />
        </div>
      </Cartao>

      <Cartao>
        <CabecalhoCartao
          titulo="Nota interna"
          descricao="Só a equipe vê. O cliente nunca tem acesso a este texto."
        />
        <div className="p-5">
          <Area
            rotulo="O que a próxima pessoa precisa saber"
            name="notas"
            rows={3}
            maxLength={2000}
            placeholder="Ex.: ligou pedindo orçamento de autoclave; prefere contato pela manhã."
          />
        </div>
      </Cartao>

      {/* Região viva sempre montada: alerta que só nasce depois do erro
          costuma não ser anunciado pelo leitor de tela. */}
      <p
        id={idErro}
        role="alert"
        aria-live="assertive"
        className={erroGeral ? "text-sm font-medium text-jb-700" : "sr-only"}
      >
        {erroGeral ?? ""}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Botao type="submit" carregando={pendente}>
          {pendente ? null : <UserPlus className="size-4" aria-hidden />}
          Cadastrar cliente
        </Botao>
        <Link
          href="/admin/clientes"
          className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-graf-600 transition-colors hover:text-graf-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jb-500"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
