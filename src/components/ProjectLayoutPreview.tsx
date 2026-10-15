"use client";

import type { CanvasPlacement, ProjectBlock } from "@/lib/types";
import { defaultCanvasPlacement, projectUsesCanvas } from "@/lib/types";
import { PlacementCanvas, type CanvasItem } from "@/components/PlacementCanvas";

type PreviewBlock =
  | {
      id: string;
      type: "image";
      src: string;
      caption: string;
      canvas?: CanvasPlacement;
    }
  | { id: string; type: "text"; content: string };

type Props = {
  title: string;
  blocks: PreviewBlock[];
  onClose: () => void;
};

export function ProjectLayoutPreview({ title, blocks, onClose }: Props) {
  const imageBlocks = blocks.filter(
    (b): b is Extract<PreviewBlock, { type: "image" }> => b.type === "image" && !!b.src,
  );
  const textBlocks = blocks.filter((b): b is Extract<PreviewBlock, { type: "text" }> => b.type === "text");

  const asProject = {
    content: imageBlocks.map((b) => ({
      type: "image" as const,
      src: b.src,
      caption: b.caption,
      canvas: b.canvas,
    })) as ProjectBlock[],
  };
  const useCanvas = projectUsesCanvas(asProject);

  const canvasItems: CanvasItem[] = imageBlocks.map((b, i) => ({
    id: b.id,
    src: b.src,
    placement: b.canvas || defaultCanvasPlacement(i),
  }));

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
        color: "#fff",
        overflow: "auto",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          padding: "12px 20px",
          background: "rgba(0,0,0,0.85)",
          borderBottom: "1px solid #333",
        }}
      >
        <p style={{ margin: 0, fontSize: 14, opacity: 0.85 }}>
          Aperçu public — non enregistré tant que vous n’avez pas cliqué sur Enregistrer
        </p>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: "1px solid #fff",
            background: "transparent",
            color: "#fff",
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          Fermer
        </button>
      </div>

      <div style={{ padding: "48px 24px 80px", maxWidth: 1400, margin: "0 auto" }}>
        <h1
          className="typo-georgia"
          style={{
            fontSize: "clamp(2rem, 5vw, 4rem)",
            fontStyle: "italic",
            fontWeight: 400,
            margin: "0 0 40px",
            maxWidth: "40rem",
            lineHeight: 1.15,
          }}
        >
          {title || "Sans titre"}
        </h1>

        {textBlocks.map((block) =>
          block.content ? (
            <div
              key={block.id}
              style={{
                marginBottom: 32,
                maxWidth: "42rem",
                fontSize: "1.1rem",
                lineHeight: 1.6,
                fontWeight: 300,
              }}
              dangerouslySetInnerHTML={{ __html: block.content }}
            />
          ) : null,
        )}

        {useCanvas ? (
          <PlacementCanvas items={canvasItems} editable={false} minHeight={640} dark />
        ) : (
          <div style={{ display: "grid", gap: 32 }}>
            {imageBlocks.map((block) => (
              <figure key={block.id} style={{ margin: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.src} alt="" style={{ maxWidth: "100%", height: "auto", display: "block" }} />
                {block.caption ? (
                  <figcaption
                    className="typo-georgia"
                    style={{ marginTop: 8, opacity: 0.8, fontSize: 14 }}
                    dangerouslySetInnerHTML={{ __html: block.caption }}
                  />
                ) : null}
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
