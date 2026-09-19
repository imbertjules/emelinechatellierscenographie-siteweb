"use client";

import { useState } from "react";
import type { Project, ProjectBlock } from "@/lib/types";
import { deleteProjectAction, saveProjectAction } from "@/lib/actions";
import { Wysiwyg } from "@/components/Wysiwyg";

export function ProjectForm({ project }: { project?: Project }) {
  // Type guard to narrow ProjectBlock to image block without unsafe casts
  function isImageBlock(b: ProjectBlock | undefined): b is Extract<ProjectBlock, { type: 'image' }> {
    return !!b && b.type === 'image';
  }

  const [blocks, setBlocks] = useState<ProjectBlock[]>(
    project?.content ||
    project?.images.map(img => ({
      type: 'image', src: img.src, caption: img.caption, width: 'full', align: 'center'
    })) || []
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [inputFont, setInputFont] = useState<'helvetica'|'georgia'>('helvetica');

  // Apply selected font class to all inputs/textareas/selects in the form
  function applyInputFont(form: HTMLFormElement | null, font: 'helvetica'|'georgia') {
    if (!form) return;
    const cls = font === 'georgia' ? 'typo-georgia' : 'typo-helvetica';
    const remove = font === 'georgia' ? 'typo-helvetica' : 'typo-georgia';
    form.querySelectorAll('input, textarea, select').forEach((el) => {
      el.classList.remove(remove);
      el.classList.add(cls);
    });
  }

  async function submitProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    // Build a minimal FormData to send to the server action — avoid including file inputs
    // which would keep File objects in the payload (and cause "Request Entity Too Large").
    const formData = new FormData();
    formData.append("id", (form.querySelector('input[name="id"]') as HTMLInputElement)?.value || "");
    formData.append("title", (form.querySelector('input[name="title"]') as HTMLInputElement)?.value || "");
    formData.append("order", String((form.querySelector('input[name="order"]') as HTMLInputElement)?.value || "1"));
    formData.append("homeWidth", (form.querySelector('select[name="homeWidth"]') as HTMLSelectElement)?.value || "medium");
    formData.append("homeAlign", (form.querySelector('select[name="homeAlign"]') as HTMLSelectElement)?.value || "center");
    const showOnHomeEl = form.querySelector('input[name="showOnHome"]') as HTMLInputElement | null;
    if (showOnHomeEl && showOnHomeEl.checked) formData.append("showOnHome", "on");

    const imagesToUpload: Array<{ file: File; blockIndex: number }> = [];
    blocks.forEach((block, index) => {
      if (block.type === 'image') {
        const fileInput = form.querySelector(`input[name="file-${index}"]`) as HTMLInputElement;
        if (fileInput?.files?.[0]) {
          imagesToUpload.push({ file: fileInput.files[0], blockIndex: index });
        }
      }
    });

    setUploading(true);
    setUploadError("");

    try {
      const uploadedImages: Array<{ index: number; url: string }> = [];
      if (imagesToUpload.length > 0) {
        const fd = new FormData();

        // Compress large images on the client before uploading to Supabase.
        async function compressImage(file: File, maxWidth = 1600, quality = 0.8): Promise<File> {
          return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
              try {
                const ratio = img.width && img.height ? img.width / img.height : 1;
                const width = Math.min(maxWidth, img.width);
                const height = Math.max(1, Math.round(width / ratio));
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Canvas context unavailable');
                ctx.drawImage(img, 0, 0, width, height);
                const type = 'image/webp';
                canvas.toBlob((blob) => {
                  try {
                    URL.revokeObjectURL(url);
                  } catch (e) {}
                  if (!blob) return reject(new Error('Compression failed'));
                  const outFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), { type: blob.type });
                  resolve(outFile);
                }, type, quality);
              } catch (e) {
                try { URL.revokeObjectURL(url); } catch (er) {}
                reject(e);
              }
            };
            img.onerror = (e) => {
              try { URL.revokeObjectURL(url); } catch (er) {}
              reject(e);
            };
            img.src = url;
          });
        }

        const compressedFiles = await Promise.all(imagesToUpload.map(async ({ file, blockIndex }) => {
          // Only attempt to compress images larger than ~1MB to save cycles
          if (file.size > 1024 * 512) {
            try {
              const f = await compressImage(file, 1600, 0.8);
              return { file: f, blockIndex };
            } catch (e) {
              return { file, blockIndex };
            }
          }
          return { file, blockIndex };
        }));

        compressedFiles.forEach(({ file, blockIndex }, i) => {
          fd.append(`file-${i}`, file, file.name);
          fd.append(`index-${i}`, String(blockIndex));
        });

        const resp = await fetch('/api/upload', { method: 'POST', body: fd });
        if (!resp.ok) throw new Error(`Upload failed: ${resp.status}`);
        const json = await resp.json();
        uploadedImages.push(...json);
      }

      const finalBlocks = [...blocks];
      uploadedImages.forEach(({ index, url }) => {
        const target = finalBlocks[index];
        if (isImageBlock(target)) {
          target.src = url;
        }
      });

      // Ensure we never persist browser blob: URLs. If a block still has a blob: src
      // (preview) and the user didn't upload it, fall back to the original project value
      // if available, otherwise clear the src so we don't store an invalid blob URL.
      for (let i = 0; i < finalBlocks.length; i += 1) {
        const b = finalBlocks[i];
        if (isImageBlock(b) && b.src.startsWith('blob:')) {
          // Prefer matching content block src if present and it's an image
          const contentBlock = project?.content?.[i];
          let fallback = project?.images?.[i]?.src ?? "";
          if (contentBlock && contentBlock.type === 'image') {
            // contentBlock is narrowed to image block by discriminated union
            fallback = contentBlock.src || fallback;
          }
          b.src = fallback || "";
        }
      }

      const homeImages = finalBlocks
        .filter(isImageBlock)
        .map(b => ({ src: b.src, caption: b.caption }));

      formData.set("content", JSON.stringify(finalBlocks));
      formData.set("images", JSON.stringify(homeImages));

      await saveProjectAction(formData);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Erreur lors de l'enregistrement.");
    } finally {
      setUploading(false);
    }
  }

  const addBlock = (type: ProjectBlock['type']) => {
    const newBlock: ProjectBlock =
      type === 'image'
        ? { type: 'image', src: '', caption: '', width: 'full', align: 'center' }
        : { type: 'text', content: '', align: 'left' };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (index: number, updates: Partial<ProjectBlock>) => {
    setBlocks(prev => prev.map((b, i) => i === index ? ({ ...b, ...updates } as ProjectBlock) : b));
  };

  const removeBlock = (index: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={submitProject} style={{ display: "grid", gap: 24, maxWidth: 800, margin: "0 auto" }} ref={(f) => { if (f) applyInputFont(f, inputFont); }}>
      <input type="hidden" name="id" value={project?.id || ""} />

      <label style={{ display: "grid", gap: 6 }}>
        Police des champs (inputs)
        <select name="inputFont" value={inputFont} onChange={(e) => { const val = e.target.value as 'helvetica'|'georgia'; setInputFont(val); applyInputFont(e.currentTarget.closest('form'), val); }} style={inputStyle}>
          <option value="helvetica">Helvetica (par défaut)</option>
          <option value="georgia">Georgia</option>
        </select>
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        Titre
        <input name="title" required defaultValue={project?.title} style={inputStyle} />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        Ordre sur l’accueil
        <input name="order" type="number" defaultValue={project?.order ?? 1} style={inputStyle} />
      </label>

      <div style={{ display: "grid", gap: 16 }}>
        <label style={{ display: "grid", gap: 6 }}>
          Taille de l’image
          <select name="homeWidth" defaultValue={project?.homeWidth ?? "medium"} style={inputStyle}>
            <option value="small">Petite</option>
            <option value="medium">Moyenne</option>
            <option value="large">Grande</option>
            <option value="full">Pleine largeur</option>
          </select>
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          Alignement sur la page d’accueil
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
          <fieldset key={index} style={{ border: "1px solid #ccc", padding: 20, display: "grid", gap: 16, position: "relative" }}>
            <legend style={{ padding: "0 10px", fontWeight: "bold" }}>
              Bloc {index + 1} : {block.type === 'image' ? 'Image' : 'Texte'}
            </legend>

            {block.type === 'image' && (
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ display: "grid", gap: 8 }}>
                  <input
                    id={`file-${index}`}
                    type="file"
                    name={`file-${index}`}
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        updateBlock(index, { src: URL.createObjectURL(file) });
                      }
                    }}
                    style={{ display: "none" }}
                  />
                  <label
                    htmlFor={`file-${index}`}
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

                <div style={{ display: "flex", gap: 12 }}>
                  <label style={{ fontSize: 12 }}>Largeur:
                    <select value={block.width} onChange={e => updateBlock(index, { width: e.target.value as never })} style={inputStyle}>
                      <option value="full">Pleine</option>
                      <option value="half">Moitié</option>
                      <option value="third">Tiers</option>
                    </select>
                  </label>
                  <label style={{ fontSize: 12 }}>Alignement:
                    <select value={block.align} onChange={e => updateBlock(index, { align: e.target.value as never })} style={inputStyle}>
                      <option value="left">Gauche</option>
                      <option value="center">Centre</option>
                      <option value="right">Droite</option>
                    </select>
                  </label>
                </div>
                <Wysiwyg
                  name={`caption-${index}`}
                  initialHtml={block.caption}
                  onChange={(html: string) => updateBlock(index, { caption: html })}
                />
              </div>
            )}

            {block.type === 'text' && (
              <div style={{ display: "grid", gap: 12 }}>
                <label style={{ fontSize: 12 }}>Alignement:
                  <select value={block.align} onChange={e => updateBlock(index, { align: e.target.value as never })} style={inputStyle}>
                    <option value="left">Gauche</option>
                    <option value="center">Centre</option>
                    <option value="right">Droite</option>
                  </select>
                </label>
                <Wysiwyg
                  name={`text-${index}`}
                  initialHtml={block.content}
                  onChange={(html: string) => updateBlock(index, { content: html })}
                />
              </div>
            )}

            <button type="button" onClick={() => removeBlock(index)} style={{ ...ghostButton, color: 'red', width: 'fit-content' }}>Supprimer le bloc</button>
          </fieldset>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => addBlock('image')} style={ghostButton}>+ Ajouter Image</button>
        <button type="button" onClick={() => addBlock('text')} style={ghostButton}>+ Ajouter Texte</button>
      </div>

      <button type="submit" style={solidButton}>
        {uploading ? "Envoi en cours..." : "Enregistrer le projet"}
      </button>

      {uploadError && <p style={{ color: 'red' }}>{uploadError}</p>}

      {project && (
        <button type="button" style={{ ...ghostButton, color: 'red' }} onClick={async () => {
          if(confirm("Supprimer ?")) {
            const fd = new FormData();
            fd.append("id", project.id);
            await deleteProjectAction(fd);
          }
        }}>Supprimer Projet</button>
      )}
    </form>
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
