"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { HOME_LAYOUTS } from "@/lib/types";
import type { Project } from "@/lib/types";
import { deleteProjectAction, saveProjectAction } from "@/lib/actions";
import { Wysiwyg } from "@/components/Wysiwyg";

type Row = {
  existingSrc: string;
  caption: string;
  preview?: string;
  file?: File;
};

export function ProjectForm({ project }: { project?: Project }) {
  const [rows, setRows] = useState<Row[]>(
    project?.images.length
      ? project.images.map((img) => ({
          existingSrc: img.src,
          caption: img.caption,
        }))
      : [{ existingSrc: "", caption: "" }],
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function submitProject(event: React.FormEvent<HTMLFormElement>) {
    const submitter = (event.nativeEvent as SubmitEvent)
      .submitter as HTMLButtonElement | null;
    if (submitter?.dataset.intent === "delete") return;

    const filesToUpload = rows
      .map((row, index) => ({ file: row.file, index }))
      .filter((row): row is { file: File; index: number } => Boolean(row.file));

    if (filesToUpload.length === 0) return;

    event.preventDefault();
    setUploading(true);
    setUploadError("");

    try {
      const uploaded = await Promise.all(
        filesToUpload.map(async ({ file, index }) => {
          const filename = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
          const blob = await upload(`uploads/${Date.now()}-${index}-${filename}`, file, {
            access: "public",
            contentType: file.type || undefined,
            handleUploadUrl: "/api/upload",
            multipart: true,
          });
          return { index, url: blob.url };
        }),
      );

      const formData = new FormData(event.currentTarget);
      for (const { index, url } of uploaded) {
        formData.set(`existingSrc-${index}`, url);
      }
      await saveProjectAction(formData);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "L’envoi des images a échoué.",
      );
      setUploading(false);
    }
  }

  return (
    <form
      action={saveProjectAction}
      onSubmit={submitProject}
      style={{ display: "grid", gap: 18, maxWidth: 720 }}
    >
      <input type="hidden" name="id" value={project?.id || ""} />
      <input type="hidden" name="imageCount" value={rows.length} />

      <label style={{ display: "grid", gap: 6 }}>
        Titre
        <input
          name="title"
          required
          defaultValue={project?.title}
          style={inputStyle}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        Ordre sur l’accueil
        <input
          name="order"
          type="number"
          defaultValue={project?.order ?? 1}
          style={inputStyle}
        />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        Position de la photo dans la grille
        <select
          name="homeLayout"
          defaultValue={project?.homeLayout ?? "mediumleft"}
          style={inputStyle}
        >
          {HOME_LAYOUTS.map((layout) => (
            <option key={layout} value={layout}>
              {layout}
            </option>
          ))}
        </select>
      </label>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          type="checkbox"
          name="showOnHome"
          defaultChecked={project?.showOnHome ?? true}
        />
        Afficher sur la page d’accueil
      </label>

      <div style={{ display: "grid", gap: 24 }}>
        {rows.map((row, index) => (
          <fieldset
            key={`${row.existingSrc}-${index}`}
            style={{ border: "1px solid #ccc", padding: 16, display: "grid", gap: 12 }}
          >
            <legend>Photo {index + 1}</legend>
            <input type="hidden" name={`existingSrc-${index}`} value={row.existingSrc} />
            {(row.preview || row.existingSrc) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.preview || row.existingSrc}
                alt=""
                style={{ width: "100%", maxWidth: 420, height: "auto" }}
              />
            )}
            <label style={{ display: "grid", gap: 6 }}>
              Image
              <input
                type="file"
                accept="image/*"
                required={!row.existingSrc}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  const preview = URL.createObjectURL(file);
                  setRows((current) =>
                    current.map((item, i) =>
                      i === index ? { ...item, file, preview } : item,
                    ),
                  );
                }}
              />
            </label>
            <div style={{ display: "grid", gap: 6 }}>
              <span>Légende sous la photo</span>
              <Wysiwyg name={`caption-${index}`} initialHtml={row.caption} />
            </div>
            {rows.length > 1 ? (
              <button
                type="button"
                onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
                style={ghostButton}
              >
                Retirer cette photo
              </button>
            ) : null}
          </fieldset>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          setRows((current) => [...current, { existingSrc: "", caption: "" }])
        }
        style={ghostButton}
      >
        Ajouter une photo
      </button>

      <button type="submit" style={solidButton}>
        {uploading ? "Envoi des images…" : "Enregistrer"}
      </button>

      {uploadError ? <p style={{ margin: 0, color: "#a10" }}>{uploadError}</p> : null}

      {project ? (
        <button
          type="submit"
          formAction={deleteProjectAction}
          data-intent="delete"
          style={{ ...ghostButton, color: "#a10" }}
          onClick={(event) => {
            if (!confirm("Supprimer ce projet ?")) event.preventDefault();
          }}
        >
          Supprimer
        </button>
      ) : null}
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "8px 10px",
  fontSize: 16,
  background: "#fff",
};

const ghostButton: React.CSSProperties = {
  border: "1px solid #111",
  background: "transparent",
  padding: "8px 12px",
  cursor: "pointer",
  width: "fit-content",
};

const solidButton: React.CSSProperties = {
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  padding: "10px 16px",
  cursor: "pointer",
  width: "fit-content",
};
