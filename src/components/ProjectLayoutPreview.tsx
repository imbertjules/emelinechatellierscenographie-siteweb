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
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 50,
          border: "1px solid #fff",
          background: "rgba(0,0,0,0.8)",
          color: "#fff",
          padding: "8px 14px",
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        Fermer l’aperçu
      </button>

      <ProjectPublicView title={title} blocks={viewBlocks} settings={settings} previewChrome />
    </div>
  );
}
