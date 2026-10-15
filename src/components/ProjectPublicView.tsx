"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { PlacementCanvas, type CanvasItem } from "@/components/PlacementCanvas";
import type { CanvasPlacement, ProjectBlock, SiteSettings } from "@/lib/types";
import { defaultCanvasPlacement, projectUsesCanvas } from "@/lib/types";

export type PublicViewBlock =
  | {
      id?: string;
      type: "image";
      src: string;
      caption: string;
      canvas?: CanvasPlacement;
      width?: "full" | "half" | "third";
      align?: "left" | "center" | "right";
    }
  | {
      id?: string;
      type: "text";
      content: string;
      align?: "left" | "center" | "right";
    };

type BlockWidth = "full" | "large" | "medium" | "small" | "half" | "third";
type BlockAlign = "left" | "center" | "right";

const WIDTH_CLASSES: Record<BlockWidth, string> = {
  full: "md:col-span-12",
  large: "md:col-span-7",
  medium: "md:col-span-5",
  small: "md:col-span-4",
  half: "md:col-span-6",
  third: "md:col-span-4",
};

const START_CLASSES: Record<BlockAlign, string> = {
  left: "md:col-start-1",
  center: "md:col-start-4",
  right: "md:col-start-8",
};

function getBlockClassName(block: PublicViewBlock, index: number) {
  const width = (block.type === "image" && block.width ? block.width : "full") as BlockWidth;
  const align = (block.align || "center") as BlockAlign;
  const classes = [
    "project-block",
    "col-span-12",
    WIDTH_CLASSES[width],
    width !== "full" ? START_CLASSES[align] : "",
  ];
  if (index % 3 === 1) classes.push("md:mt-20");
  if (index % 3 === 2) classes.push("md:mt-36");
  return classes.filter(Boolean).join(" ");
}

type Props = {
  title: string;
  blocks: PublicViewBlock[];
  settings: SiteSettings;
  /** Embed header (for overlays / in-admin live editor). */
  previewChrome?: boolean;
  /** Drag/resize photos in place on the real layout. */
  editable?: boolean;
  onCanvasChange?: (id: string, placement: CanvasPlacement) => void;
};

/**
 * Same layout as the public project page: header, fixed title + texts, photos on canvas.
 * When editable, photos can be dragged/resized directly on that layout.
 */
export function ProjectPublicView({
  title,
  blocks,
  settings,
  previewChrome,
  editable = false,
  onCanvasChange,
}: Props) {
  const textBlocks = blocks.filter((b): b is Extract<PublicViewBlock, { type: "text" }> => b.type === "text");
  const imageBlocks = blocks.filter(
    (b): b is Extract<PublicViewBlock, { type: "image" }> => b.type === "image" && !!b.src,
  );

  const useCanvas =
    editable && imageBlocks.length > 0
      ? true
      : projectUsesCanvas({
          content: imageBlocks.map((b) => ({
            type: "image" as const,
            src: b.src,
            caption: b.caption,
            canvas: b.canvas,
          })) as ProjectBlock[],
        });

  const canvasItems: CanvasItem[] = imageBlocks.map((block, index) => ({
    id: block.id || `img-${index}`,
    src: block.src,
    label: editable ? `Photo ${index + 1}` : undefined,
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

        {useCanvas ? (
          <>
            {textBlocks.map((block, index) =>
              block.content ? (
                <div
                  key={block.id || `text-${index}`}
                  className="mb-10 max-w-3xl text-lg md:text-xl leading-relaxed font-light"
                  style={{
                    textAlign:
                      block.align === "center" ? "center" : block.align === "right" ? "right" : "left",
                    marginLeft: block.align === "center" ? "auto" : undefined,
                    marginRight:
                      block.align === "center" || block.align === "right" ? "auto" : undefined,
                  }}
                  dangerouslySetInnerHTML={{ __html: block.content }}
                />
              ) : null,
            )}
            <PlacementCanvas
              items={canvasItems}
              editable={editable}
              onChange={editable ? onCanvasChange : undefined}
              minHeight={720}
              dark
            />
            {!editable
              ? imageBlocks.map((block, index) =>
                  block.caption ? (
                    <div
                      key={`cap-${index}`}
                      className="caption-tight mt-6 text-sm md:text-base leading-relaxed typo-georgia opacity-80 max-w-2xl"
                      dangerouslySetInnerHTML={{ __html: block.caption }}
                    />
                  ) : null,
                )
              : null}
          </>
        ) : (
          <div className="grid grid-cols-12 gap-x-6 gap-y-24 md:gap-y-32 items-start">
            {blocks.map((block, index) => {
              if (block.type === "image") {
                if (!block.src) return null;
                return (
                  <figure key={block.id || index} className={getBlockClassName(block, index)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={block.src}
                      alt={title}
                      className="w-full h-auto block object-cover shadow-sm"
                    />
                    {block.caption ? (
                      <figcaption
                        className="caption-tight mt-3 text-sm md:text-base leading-relaxed typo-georgia opacity-80 max-w-2xl"
                        dangerouslySetInnerHTML={{ __html: block.caption }}
                      />
                    ) : null}
                  </figure>
                );
              }
              return (
                <div
                  key={block.id || index}
                  className={`${getBlockClassName(block, index)} text-lg md:text-xl leading-relaxed font-light`}
                  dangerouslySetInnerHTML={{ __html: block.content }}
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
