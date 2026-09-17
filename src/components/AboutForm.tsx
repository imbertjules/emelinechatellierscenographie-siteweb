"use client";

import { saveAboutAction } from "@/lib/actions";
import { Wysiwyg } from "@/components/Wysiwyg";

export function AboutForm({ initialHtml }: { initialHtml: string }) {
  async function submitAbout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    console.log('AboutForm submit, aboutHtml=', formData.get('aboutHtml'));

    try {
      const resp = await fetch('/api/save-about', { method: 'POST', body: formData });
      const json = await resp.json();
      if (!resp.ok) {
        console.error('save-about API error', json);
        alert('Erreur lors de la sauvegarde: ' + (json.error || resp.status));
        return;
      }
      // success: navigate back to the about page
      window.location.href = '/admin/a-propos';
    } catch (e) {
      console.error('Network error saving about:', e);
      alert('Erreur réseau: impossible de sauvegarder');
    }
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
