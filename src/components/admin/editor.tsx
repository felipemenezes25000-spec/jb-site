"use client";

import { Color } from "@tiptap/extension-color";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useState } from "react";

import { cn } from "@/lib/utils";

const VERMELHO = "#fd0003";
const AZUL = "#394053";

/**
 * Editor de conteúdo — o lugar do TinyMCE do MARS.
 *
 * TextStyle + Color preservam os <span style="color:…"> que o conteúdo antigo
 * usa nos marcadores e nos títulos. Para qualquer coisa que o editor visual
 * não saiba representar existe a aba "HTML", que edita a marcação crua e
 * garante que nada se perca.
 */
export function Editor({ name, valorInicial }: { name: string; valorInicial: string }) {
  const [html, setHtml] = useState(valorInicial);
  const [modo, setModo] = useState<"visual" | "html">("visual");

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, autolink: false }),
    ],
    content: valorInicial,
    editorProps: {
      attributes: {
        class:
          "prose-editor min-h-72 max-w-none rounded-b-md border border-t-0 border-slate-300 bg-white px-4 py-3 text-sm leading-relaxed outline-none",
      },
    },
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
  });

  const botao = (rotulo: string, acao: () => void, ativo?: boolean, titulo?: string) => (
    <button
      key={rotulo}
      type="button"
      title={titulo ?? rotulo}
      onClick={acao}
      className={cn(
        "rounded px-2.5 py-1 text-xs font-semibold transition-colors",
        ativo ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-200",
      )}
    >
      {rotulo}
    </button>
  );

  return (
    <div>
      <input type="hidden" name={name} value={html} />

      <div className="flex items-center gap-1 rounded-t-md border border-slate-300 bg-slate-100 px-2 py-1.5">
        {modo === "visual" && editor ? (
          <>
            {botao("B", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"), "Negrito")}
            {botao("I", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"), "Itálico")}
            {botao("U", () => editor.chain().focus().toggleUnderline().run(), editor.isActive("underline"), "Sublinhado")}
            <span className="mx-1 h-4 w-px bg-slate-300" />
            {botao("H2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
            {botao("H3", () => editor.chain().focus().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }))}
            {botao("Lista", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
            <span className="mx-1 h-4 w-px bg-slate-300" />
            <button
              type="button"
              title="Texto em vermelho"
              onClick={() => editor.chain().focus().setColor(VERMELHO).run()}
              className="size-5 rounded-full border border-slate-300"
              style={{ background: VERMELHO }}
            />
            <button
              type="button"
              title="Texto em azul-chumbo"
              onClick={() => editor.chain().focus().setColor(AZUL).run()}
              className="size-5 rounded-full border border-slate-300"
              style={{ background: AZUL }}
            />
            {botao("Sem cor", () => editor.chain().focus().unsetColor().run())}
            <span className="mx-1 h-4 w-px bg-slate-300" />
            {botao("Link", () => {
              const url = window.prompt("Endereço do link:", editor.getAttributes("link").href ?? "");
              if (url === null) return;
              if (url === "") editor.chain().focus().unsetLink().run();
              else editor.chain().focus().setLink({ href: url }).run();
            }, editor.isActive("link"))}
          </>
        ) : (
          <span className="px-1 text-xs text-slate-500">
            Marcação crua — cuidado ao editar
          </span>
        )}

        <button
          type="button"
          onClick={() => {
            if (modo === "html") editor?.commands.setContent(html, { emitUpdate: false });
            setModo(modo === "visual" ? "html" : "visual");
          }}
          className="ml-auto rounded px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-200"
        >
          {modo === "visual" ? "HTML" : "Visual"}
        </button>
      </div>

      {modo === "visual" ? (
        <EditorContent editor={editor} />
      ) : (
        <textarea
          value={html}
          onChange={(e) => setHtml(e.target.value)}
          spellCheck={false}
          className="min-h-72 w-full rounded-b-md border border-t-0 border-slate-300 bg-white px-4 py-3 font-mono text-xs leading-relaxed outline-none"
        />
      )}
    </div>
  );
}
