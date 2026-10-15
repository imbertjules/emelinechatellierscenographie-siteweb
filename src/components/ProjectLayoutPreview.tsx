"use client";

import type { CanvasPlacement, SiteSettings } from "@/lib/types";
import { ProjectPublicView, type PublicViewBlock } from "@/components/ProjectPublicView";

type PreviewBlock =
  | {
      id: string;
      type: "image";
      src: string;
      caption: string;
      canvas?: CanvasPlacement;
    }
  | { id: string; type: "text"; content: string; align?: "left" | "center" | "right" };

type Props = {
  title: string;
  blocks: PreviewBlock[];
  settings: SiteSettings;
  onClose: () => void;
};

/**
 * Full-screen aperçu that mirrors the public project page (header, typography, layout).
 */
export function ProjectLayoutPreview({ title, blocks, settings, onClose }: Props) {
  const viewBlocks: PublicViewBlock[] = blocks.map((b) =>
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
          align: b.align || "left",
        },
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aperçu du projet"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#000",
        overflow: "auto",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          padding: "10px 16px",
          pointerEvents: "none",
        }}
      >
        <p
          style={{
            margin: 0,
            marginRight: "auto",
            fontSize: 12,
            color: "#fff",
            background: "rgba(0,0,0,0.55)",
            padding: "6px 10px",
            pointerEvents: "none",
            maxWidth: "70%",
          }}
        >
          Aperçu public — non enregistré tant que vous n’avez pas cliqué sur Enregistrer
        </p>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: "1px solid #fff",
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            padding: "8px 14px",
            cursor: "pointer",
            pointerEvents: "auto",
            fontSize: 14,
          }}
        >
          Fermer
        </button>
      </div>

      <ProjectPublicView title={title} blocks={viewBlocks} settings={settings} previewChrome />
    </div>
  );
}
