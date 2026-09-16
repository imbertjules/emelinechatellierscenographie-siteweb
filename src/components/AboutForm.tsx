"use client";

import { saveAboutAction } from "@/lib/actions";
import { Wysiwyg } from "@/components/Wysiwyg";

export function AboutForm({ initialHtml }: { initialHtml: string }) {
  async function submitAbout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await saveAboutAction(formData);
  }

  return (
    <form
      onSubmit={submitAbout}
      style={{ display: "grid", gap: 16, width: "100%" }}
    >
      <Wysiwyg name="aboutHtml" initialHtml={initialHtml} />
      <button
        type="submit"
        style={{
          width: "fit-content",
          background: "#111",
          color: "#fff",
          border: 0,
          padding: "10px 16px",
          cursor: "pointer",
        }}
      >
        Enregistrer
      </button>
    </form>
  );
}
