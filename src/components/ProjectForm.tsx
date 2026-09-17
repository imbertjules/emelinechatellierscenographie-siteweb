"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
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

async function optimizeImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
    return file;
  }

  const image = await createImageBitmap(file);
  const maxDimension = 2400;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    image.close();
    throw new Error("Impossible de préparer l’image.");
  }

  context.drawImage(image, 0, 0, width, height);
  image.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82),
  );
  if (!blob) {
    throw new Error("Impossible de compresser l’image.");
  }

  const basename = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${basename}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

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
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("imageCount", rows.length.toString());

    // Upload files directly from the browser to Supabase Storage using public anon key
    const filesToUpload = rows
      .map((row, index) => ({ file: row.file, index }))
      .filter((row): row is { file: File; index: number } => Boolean(row.file));

    if (filesToUpload.length === 0) {
      await saveProjectAction(formData);
      return;
    }

    setUploading(true);
    setUploadError("");

    try {
      const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      let uploaded: Array<{ index: number; url: string }> = [];

      if (SUPABASE_URL && SUPABASE_ANON) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);
        uploaded = await Promise.all(
          filesToUpload.map(async ({ file, index }) => {
            const optimizedFile = await optimizeImage(file);
            const filename = optimizedFile.name.replace(/[^a-zA-Z0-9._-]/g, "-");
            const path = `uploads/${Date.now()}-${index}-${filename}`;
            const { data, error } = await supabase.storage.from("uploads").upload(path, optimizedFile as unknown as File, { cacheControl: "3600", upsert: false });
            if (error) throw error;
            const { data: publicData } = supabase.storage.from("uploads").getPublicUrl(path);
            return { index, url: publicData.publicUrl };
          }),
        );
      } else {
        // Fallback: POST files to server API which will upload using SUPABASE_SERVICE_ROLE_KEY or local fallback
        const fd = new FormData();
        filesToUpload.forEach(({ file, index }) => {
          fd.append(`file-${index}`, file, file.name);
          fd.append(`index-${index}`, String(index));
        });
        const resp = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!resp.ok) throw new Error('Upload to server failed');
        uploaded = await resp.json();
      }

      for (const { index, url } of uploaded) {
        formData.set(`existingSrc-${index}`, url);
      }

      await saveProjectAction(formData);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "L’envoi des images a échoué.");
      setUploading(false);
    }
  }

  return (
      <form
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
                      name={`file-${index}`}
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
                  <Wysiwyg
                      name={`caption-${index}`}
                      initialHtml={row.caption}
                      onChange={(caption) =>
                          setRows((current) =>
                              current.map((item, i) =>
                                  i === index ? { ...item, caption } : item,
                              ),
                          )
                      }
                  />
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
                type="button"
                style={{ ...ghostButton, color: "#a10" }}
                onClick={async () => {
                  if (confirm("Supprimer ce projet ?")) {
                    const formData = new FormData();
                    formData.append("id", project.id);
                    await deleteProjectAction(formData);
                  }
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