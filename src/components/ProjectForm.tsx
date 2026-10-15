"use client";

import { useMemo, useRef, useState } from "react";
import { unstable_rethrow } from "next/navigation";
import type { CanvasPlacement, Project, ProjectBlock, SiteSettings } from "@/lib/types";
import { clampPlacement, defaultCanvasPlacement } from "@/lib/types";
import { deleteProjectAction, saveProjectAction } from "@/lib/actions";
import { Wysiwyg } from "@/components/Wysiwyg";
import { ProjectPublicView } from "@/components/ProjectPublicView";

// Leave room under Vercel's 4.5 MB function body limit for multipart framing.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

type DraftImage = {
  id: string;
  type: "image";
  src: string;
  caption: string;
  width: "full" | "half" | "third";
  align: "left" | "center" | "right";
  canvas: CanvasPlacement;
  isHomePhoto: boolean;
  file?: File;
};

type DraftText = {
  id: string;
  type: "text";
  content: string;
  align: "left" | "center" | "right";
};

type DraftBlock = DraftImage | DraftText;

function isImageBlock(block: DraftBlock | undefined): block is DraftImage {
  return !!block && block.type === "image";
}

function newId() {
  return crypto.randomUUID();
}

function draftsFrom(project?: Project): DraftBlock[] {
  const source: ProjectBlock[] =
    project?.content ||
    project?.images.map((img) => ({
      type: "image" as const,
      src: img.src,
      caption: img.caption,
      width: "full" as const,
      align: "center" as const,
    })) ||
    [];

  let imageIndex = 0;
  return source.map((block) => {
    if (block.type === "image") {
      const canvas = clampPlacement(block.canvas || defaultCanvasPlacement(imageIndex));
      imageIndex += 1;
      return {
        id: newId(),
        type: "image" as const,
        src: block.src,
        caption: block.caption,
        width: block.width || "full",
        align: block.align || "center",
        canvas,
        isHomePhoto: !!block.isHomePhoto,
      };
    }
    return { id: newId(), type: "text" as const, content: block.content, align: block.align };
  });
}

function isStoredSrc(src: string) {
  return src.startsWith("/") || src.startsWith("http://") || src.startsWith("https://");
}

function cannotUseFile(name: string) {
  return `« ${name} » ne peut pas être utilisé.`;
}

function decodeImage(file: File): Promise<{ img: HTMLImageElement; revoke: () => void }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    const revoke = () => URL.revokeObjectURL(url);
    const fail = () => {
      revoke();
      reject(new Error(cannotUseFile(file.name)));
    };
    img.onload = () => {
      if (!img.naturalWidth || !img.naturalHeight) {
        fail();
        return;
      }
      resolve({ img, revoke });
    };
    img.onerror = fail;
    img.src = url;
  });
}

function canvasToBlob(img: HTMLImageElement, maxWidth: number, quality: number, name: string): Promise<Blob> {
  const ratio = img.naturalWidth / img.naturalHeight;
  const width = Math.max(1, Math.min(maxWidth, img.naturalWidth));
  const height = Math.max(1, Math.round(width / ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error(cannotUseFile(name)));
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error(cannotUseFile(name)));
      else resolve(blob);
    }, "image/webp", quality);
  });
}

async function prepareUpload(file: File): Promise<File> {
  const { img, revoke } = await decodeImage(file);
  const base = (file.name.replace(/\.[^/.]+$/, "") || "image").slice(0, 80);
  const attempts: Array<[number, number]> = [
    [1600, 0.8],
    [1280, 0.7],
    [960, 0.6],
  ];
  try {
    for (const [width, quality] of attempts) {
      const blob = await canvasToBlob(img, width, quality, file.name);
      const prepared = new File([blob], `${base}.webp`, { type: "image/webp" });
      if (prepared.size > 0 && prepared.size <= MAX_UPLOAD_BYTES) return prepared;
    }
    throw new Error(`« ${file.name} » est trop volumineux pour être envoyé.`);
  } finally {
    revoke();
  }
}

async function uploadPrepared(originalName: string, prepared: File): Promise<string> {
  const body = new FormData();
  body.append("file", prepared, prepared.name);
  const resp = await fetch("/api/upload", { method: "POST", body });
  let payload: { url?: string; error?: string } = {};
  try {
    payload = await resp.json();
  } catch {
    payload = {};
  }
  if (resp.status === 401) {
    throw new Error("Session expirée. Reconnectez-vous.");
  }
  if (!resp.ok || !payload.url) {
    const detail = payload.error || `échec de l'envoi (${resp.status}).`;
    throw new Error(`« ${originalName} » : ${detail}`);
  }
  return payload.url;
}

async function discardUploads(urls: string[]) {
  await Promise.all(
    urls.map(async (url) => {
      try {
        await fetch("/api/upload", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url }),
        });
      } catch {
        // The project was not saved. A leftover file is logged by the route if deletion fails.
      }
    }),
  );
}

export function ProjectForm({
  project,
  settings,
}: {
  project?: Project;
  settings: SiteSettings;
}) {
  const [blocks, setBlocks] = useState<DraftBlock[]>(() => draftsFrom(project));
  const [titleDraft, setTitleDraft] = useState(project?.title || "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [inputFont] = useState<"helvetica" | "georgia">("helvetica");
  const savingRef = useRef(false);

  const canvasPhotos = useMemo(
    () => blocks.filter((b): b is DraftImage => isImageBlock(b) && !!b.src),
    [blocks],
  );

  function applyInputFont(form: HTMLFormElement | null, font: "helvetica" | "georgia") {
    if (!form) return;
    const cls = font === "georgia" ? "typo-georgia" : "typo-helvetica";
    const remove = font === "georgia" ? "typo-helvetica" : "typo-georgia";
    form.querySelectorAll("input, textarea, select").forEach((el) => {
      el.classList.remove(remove);
      el.classList.add(cls);
    });
  }

  async function acceptFile(id: string, file: File) {
    try {
      const decoded = await decodeImage(file);
      decoded.revoke();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : cannotUseFile(file.name));
      return;
    }
    const preview = URL.createObjectURL(file);
    setBlocks((prev) =>
      prev.map((block) => {
        if (block.id !== id || block.type !== "image") return block;
        if (block.src.startsWith("blob:")) URL.revokeObjectURL(block.src);
        return { ...block, file, src: preview };
      }),
    );
    setUploadError("");
  }

  async function submitProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    savingRef.current = true;
    setUploading(true);
    setUploadError("");

    const form = event.currentTarget;
    const formData = new FormData();
    formData.append("id", (form.querySelector('input[name="id"]') as HTMLInputElement)?.value || "");
    formData.append("title", (form.querySelector('input[name="title"]') as HTMLInputElement)?.value || "");
    formData.append("order", String((form.querySelector('input[name="order"]') as HTMLInputElement)?.value || "1"));
    formData.append("homeWidth", (form.querySelector('select[name="homeWidth"]') as HTMLSelectElement)?.value || "medium");
    formData.append("homeAlign", (form.querySelector('select[name="homeAlign"]') as HTMLSelectElement)?.value || "center");
    if (project?.homeCanvas) {
      formData.append("homeCanvas", JSON.stringify(project.homeCanvas));
    }
    const showOnHomeEl = form.querySelector('input[name="showOnHome"]') as HTMLInputElement | null;
    if (showOnHomeEl?.checked) formData.append("showOnHome", "on");

    const snapshot = blocks;
    const uploadedUrls: string[] = [];

    try {
      const missing = snapshot.find((block) => isImageBlock(block) && !block.file && !isStoredSrc(block.src));
      if (missing) {
        throw new Error("Chaque bloc image doit avoir une photo. Choisissez un fichier ou supprimez le bloc.");
      }

      const urls = new Map<string, string>();
      for (const block of snapshot) {
        if (!isImageBlock(block) || !block.file) continue;
        const prepared = await prepareUpload(block.file);
        const url = await uploadPrepared(block.file.name, prepared);
        uploadedUrls.push(url);
        urls.set(block.id, url);
      }

      const content: ProjectBlock[] = snapshot.map((block) => {
        if (block.type === "text") {
          return { type: "text", content: block.content, align: block.align };
        }
        const src = urls.get(block.id) || block.src;
        if (!isStoredSrc(src)) {
          throw new Error("Chaque bloc image doit avoir une photo. Choisissez un fichier ou supprimez le bloc.");
        }
        return {
          type: "image",
          src,
          caption: block.caption,
          width: block.width,
          align: block.align,
          canvas: clampPlacement(block.canvas),
          isHomePhoto: block.isHomePhoto,
        };
      });

      const imageBlocks = content.filter(
        (block): block is Extract<ProjectBlock, { type: "image" }> => block.type === "image",
      );
      const homeFirst = [
        ...imageBlocks.filter((b) => b.isHomePhoto),
        ...imageBlocks.filter((b) => !b.isHomePhoto),
      ];
      const images = homeFirst.map((block) => ({ src: block.src, caption: block.caption }));

      formData.set("content", JSON.stringify(content));
      formData.set("images", JSON.stringify(images));
      await saveProjectAction(formData);
    } catch (error) {
      unstable_rethrow(error);
      await discardUploads(uploadedUrls);
      setUploadError(error instanceof Error ? error.message : "Erreur lors de l'enregistrement.");
    } finally {
      savingRef.current = false;
      setUploading(false);
    }
  }

  const addBlock = (type: DraftBlock["type"]) => {
    const imageCount = blocks.filter((b) => b.type === "image").length;
    const block: DraftBlock =
      type === "image"
        ? {
            id: newId(),
            type: "image",
            src: "",
            caption: "",
            width: "full",
            align: "center",
            canvas: defaultCanvasPlacement(imageCount),
            isHomePhoto: imageCount === 0,
          }
        : { id: newId(), type: "text", content: "", align: "left" };
    setBlocks((prev) => [...prev, block]);
  };

  const updateBlock = (id: string, updates: Partial<DraftImage> | Partial<DraftText>) => {
    setBlocks((prev) => prev.map((block) => (block.id === id ? ({ ...block, ...updates } as DraftBlock) : block)));
  };

  const setHomePhoto = (id: string) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.type === "image" ? { ...block, isHomePhoto: block.id === id } : block,
      ),
    );
  };

  const updateCanvasPlacement = (id: string, placement: CanvasPlacement) => {
    setBlocks((prev) =>
      prev.map((block) =>
        block.type === "image" && block.id === id ? { ...block, canvas: placement } : block,
      ),
    );
  };

  const removeBlock = (id: string) => {
    setBlocks((prev) => {
      const block = prev.find((item) => item.id === id);
      if (isImageBlock(block) && block.src.startsWith("blob:")) URL.revokeObjectURL(block.src);
      const next = prev.filter((item) => item.id !== id);
      const images = next.filter(isImageBlock);
      if (images.length && !images.some((img) => img.isHomePhoto)) {
        return next.map((item) =>
          item.type === "image" && item.id === images[0].id ? { ...item, isHomePhoto: true } : item,
        );
      }
      return next;
    });
  };

  return (
    <>
      <form
        onSubmit={submitProject}
        style={{ display: "grid", gap: 24, maxWidth: 960, margin: "0 auto" }}
        ref={(f) => {
          if (f) applyInputFont(f, inputFont);
        }}
      >
        <fieldset disabled={uploading} style={{ border: 0, padding: 0, margin: 0, minWidth: 0, display: "grid", gap: 24 }}>
          <input type="hidden" name="id" value={project?.id || ""} />

          <label style={{ display: "grid", gap: 6 }}>
            Titre
            <input
              name="title"
              required
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              style={inputStyle}
            />
          </label>
          <p style={{ margin: 0, fontSize: 14, color: "#444" }}>
            Le titre et les blocs texte restent fixes sur la page projet (titre en haut, textes dans
            l’ordre). Seules les photos se placent sur le canevas.
          </p>

          <label style={{ display: "grid", gap: 6 }}>
            Ordre sur l’accueil
            <input name="order" type="number" defaultValue={project?.order ?? 1} style={inputStyle} />
          </label>

          <div style={{ display: "grid", gap: 16 }}>
            <label style={{ display: "grid", gap: 6 }}>
              Taille vignette (secours sans canevas d’accueil)
              <select name="homeWidth" defaultValue={project?.homeWidth ?? "medium"} style={inputStyle}>
                <option value="small">Petite</option>
                <option value="medium">Moyenne</option>
                <option value="large">Grande</option>
                <option value="full">Pleine largeur</option>
              </select>
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              Alignement vignette (secours)
              <select name="homeAlign" defaultValue={project?.homeAlign ?? "center"} style={inputStyle}>
                <option value="left">Gauche</option>
                <option value="center">Centre</option>
                <option value="right">Droite</option>
              </select>
            </label>
          </div>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" name="showOnHome" defaultChecked={project?.showOnHome ?? true} />
            Afficher sur la page d’accueil
          </label>

          <div style={{ display: "grid", gap: 40 }}>
            {blocks.map((block, index) => (
              <fieldset
                key={block.id}
                style={{ border: "1px solid #ccc", padding: 20, display: "grid", gap: 16, position: "relative" }}
              >
                <legend style={{ padding: "0 10px", fontWeight: "bold" }}>
                  Bloc {index + 1} : {block.type === "image" ? "Image" : "Texte"}
                </legend>

                {block.type === "image" && (
                  <div style={{ display: "grid", gap: 12 }}>
                    <div style={{ display: "grid", gap: 8 }}>
                      <input
                        id={`file-${block.id}`}
                        type="file"
                        name={`file-${block.id}`}
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void acceptFile(block.id, file);
                        }}
                        style={{ display: "none" }}
                      />
                      <label
                        htmlFor={`file-${block.id}`}
                        style={{
                          ...ghostButton,
                          width: "fit-content",
                          display: "inline-flex",
                        }}
                      >
                        {block.src ? "Remplacer l'image" : "Choisir une image"}
                      </label>

                      {block.src ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={block.src}
                            alt={`Prévisualisation ${index + 1}`}
                            style={{
                              maxWidth: 420,
                              maxHeight: 260,
                              objectFit: "contain",
                              border: "1px solid #ddd",
                              background: "#fafafa",
                            }}
                          />
                        </div>
                      ) : null}
                    </div>

                    <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                      <input
                        type="radio"
                        name="homePhoto"
                        checked={block.isHomePhoto}
                        onChange={() => setHomePhoto(block.id)}
                        disabled={!block.src}
                      />
                      Photo d’accueil (vignette)
                    </label>

                    <Wysiwyg
                      name={`caption-${block.id}`}
                      initialHtml={block.caption}
                      disabled={uploading}
                      onChange={(html: string) => updateBlock(block.id, { caption: html })}
                    />
                  </div>
                )}

                {block.type === "text" && (
                  <div style={{ display: "grid", gap: 12 }}>
                    <label style={{ fontSize: 12 }}>
                      Alignement:
                      <select
                        value={block.align}
                        onChange={(e) => updateBlock(block.id, { align: e.target.value as DraftText["align"] })}
                        style={inputStyle}
                      >
                        <option value="left">Gauche</option>
                        <option value="center">Centre</option>
                        <option value="right">Droite</option>
                      </select>
                    </label>
                    <Wysiwyg
                      name={`text-${block.id}`}
                      initialHtml={block.content}
                      disabled={uploading}
                      onChange={(html: string) => updateBlock(block.id, { content: html })}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => removeBlock(block.id)}
                  style={{ ...ghostButton, color: "red", width: "fit-content" }}
                >
                  Supprimer le bloc
                </button>
              </fieldset>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" onClick={() => addBlock("image")} style={ghostButton}>
              + Ajouter Image
            </button>
            <button type="button" onClick={() => addBlock("text")} style={ghostButton}>
              + Ajouter Texte
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="submit" disabled={uploading} style={solidButton}>
              {uploading ? "Envoi en cours..." : "Enregistrer le projet"}
            </button>
          </div>

          {project && (
            <button
              type="button"
              style={{ ...ghostButton, color: "red" }}
              onClick={async () => {
                if (confirm("Supprimer ?")) {
                  const fd = new FormData();
                  fd.append("id", project.id);
                  await deleteProjectAction(fd);
                }
              }}
            >
              Supprimer Projet
            </button>
          )}
        </fieldset>

        {uploadError && <p style={{ color: "red" }}>{uploadError}</p>}
      </form>

      {canvasPhotos.length > 0 || titleDraft ? (
        <section style={{ display: "grid", gap: 12, marginTop: 32 }}>
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 500, color: "#111" }}>
              Page telle que le public la voit
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: "#444", maxWidth: 640 }}>
              Glissez et redimensionnez les photos directement ici — header, titre et textes sont
              déjà en place. Tirez une photo vers le bas pour allonger la page. Enregistrez quand
              les positions vous conviennent.
            </p>
          </div>
          <div
            style={{
              marginLeft: -24,
              marginRight: -24,
              position: "relative",
              zIndex: 0,
              /* Photos stay in this stacking context; admin-body clips under the topbar */
              isolation: "isolate",
            }}
          >
            <ProjectPublicView
              title={titleDraft}
              settings={settings}
              editable
              onCanvasChange={updateCanvasPlacement}
              blocks={blocks.map((b) =>
                b.type === "image"
                  ? {
                      id: b.id,
                      type: "image" as const,
                      src: b.src,
                      caption: b.caption,
                      canvas: b.canvas,
                    }
                  : {
                      id: b.id,
                      type: "text" as const,
                      content: b.content,
                      align: b.align,
                    },
              )}
            />
          </div>
        </section>
      ) : null}
    </>
  );
}

const inputStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  padding: "8px 10px",
  fontSize: 16,
  background: "#fff",
  color: "#000",
};

const ghostButton: React.CSSProperties = {
  border: "1px solid #111",
  background: "transparent",
  padding: "8px 12px",
  cursor: "pointer",
  fontSize: 14,
};

const solidButton: React.CSSProperties = {
  border: "1px solid #111",
  background: "#111",
  color: "#fff",
  padding: "12px 24px",
  cursor: "pointer",
  fontSize: 16,
  fontWeight: "bold",
};
