"use client";

import { useState } from "react";
import { HOME_LAYOUTS } from "@/lib/types";
import type { Project, ProjectBlock } from "@/lib/types";
import { deleteProjectAction, saveProjectAction } from "@/lib/actions";
import { Wysiwyg } from "@/components/Wysiwyg";

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
  const [blocks, setBlocks] = useState<ProjectBlock[]>(
    project?.content ||
    project?.images.map(img => ({
      type: 'image', src: img.src, caption: img.caption, width: 'full', align: 'center'
    })) || []
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function submitProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

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
        imagesToUpload.forEach(({ file, blockIndex }, i) => {
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
        if (finalBlocks[index]?.type === 'image') {
          finalBlocks[index].src = url;
        }
      });

      const homeImages = finalBlocks
        .filter(b => b.type === 'image')
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
      type === 'image' ? { type: 'image', src: '', caption: '', width: 'full', align: 'center' } :
      type === 'text' ? { type: 'text', content: '', align: 'left' } :
      { type: 'info', items: [{ label: '', value: '' }] };
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (index: number, updates: Partial<ProjectBlock>) => {
    setBlocks(prev => prev.map((b, i) => i === index ? ({ ...b, ...updates } as ProjectBlock) : b));
  };

  const removeBlock = (index: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={submitProject} style={{ display: "grid", gap: 24, maxWidth: 800, margin: "0 auto" }}>
      <input type="hidden" name="id" value={project?.id || ""} />

      <label style={{ display: "grid", gap: 6 }}>
        Titre
        <input name="title" required defaultValue={project?.title} style={inputStyle} />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        Ordre sur l’accueil
        <input name="order" type="number" defaultValue={project?.order ?? 1} style={inputStyle} />
      </label>

      <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input type="checkbox" name="showOnHome" defaultChecked={project?.showOnHome ?? true} />
        Afficher sur la page d’accueil
      </label>

      <div style={{ display: "grid", gap: 40 }}>
        {blocks.map((block, index) => (
          <fieldset key={index} style={{ border: "1px solid #ccc", padding: 20, display: "grid", gap: 16, position: "relative" }}>
            <legend style={{ padding: "0 10px", fontWeight: "bold" }}>
              Bloc {index + 1} : {block.type === 'image' ? 'Image' : block.type === 'text' ? 'Texte' : 'Infos'}
            </legend>

            {block.type === 'image' && (
              <div style={{ display: "grid", gap: 12 }}>
                <input
                  type="file"
                  name={`file-${index}`}
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      updateBlock(index, { src: URL.createObjectURL(file) });
                    }
                  }}
                />
                <div style={{ display: "flex", gap: 12 }}>
                  <label style={{ fontSize: 12 }}>Largeur:
                    <select value={block.width} onChange={e => updateBlock(index, { width: e.target.value as any })} style={inputStyle}>
                      <option value="full">Pleine</option>
                      <option value="half">Moitié</option>
                      <option value="third">Tiers</option>
                    </select>
                  </label>
                  <label style={{ fontSize: 12 }}>Alignement:
                    <select value={block.align} onChange={e => updateBlock(index, { align: e.target.value as any })} style={inputStyle}>
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
                  <select value={block.align} onChange={e => updateBlock(index, { align: e.target.value as any })} style={inputStyle}>
                    <option value="left">Gauche</option>
                    <option value="center">Centre</option>
                    <option value="right">Droite</option>
                  </select>
                </label>
                <Wysiwyg
                  name={`text-${index}`}
                  initialHtml={block.content}
                  onChangeAction={(html: string) => updateBlock(index, { content: html })}
                />
              </div>
            )}

            {block.type === 'info' && (
              <div style={{ display: "grid", gap: 12 }}>
                {block.items.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 8 }}>
                    <input
                      placeholder="Label"
                      value={item.label}
                      onChange={e => {
                        const newItems = [...block.items];
                        newItems[i].label = e.target.value;
                        updateBlock(index, { items: newItems });
                      }}
                      style={inputStyle}
                    />
                    <input
                      placeholder="Valeur"
                      value={item.value}
                      onChange={e => {
                        const newItems = [...block.items];
                        newItems[i].value = e.target.value;
                        updateBlock(index, { items: newItems });
                      }}
                      style={inputStyle}
                    />
                  </div>
                ))}
                <button type="button" onClick={() => {
                  const newItems = [...block.items, { label: '', value: '' }];
                  updateBlock(index, { items: newItems });
                }} style={ghostButton}>+ Ajouter ligne</button>
              </div>
            )}

            <button type="button" onClick={() => removeBlock(index)} style={{ ...ghostButton, color: 'red', width: 'fit-content' }}>Supprimer le bloc</button>
          </fieldset>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={() => addBlock('image')} style={ghostButton}>+ Ajouter Image</button>
        <button type="button" onClick={() => addBlock('text')} style={ghostButton}>+ Ajouter Texte</button>
        <button type="button" onClick={() => addBlock('info')} style={ghostButton}>+ Ajouter Tableau Infos</button>
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
