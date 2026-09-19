"use client";

import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useRef, useState } from "react";
import { Mark, mergeAttributes } from '@tiptap/core';

// Custom mark to apply a CSS class to selected text (used for font choice)
const FontMark = Mark.create({
  name: 'font',
  addOptions() {
    return { HTMLAttributes: {} } as any;
  },
  addAttributes() {
    return {
      class: { default: null },
    };
  },
  parseHTML() {
    return [
      { tag: 'span[class]' },
    ];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
  addCommands() {
    return {
      setFont: (attrs: { class?: string }) => ({ commands }: any) => commands.setMark(this.name, attrs),
      unsetFont: () => ({ commands }: any) => commands.unsetMark(this.name),
    };
  },
});

export function Wysiwyg({
  name,
  initialHtml,
  onChange,
}: {
  name: string;
  initialHtml: string;
  onChange?: (html: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const [, refreshToolbar] = useState(0);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Placeholder.configure({ placeholder: "Votre texte…" }),
      FontMark,
    ],
    content: initialHtml,
    onSelectionUpdate: () => refreshToolbar((value) => value + 1),
  });

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!editor) return;

    const update = () => {
      const html = editor.getHTML();
      if (inputRef.current) {
        inputRef.current.value = html;
      }
      onChangeRef.current?.(html);
      refreshToolbar((value) => value + 1);
    };

    update();
    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
  }, [editor]);

  if (!editor) return <div className="editor-loading">Chargement de l’éditeur…</div>;

  function editLink() {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Adresse du lien", previousUrl || "https://");
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div className="rich-editor">
      <input ref={inputRef} type="hidden" name={name} defaultValue={initialHtml} />
      <div className="editor-toolbar" role="toolbar" aria-label="Mise en forme du texte">
        <EditorButton active={editor.isActive("paragraph")} onClick={() => editor.chain().focus().setParagraph().run()} label="Paragraphe">¶</EditorButton>
        <EditorButton active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} label="Titre principal">H2</EditorButton>
        <EditorButton active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} label="Sous-titre">H3</EditorButton>
        <span className="editor-divider" />
        <EditorButton active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} label="Gras"><strong>G</strong></EditorButton>
        <EditorButton active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} label="Italique"><em>I</em></EditorButton>
        <EditorButton active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} label="Souligné"><u>S</u></EditorButton>
        <EditorButton active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} label="Barré"><s>B</s></EditorButton>
        <span className="editor-divider" />
        {/* Font toggles: Georgia / Helvetica */}
        <EditorButton active={editor.isActive('font', { class: 'typo-georgia' })} onClick={() => editor.chain().focus().setFont({ class: 'typo-georgia' }).run()} label="Georgia">GEO</EditorButton>
        <EditorButton active={editor.isActive('font', { class: 'typo-helvetica' })} onClick={() => editor.chain().focus().setFont({ class: 'typo-helvetica' }).run()} label="Helvetica">HEL</EditorButton>
        <EditorButton onClick={() => editor.chain().focus().unsetFont().run()} label="Réinitialiser police">reset</EditorButton>
        <span className="editor-divider" />
        <EditorButton active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} label="Liste à puces">•≡</EditorButton>
        <EditorButton active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} label="Liste numérotée">1≡</EditorButton>
        <EditorButton active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} label="Citation">“ ”</EditorButton>
        <EditorButton active={editor.isActive("link")} onClick={editLink} label="Ajouter ou modifier un lien">↗</EditorButton>
        <span className="editor-divider" />
        <EditorButton disabled={!editor.can().chain().focus().undo().run()} onClick={() => editor.chain().focus().undo().run()} label="Annuler">↶</EditorButton>
        <EditorButton disabled={!editor.can().chain().focus().redo().run()} onClick={() => editor.chain().focus().redo().run()} label="Rétablir">↷</EditorButton>
      </div>
      <EditorContent editor={editor} />
      <p className="editor-help">Sélectionnez un passage, puis choisissez sa mise en forme.</p>
    </div>
  );
}

function EditorButton({
  children,
  onClick,
  active,
  disabled = false,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      className={`editor-button${active ? " is-active" : ""}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}
