"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";

export function Wysiwyg({
  name,
  initialHtml,
}: {
  name: string;
  initialHtml: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: "Votre texte…",
      }),
    ],
    content: initialHtml,
  });

  useEffect(() => {
    if (!editor) return;
    const input = document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    if (input) input.value = editor.getHTML();
    const update = () => {
      if (input) input.value = editor.getHTML();
    };
    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
  }, [editor, name]);

  if (!editor) return <div className="tiptap">Chargement de l’éditeur…</div>;

  return (
    <div>
      <input type="hidden" name={name} defaultValue={initialHtml} />
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <EditorButton
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          Gras
        </EditorButton>
        <EditorButton
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          Italique
        </EditorButton>
        <EditorButton
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          Titre
        </EditorButton>
        <EditorButton
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          Liste
        </EditorButton>
        <EditorButton
          onClick={() => {
            const url = window.prompt("Lien");
            if (!url) return;
            editor.chain().focus().setLink({ href: url }).run();
          }}
        >
          Lien
        </EditorButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function EditorButton({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: "1px solid #111",
        background: active ? "#111" : "#fff",
        color: active ? "#fff" : "#111",
        padding: "4px 10px",
        cursor: "pointer",
        fontSize: 13,
      }}
    >
      {children}
    </button>
  );
}
