"use client";

import { useEffect, useRef, useState } from "react";

import { Campo } from "@/components/ui/form";
import {
  cnpjValido,
  cpfValido,
  formatarValor,
  somenteDigitos,
} from "@/lib/format";

/* ============================================================================
   Campos com máscara brasileira
   Tudo em cima do Campo do kit — mesmo rótulo, mesmo erro, mesmo foco. Sem
   biblioteca de máscara: são cinco formatos fechados e previsíveis, e o
   pacote inteiro custaria mais que o código daqui.

   O cuidado que máscara costuma esquecer está resolvido: o cursor volta para
   depois do mesmo dígito que estava antes de reformatar, e o Backspace em
   cima de um separador apaga o dígito anterior em vez de não fazer nada.

   Convenção: `valor` + `aoMudar` para uso controlado, `valorInicial` para
   uso solto dentro de um form. Nunca os dois.
   ============================================================================ */

type PropsBase = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "defaultValue" | "onChange" | "type"
> & {
  rotulo?: string;
  erro?: string;
  ajuda?: string;
  className?: string;
};

const EH_DIGITO = /\d/;

/** Onde o cursor deve parar para ficar depois do mesmo dígito de antes. */
function posicaoDoCaret(mascarado: string, digitosAntes: number) {
  if (digitosAntes <= 0) return 0;
  let contados = 0;
  for (let i = 0; i < mascarado.length; i++) {
    if (EH_DIGITO.test(mascarado[i])) {
      contados++;
      if (contados === digitosAntes) return i + 1;
    }
  }
  return mascarado.length;
}

function useMascara(
  mascarar: (bruto: string) => string,
  valor: string | undefined,
  valorInicial: string | undefined,
  aoMudar: ((valor: string) => void) | undefined,
) {
  const [interno, setInterno] = useState(() => mascarar(valorInicial ?? ""));
  const refInput = useRef<HTMLInputElement | null>(null);
  const refCaret = useRef<number | null>(null);

  const controlado = valor !== undefined;
  const exibido = controlado ? mascarar(valor) : interno;

  useEffect(() => {
    const alvo = refCaret.current;
    if (alvo === null) return;
    refCaret.current = null;
    const campo = refInput.current;
    if (campo && document.activeElement === campo) campo.setSelectionRange(alvo, alvo);
  });

  function aplicar(campo: HTMLInputElement, bruto: string, digitosAntes: number) {
    const novo = mascarar(bruto);
    refInput.current = campo;
    refCaret.current = posicaoDoCaret(novo, digitosAntes);
    if (!controlado) setInterno(novo);
    aoMudar?.(novo);
  }

  function aoDigitar(evento: React.ChangeEvent<HTMLInputElement>) {
    const campo = evento.currentTarget;
    const posicao = campo.selectionStart ?? campo.value.length;
    aplicar(campo, campo.value, somenteDigitos(campo.value.slice(0, posicao)).length);
  }

  /** Backspace em cima de "." ou "/" deve comer o dígito, não o separador. */
  function aoTeclar(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key !== "Backspace") return;
    const campo = evento.currentTarget;
    const inicio = campo.selectionStart ?? 0;
    const fim = campo.selectionEnd ?? 0;
    if (inicio !== fim || inicio === 0) return;
    if (EH_DIGITO.test(campo.value[inicio - 1])) return;

    let corte = inicio;
    while (corte > 0 && !EH_DIGITO.test(campo.value[corte - 1])) corte--;
    if (corte === 0) return;

    evento.preventDefault();
    const bruto = campo.value.slice(0, corte - 1) + campo.value.slice(inicio);
    aplicar(campo, bruto, somenteDigitos(campo.value.slice(0, corte - 1)).length);
  }

  return { exibido, aoDigitar, aoTeclar };
}

/* --------------------------------------------------------------- telefone */

export function mascararTelefone(bruto: string) {
  const d = somenteDigitos(bruto).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function CampoTelefone({
  valor,
  valorInicial,
  aoMudar,
  rotulo = "Telefone",
  erro,
  ajuda,
  className,
  onBlur,
  ...resto
}: PropsBase & {
  valor?: string;
  valorInicial?: string;
  aoMudar?: (valor: string) => void;
}) {
  const { exibido, aoDigitar, aoTeclar } = useMascara(
    mascararTelefone,
    valor,
    valorInicial,
    aoMudar,
  );
  const [erroLocal, setErroLocal] = useState<string | undefined>();

  const digitos = somenteDigitos(exibido);

  return (
    <Campo
      {...resto}
      rotulo={rotulo}
      className={className}
      type="tel"
      inputMode="tel"
      autoComplete={resto.autoComplete ?? "tel"}
      placeholder={resto.placeholder ?? "(11) 98888-7777"}
      value={exibido}
      onChange={aoDigitar}
      onKeyDown={aoTeclar}
      onBlur={(evento) => {
        setErroLocal(
          digitos.length === 0 || digitos.length === 10 || digitos.length === 11
            ? undefined
            : "Telefone incompleto. Use DDD + número.",
        );
        onBlur?.(evento);
      }}
      erro={erro ?? erroLocal}
      ajuda={ajuda}
    />
  );
}

/* -------------------------------------------------------------------- CEP */

export type EnderecoCep = {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
};

type RespostaViaCep = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
};

export function mascararCep(bruto: string) {
  const d = somenteDigitos(bruto).slice(0, 8);
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function CampoCep({
  valor,
  valorInicial,
  aoMudar,
  aoEncontrar,
  buscarEndereco = true,
  rotulo = "CEP",
  erro,
  ajuda,
  className,
  ...resto
}: PropsBase & {
  valor?: string;
  valorInicial?: string;
  aoMudar?: (valor: string) => void;
  /** Chamado assim que o ViaCEP responde com um endereço válido. */
  aoEncontrar?: (endereco: EnderecoCep) => void;
  buscarEndereco?: boolean;
}) {
  const { exibido, aoDigitar, aoTeclar } = useMascara(mascararCep, valor, valorInicial, aoMudar);
  const digitos = somenteDigitos(exibido);

  const [estado, setEstado] = useState<"parado" | "buscando" | "ok" | "erro">("parado");
  const refAoEncontrar = useRef(aoEncontrar);
  // Já veio preenchido: não busca de novo para não sobrescrever o que a
  // pessoa (ou o banco) já colocou nos outros campos.
  const refUltimo = useRef<string | null>(
    somenteDigitos(valorInicial ?? valor ?? "").length === 8
      ? somenteDigitos(valorInicial ?? valor ?? "")
      : null,
  );

  useEffect(() => {
    refAoEncontrar.current = aoEncontrar;
  });

  useEffect(() => {
    if (!buscarEndereco) return;
    if (digitos.length !== 8) {
      setEstado("parado");
      return;
    }
    if (refUltimo.current === digitos) return;
    refUltimo.current = digitos;

    const controlador = new AbortController();
    setEstado("buscando");

    async function buscar() {
      try {
        const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, {
          signal: controlador.signal,
        });
        if (!resposta.ok) throw new Error("resposta inválida");
        const dados = (await resposta.json()) as RespostaViaCep;
        if (dados.erro || !dados.cep) {
          setEstado("erro");
          return;
        }
        setEstado("ok");
        refAoEncontrar.current?.({
          cep: mascararCep(dados.cep),
          logradouro: dados.logradouro ?? "",
          complemento: dados.complemento ?? "",
          bairro: dados.bairro ?? "",
          cidade: dados.localidade ?? "",
          uf: dados.uf ?? "",
        });
      } catch {
        if (controlador.signal.aborted) return;
        setEstado("erro");
      }
    }

    void buscar();
    return () => controlador.abort();
  }, [digitos, buscarEndereco]);

  const erroBusca = estado === "erro" ? "CEP não encontrado. Confira os números." : undefined;
  const ajudaEstado =
    estado === "buscando"
      ? "Buscando endereço…"
      : estado === "ok"
        ? "Endereço encontrado."
        : ajuda;

  return (
    <Campo
      {...resto}
      rotulo={rotulo}
      className={className}
      type="text"
      inputMode="numeric"
      autoComplete={resto.autoComplete ?? "postal-code"}
      placeholder={resto.placeholder ?? "00000-000"}
      maxLength={9}
      value={exibido}
      onChange={aoDigitar}
      onKeyDown={aoTeclar}
      erro={erro ?? erroBusca}
      ajuda={ajudaEstado}
    />
  );
}

/* -------------------------------------------------------------- documento */

export type TipoDocumento = "fisica" | "juridica" | "auto";

export function mascararDocumento(bruto: string, tipo: TipoDocumento = "auto") {
  const maximo = tipo === "fisica" ? 11 : 14;
  const d = somenteDigitos(bruto).slice(0, maximo);
  const comoCpf = tipo === "fisica" || (tipo === "auto" && d.length <= 11);

  if (comoCpf) {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }

  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function CampoDocumento({
  valor,
  valorInicial,
  aoMudar,
  aoValidar,
  tipo = "auto",
  rotulo,
  erro,
  ajuda,
  className,
  onBlur,
  ...resto
}: PropsBase & {
  valor?: string;
  valorInicial?: string;
  aoMudar?: (valor: string) => void;
  /** Roda ao sair do campo, com o resultado da conferência dos dígitos. */
  aoValidar?: (valido: boolean) => void;
  tipo?: TipoDocumento;
}) {
  const { exibido, aoDigitar, aoTeclar } = useMascara(
    (bruto) => mascararDocumento(bruto, tipo),
    valor,
    valorInicial,
    aoMudar,
  );
  const [erroLocal, setErroLocal] = useState<string | undefined>();

  const digitos = somenteDigitos(exibido);
  const rotuloFinal =
    rotulo ?? (tipo === "fisica" ? "CPF" : tipo === "juridica" ? "CNPJ" : "CPF ou CNPJ");

  function conferir() {
    if (digitos.length === 0) {
      setErroLocal(undefined);
      aoValidar?.(false);
      return;
    }
    if (digitos.length === 11 && tipo !== "juridica") {
      const valido = cpfValido(digitos);
      setErroLocal(valido ? undefined : "CPF inválido. Confira os números.");
      aoValidar?.(valido);
      return;
    }
    if (digitos.length === 14 && tipo !== "fisica") {
      const valido = cnpjValido(digitos);
      setErroLocal(valido ? undefined : "CNPJ inválido. Confira os números.");
      aoValidar?.(valido);
      return;
    }
    setErroLocal(
      tipo === "fisica"
        ? "CPF incompleto — são 11 dígitos."
        : tipo === "juridica"
          ? "CNPJ incompleto — são 14 dígitos."
          : "Documento incompleto. CPF tem 11 dígitos e CNPJ, 14.",
    );
    aoValidar?.(false);
  }

  return (
    <Campo
      {...resto}
      rotulo={rotuloFinal}
      className={className}
      type="text"
      inputMode="numeric"
      placeholder={resto.placeholder ?? (tipo === "juridica" ? "00.000.000/0000-00" : "000.000.000-00")}
      maxLength={18}
      value={exibido}
      onChange={aoDigitar}
      onKeyDown={aoTeclar}
      onBlur={(evento) => {
        conferir();
        onBlur?.(evento);
      }}
      erro={erro ?? erroLocal}
      ajuda={ajuda}
    />
  );
}

/* ------------------------------------------------------------------ moeda */

/**
 * Digitação da direita para a esquerda, como em maquininha e caixa: cada
 * dígito empurra o anterior. O que sai por `aoMudar` já são centavos inteiros
 * — nada de float chegando no servidor.
 */
export function CampoMoeda({
  valorCents,
  valorInicialCents,
  aoMudar,
  nome,
  rotulo = "Valor",
  erro,
  ajuda,
  className,
  ...resto
}: PropsBase & {
  valorCents?: number;
  valorInicialCents?: number;
  aoMudar?: (centavos: number) => void;
  /** Cria um input escondido com os centavos, para enviar no form. */
  nome?: string;
}) {
  const [interno, setInterno] = useState<number | null>(valorInicialCents ?? null);
  const refInput = useRef<HTMLInputElement | null>(null);
  const refFim = useRef(false);

  const controlado = valorCents !== undefined;
  const centavos = controlado ? valorCents : interno;
  const exibido = centavos === null || centavos === undefined ? "" : formatarValor(centavos);

  // Com entrada pela direita o cursor mora sempre no fim; sem isto ele salta
  // para o começo a cada reformatação.
  useEffect(() => {
    if (!refFim.current) return;
    refFim.current = false;
    const campo = refInput.current;
    if (campo && document.activeElement === campo) {
      const fim = campo.value.length;
      campo.setSelectionRange(fim, fim);
    }
  });

  function aoDigitar(evento: React.ChangeEvent<HTMLInputElement>) {
    const campo = evento.currentTarget;
    refInput.current = campo;
    refFim.current = true;

    const digitos = somenteDigitos(campo.value).replace(/^0+(?=\d)/, "").slice(0, 12);
    const novo = digitos === "" ? null : Number(digitos);
    if (!controlado) setInterno(novo);
    aoMudar?.(novo ?? 0);
  }

  return (
    <div className={className}>
      <Campo
        {...resto}
        rotulo={rotulo}
        prefixo="R$"
        type="text"
        inputMode="numeric"
        placeholder={resto.placeholder ?? "0,00"}
        value={exibido}
        onChange={aoDigitar}
        erro={erro}
        ajuda={ajuda ?? "Digite só os números: 1234 vira R$ 12,34."}
      />
      {nome ? <input type="hidden" name={nome} value={centavos ?? 0} /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------- data */

export function mascararData(bruto: string) {
  const d = somenteDigitos(bruto).slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** "31/12/2025" → "2025-12-31". Devolve null se a data não existe no calendário. */
export function dataParaIso(mascarado: string): string | null {
  const d = somenteDigitos(mascarado);
  if (d.length !== 8) return null;
  const dia = Number(d.slice(0, 2));
  const mes = Number(d.slice(2, 4));
  const ano = Number(d.slice(4));
  if (mes < 1 || mes > 12 || dia < 1 || ano < 1900 || ano > 2200) return null;
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  return `${d.slice(4)}-${d.slice(2, 4)}-${d.slice(0, 2)}`;
}

export function CampoData({
  valor,
  valorInicial,
  aoMudar,
  aoMudarIso,
  nome,
  rotulo = "Data",
  erro,
  ajuda,
  className,
  onBlur,
  ...resto
}: PropsBase & {
  valor?: string;
  valorInicial?: string;
  aoMudar?: (valor: string) => void;
  /** Recebe "aaaa-mm-dd" quando a data está completa e existe; "" caso contrário. */
  aoMudarIso?: (iso: string) => void;
  /** Cria um input escondido com a data em ISO, para enviar no form. */
  nome?: string;
}) {
  const refAoMudarIso = useRef(aoMudarIso);
  useEffect(() => {
    refAoMudarIso.current = aoMudarIso;
  });

  const { exibido, aoDigitar, aoTeclar } = useMascara(
    mascararData,
    valor,
    valorInicial,
    (novo) => {
      aoMudar?.(novo);
      refAoMudarIso.current?.(dataParaIso(novo) ?? "");
    },
  );

  const [erroLocal, setErroLocal] = useState<string | undefined>();
  const iso = dataParaIso(exibido);

  return (
    <div className={className}>
      <Campo
        {...resto}
        rotulo={rotulo}
        type="text"
        inputMode="numeric"
        autoComplete={resto.autoComplete ?? "off"}
        placeholder={resto.placeholder ?? "dd/mm/aaaa"}
        maxLength={10}
        value={exibido}
        onChange={aoDigitar}
        onKeyDown={aoTeclar}
        onBlur={(evento) => {
          const digitos = somenteDigitos(exibido);
          setErroLocal(
            digitos.length === 0
              ? undefined
              : iso
                ? undefined
                : "Data inválida. Use dd/mm/aaaa.",
          );
          onBlur?.(evento);
        }}
        erro={erro ?? erroLocal}
        ajuda={ajuda}
      />
      {nome ? <input type="hidden" name={nome} value={iso ?? ""} /> : null}
    </div>
  );
}
