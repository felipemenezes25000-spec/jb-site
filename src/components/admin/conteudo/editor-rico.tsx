"use client";

import { useCallback, useId, useState } from "react";
import {
  EditorContent,
  Node,
  mergeAttributes,
  useEditor,
  useEditorState,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Underline as UnderlineIcone,
  Undo2,
} from "lucide-react";

import { Botao } from "@/components/ui/button";
import { EnviarArquivo, type ArquivoEnviado } from "@/components/ui/enviar-arquivo";
import { Campo } from "@/components/ui/form";
import { Painel } from "@/components/ui/painel";
import { cn } from "@/lib/utils";

/* ============================================================================
   Editor de texto do CMS

   Enxuto de propósito: negrito, itálico, sublinhado, dois níveis de título,
   listas, citação, linha, alinhamento, link e imagem. Nada de cor, fonte ou
   tabela — o que o editor não oferece também não passa pelo saneamento na
   gravação, então oferecer viraria promessa quebrada.

   O HTML sai por um `<input type="hidden">`: o formulário continua sendo um
   formulário comum com server action, e o valor inicial já está no campo antes
   de o editor montar — sem JavaScript, salvar não apaga o conteúdo.

   `immediatelyRender: false` é obrigatório no App Router: o editor não pode
   montar durante a renderização do servidor, senão o HTML do servidor e o do
   cliente saem diferentes.
   ============================================================================ */

/**
 * Nó de imagem próprio.
 *
 * `@tiptap/extension-image` não está instalado e o package.json está congelado
 * nesta rodada; o nó abaixo faz o necessário — atributos `src`, `alt` e
 * `title`, que é exatamente o que a lista branca do saneamento aceita.
 */
const Imagem = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(HTMLAttributes)];
  },
});

const CLASSES_DA_AREA = [
  "min-h-64 w-full px-4 py-3 text-corpo leading-relaxed text-graf-800",
  "focus:outline-none",
  "[&_p]:my-3 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
  "[&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-graf-950",
  "[&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-graf-900",
  "[&_h4]:mb-1.5 [&_h4]:mt-4 [&_h4]:text-sm [&_h4]:font-bold [&_h4]:text-graf-900",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-1",
  "[&_a]:font-medium [&_a]:text-jb-700 [&_a]:underline",
  "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-jb-200 [&_blockquote]:pl-4 [&_blockquote]:italic",
  "[&_hr]:my-6 [&_hr]:border-graf-200",
  "[&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-lg",
  "[&_code]:rounded [&_code]:bg-graf-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]",
  "[&_.ProseMirror-selectednode]:outline-2 [&_.ProseMirror-selectednode]:outline-jb-500",
].join(" ");

function BotaoFerramenta({
  rotulo,
  ativo,
  desabilitado,
  aoClicar,
  children,
}: {
  rotulo: string;
  ativo?: boolean;
  desabilitado?: boolean;
  aoClicar: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={aoClicar}
      disabled={desabilitado}
      aria-pressed={ativo}
      aria-label={rotulo}
      title={rotulo}
      className={cn(
        "inline-flex size-11 shrink-0 items-center justify-center rounded-lg transition-colors",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-jb-500",
        "disabled:cursor-not-allowed disabled:opacity-40",
        ativo
          ? "bg-jb-50 text-jb-700 ring-1 ring-inset ring-jb-500/25"
          : "text-graf-600 hover:bg-graf-100 hover:text-graf-900",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Os diálogos do editor ficam dentro do `<form>` da página. Enter num campo de
 * texto aciona o envio implícito do formulário — que aqui salvaria a página no
 * meio da edição de um link. Este guarda-costas existe só para isso.
 */
function impedirEnvioComEnter(evento: React.KeyboardEvent<HTMLInputElement>) {
  if (evento.key === "Enter") evento.preventDefault();
}

function Separador() {
  return <span aria-hidden className="mx-1 h-6 w-px shrink-0 self-center bg-graf-200" />;
}

export function EditorRico({
  nome,
  rotulo,
  ajuda,
  valorInicial = "",
  erro,
  className,
}: {
  /** Nome do campo escondido que leva o HTML no envio do formulário. */
  nome: string;
  rotulo: string;
  ajuda?: string;
  valorInicial?: string;
  erro?: string;
  className?: string;
}) {
  const idBase = useId();
  const [html, setHtml] = useState(valorInicial);
  const [painelLink, setPainelLink] = useState(false);
  const [painelImagem, setPainelImagem] = useState(false);
  const [enderecoDoLink, setEnderecoDoLink] = useState("");
  const [imagem, setImagem] = useState<{ url: string; alt: string }>({ url: "", alt: "" });

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          protocols: ["http", "https", "mailto", "tel"],
          HTMLAttributes: { rel: "noopener noreferrer" },
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Imagem,
    ],
    content: valorInicial || "",
    editorProps: {
      attributes: {
        class: CLASSES_DA_AREA,
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": rotulo,
        "aria-describedby": `${idBase}-ajuda`,
      },
    },
    onUpdate: ({ editor: instancia }) => setHtml(instancia.getHTML()),
  });

  const estado = useEditorState({
    editor,
    selector: ({ editor: instancia }) => {
      if (!instancia) return null;
      return {
        negrito: instancia.isActive("bold"),
        italico: instancia.isActive("italic"),
        sublinhado: instancia.isActive("underline"),
        titulo2: instancia.isActive("heading", { level: 2 }),
        titulo3: instancia.isActive("heading", { level: 3 }),
        marcadores: instancia.isActive("bulletList"),
        numerada: instancia.isActive("orderedList"),
        citacao: instancia.isActive("blockquote"),
        link: instancia.isActive("link"),
        esquerda: instancia.isActive({ textAlign: "left" }),
        centro: instancia.isActive({ textAlign: "center" }),
        direita: instancia.isActive({ textAlign: "right" }),
        podeDesfazer: instancia.can().undo(),
        podeRefazer: instancia.can().redo(),
      };
    },
  });

  const abrirLink = useCallback(() => {
    if (!editor) return;
    const atual = editor.getAttributes("link").href;
    setEnderecoDoLink(typeof atual === "string" ? atual : "");
    setPainelLink(true);
  }, [editor]);

  function aplicarLink() {
    if (!editor) return;
    const endereco = enderecoDoLink.trim();
    if (!endereco) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor
        .chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: endereco })
        .run();
    }
    setHtml(editor.getHTML());
    setPainelLink(false);
  }

  function aplicarImagem() {
    if (!editor || !imagem.url) return;
    editor
      .chain()
      .focus()
      .insertContent({ type: "image", attrs: { src: imagem.url, alt: imagem.alt || null } })
      .run();
    setHtml(editor.getHTML());
    setImagem({ url: "", alt: "" });
    setPainelImagem(false);
  }

  function aoEnviarImagem(arquivos: ArquivoEnviado[]) {
    const ultimo = arquivos[arquivos.length - 1];
    if (ultimo) setImagem((atual) => ({ url: ultimo.url, alt: atual.alt }));
  }

  const linkValido =
    enderecoDoLink.trim() === "" ||
    /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(enderecoDoLink.trim());

  return (
    <div className={className}>
      <p className="mb-1.5 block text-sm font-semibold text-graf-800" id={`${idBase}-rotulo`}>
        {rotulo}
      </p>

      <div
        className={cn(
          "overflow-hidden rounded-lg border bg-white shadow-xs transition-colors",
          erro ? "border-jb-500" : "border-graf-450 focus-within:border-jb-500",
        )}
      >
        <div
          role="toolbar"
          aria-label="Formatação do texto"
          aria-controls={`${idBase}-area`}
          className="scrollbar-none flex flex-wrap items-center gap-0.5 border-b border-graf-200 bg-graf-50 px-1.5 py-1"
        >
          <BotaoFerramenta
            rotulo="Negrito"
            ativo={estado?.negrito}
            desabilitado={!editor}
            aoClicar={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold className="size-4" aria-hidden />
          </BotaoFerramenta>
          <BotaoFerramenta
            rotulo="Itálico"
            ativo={estado?.italico}
            desabilitado={!editor}
            aoClicar={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic className="size-4" aria-hidden />
          </BotaoFerramenta>
          <BotaoFerramenta
            rotulo="Sublinhado"
            ativo={estado?.sublinhado}
            desabilitado={!editor}
            aoClicar={() => editor?.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcone className="size-4" aria-hidden />
          </BotaoFerramenta>

          <Separador />

          <BotaoFerramenta
            rotulo="Título de seção"
            ativo={estado?.titulo2}
            desabilitado={!editor}
            aoClicar={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="size-4" aria-hidden />
          </BotaoFerramenta>
          <BotaoFerramenta
            rotulo="Subtítulo"
            ativo={estado?.titulo3}
            desabilitado={!editor}
            aoClicar={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          >
            <Heading3 className="size-4" aria-hidden />
          </BotaoFerramenta>

          <Separador />

          <BotaoFerramenta
            rotulo="Lista com marcadores"
            ativo={estado?.marcadores}
            desabilitado={!editor}
            aoClicar={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List className="size-4" aria-hidden />
          </BotaoFerramenta>
          <BotaoFerramenta
            rotulo="Lista numerada"
            ativo={estado?.numerada}
            desabilitado={!editor}
            aoClicar={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="size-4" aria-hidden />
          </BotaoFerramenta>
          <BotaoFerramenta
            rotulo="Citação"
            ativo={estado?.citacao}
            desabilitado={!editor}
            aoClicar={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="size-4" aria-hidden />
          </BotaoFerramenta>
          <BotaoFerramenta
            rotulo="Linha divisória"
            desabilitado={!editor}
            aoClicar={() => editor?.chain().focus().setHorizontalRule().run()}
          >
            <Minus className="size-4" aria-hidden />
          </BotaoFerramenta>

          <Separador />

          <BotaoFerramenta
            rotulo="Alinhar à esquerda"
            ativo={estado?.esquerda}
            desabilitado={!editor}
            aoClicar={() => editor?.chain().focus().setTextAlign("left").run()}
          >
            <AlignLeft className="size-4" aria-hidden />
          </BotaoFerramenta>
          <BotaoFerramenta
            rotulo="Centralizar"
            ativo={estado?.centro}
            desabilitado={!editor}
            aoClicar={() => editor?.chain().focus().setTextAlign("center").run()}
          >
            <AlignCenter className="size-4" aria-hidden />
          </BotaoFerramenta>
          <BotaoFerramenta
            rotulo="Alinhar à direita"
            ativo={estado?.direita}
            desabilitado={!editor}
            aoClicar={() => editor?.chain().focus().setTextAlign("right").run()}
          >
            <AlignRight className="size-4" aria-hidden />
          </BotaoFerramenta>

          <Separador />

          <BotaoFerramenta
            rotulo="Inserir ou editar link"
            ativo={estado?.link}
            desabilitado={!editor}
            aoClicar={abrirLink}
          >
            <Link2 className="size-4" aria-hidden />
          </BotaoFerramenta>
          <BotaoFerramenta
            rotulo="Remover link"
            desabilitado={!editor || !estado?.link}
            aoClicar={() => {
              editor?.chain().focus().extendMarkRange("link").unsetLink().run();
              if (editor) setHtml(editor.getHTML());
            }}
          >
            <Link2Off className="size-4" aria-hidden />
          </BotaoFerramenta>
          <BotaoFerramenta
            rotulo="Inserir imagem"
            desabilitado={!editor}
            aoClicar={() => setPainelImagem(true)}
          >
            <ImagePlus className="size-4" aria-hidden />
          </BotaoFerramenta>

          <Separador />

          <BotaoFerramenta
            rotulo="Limpar formatação"
            desabilitado={!editor}
            aoClicar={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
          >
            <Eraser className="size-4" aria-hidden />
          </BotaoFerramenta>

          <span className="ml-auto flex items-center gap-0.5">
            <BotaoFerramenta
              rotulo="Desfazer"
              desabilitado={!editor || !estado?.podeDesfazer}
              aoClicar={() => editor?.chain().focus().undo().run()}
            >
              <Undo2 className="size-4" aria-hidden />
            </BotaoFerramenta>
            <BotaoFerramenta
              rotulo="Refazer"
              desabilitado={!editor || !estado?.podeRefazer}
              aoClicar={() => editor?.chain().focus().redo().run()}
            >
              <Redo2 className="size-4" aria-hidden />
            </BotaoFerramenta>
          </span>
        </div>

        <div id={`${idBase}-area`}>
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div className="min-h-64 px-4 py-3">
              <p className="text-sm text-graf-500">Carregando o editor…</p>
            </div>
          )}
        </div>
      </div>

      <input type="hidden" name={nome} value={html} />

      {erro ? (
        <p className="mt-1.5 text-sm text-jb-700" role="alert">
          {erro}
        </p>
      ) : (
        <p id={`${idBase}-ajuda`} className="mt-1.5 text-xs leading-relaxed text-graf-500">
          {ajuda ??
            "Ao salvar, o conteúdo é limpo: sobram apenas texto, títulos, listas, links e imagens."}
        </p>
      )}

      {/* --------------------------------------------------------- link */}
      <Painel
        aberto={painelLink}
        aoFechar={() => setPainelLink(false)}
        titulo="Link"
        descricao="Endereço para onde o texto selecionado vai levar."
        tamanho="sm"
        rodape={
          <>
            <Botao type="button" variante="secundario" onClick={() => setPainelLink(false)}>
              Cancelar
            </Botao>
            <Botao type="button" onClick={aplicarLink} disabled={!linkValido}>
              Aplicar
            </Botao>
          </>
        }
      >
        <Campo
          rotulo="Endereço"
          type="text"
          inputMode="url"
          autoComplete="off"
          value={enderecoDoLink}
          onChange={(evento) => setEnderecoDoLink(evento.target.value)}
          onKeyDown={(evento) => {
            // o diálogo vive dentro do <form> da página: sem isto, Enter aqui
            // enviaria o formulário inteiro em vez de aplicar o link
            if (evento.key !== "Enter") return;
            evento.preventDefault();
            if (linkValido) aplicarLink();
          }}
          erro={linkValido ? undefined : "Use https://, mailto:, tel:, uma barra (/) ou #."}
          ajuda="Deixe vazio para remover o link. Endereço interno começa com /."
          placeholder="https://"
        />
      </Painel>

      {/* ------------------------------------------------------- imagem */}
      <Painel
        aberto={painelImagem}
        aoFechar={() => setPainelImagem(false)}
        titulo="Inserir imagem"
        descricao="Envie um arquivo ou cole o endereço de uma imagem já publicada."
        tamanho="md"
        rodape={
          <>
            <Botao type="button" variante="secundario" onClick={() => setPainelImagem(false)}>
              Cancelar
            </Botao>
            <Botao type="button" onClick={aplicarImagem} disabled={!imagem.url}>
              Inserir
            </Botao>
          </>
        }
      >
        <div className="space-y-5">
          <EnviarArquivo
            rotulo="Enviar do computador"
            aceita={["image/jpeg", "image/png", "image/webp"]}
            tamanhoMaximoMb={8}
            aoEnviado={aoEnviarImagem}
          />
          <Campo
            rotulo="Ou endereço da imagem"
            type="text"
            inputMode="url"
            value={imagem.url}
            onChange={(evento) => setImagem((atual) => ({ ...atual, url: evento.target.value }))}
            onKeyDown={impedirEnvioComEnter}
            placeholder="/uploads/exemplo.jpg"
          />
          <Campo
            rotulo="Descrição da imagem"
            value={imagem.alt}
            onChange={(evento) => setImagem((atual) => ({ ...atual, alt: evento.target.value }))}
            onKeyDown={impedirEnvioComEnter}
            ajuda="Descreva o que a imagem mostra. Quem usa leitor de tela depende disto."
          />
        </div>
      </Painel>
    </div>
  );
}
