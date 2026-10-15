"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { PlacementCanvas, type CanvasItem } from "@/components/PlacementCanvas";
import type { CanvasPlacement, SiteSettings } from "@/lib/types";
import { defaultCanvasPlacement } from "@/lib/types";

export type PublicViewBlock =
  | {
      id?: string;
      type: "image";
      src: string;
      caption: string;
      canvas?: CanvasPlacement;
    }
  | {
      id?: string;
      type: "text";
      content: string;
      align?: "left" | "center" | "right";
    };

type Props = {
  title: string;
  blocks: PublicViewBlock[];
  settings: SiteSettings;
  /** Embed header (live admin editor / in-flow chrome). */
  previewChrome?: boolean;
  /** Drag/resize photos in place on the real layout. */
  editable?: boolean;
  onCanvasChange?: (id: string, placement: CanvasPlacement) => void;
};

/**
 * Same layout as the public project page: header, fixed title + texts, photos on canvas.
 * Canvas is always used — missing placements get defaults. Captions sit under each photo.
 */
export function ProjectPublicView({
  title,
  blocks,
  settings,
  previewChrome,
  editable = false,
  onCanvasChange,
}: Props) {
  const textBlocks = blocks.filter(
    (b): b is Extract<PublicViewBlock, { type: "text" }> =>
      b.type === "text" &&
      !!b.content &&
      b.content
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .trim().length > 0,
  );
  const imageBlocks = blocks.filter(
    (b): b is Extract<PublicViewBlock, { type: "image" }> => b.type === "image" && !!b.src,
  );

  const canvasItems: CanvasItem[] = imageBlocks.map((block, index) => ({
    id: block.id || `img-${index}`,
    src: block.src,
    label: editable ? `Photo ${index + 1}` : undefined,
    caption: block.caption,
    placement: block.canvas || defaultCanvasPlacement(index),
  }));

  return (
    <main
      className="bg-black text-white min-h-screen relative"
      style={editable ? { outline: "1px solid #333" } : undefined}
    >
      <SiteHeader settings={settings} embedded={!!previewChrome || editable} />

      <div className="pt-32 pb-40 px-6 md:px-[var(--header-inset)]">
        <div className="mb-16 mt-10">
          <h1 className="text-4xl md:text-7xl leading-tight max-w-4xl typo-georgia italic">
            {title || "Sans titre"}
          </h1>
        </div>

        {textBlocks.map((block, index) => (
          <div
            key={block.id || `text-${index}`}
            className="project-body-text mb-10 max-w-3xl text-lg md:text-xl leading-relaxed typo-georgia"
            style={{
              textAlign:
                block.align === "center" ? "center" : block.align === "right" ? "right" : "left",
              marginLeft: block.align === "center" ? "auto" : undefined,
              marginRight:
                block.align === "center" || block.align === "right" ? "auto" : undefined,
            }}
            dangerouslySetInnerHTML={{ __html: block.content }}
          />
        ))}

        {imageBlocks.length > 0 ? (
          <PlacementCanvas
            items={canvasItems}
            editable={editable}
            onChange={editable ? onCanvasChange : undefined}
            minHeight={720}
            dark
          />
        ) : null}
      </div>
    </main>
  );
}
