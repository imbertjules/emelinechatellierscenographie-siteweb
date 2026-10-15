import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { PlacementCanvas, type CanvasItem } from "@/components/PlacementCanvas";
import { readSite } from "@/lib/store";
import {
  defaultCanvasPlacement,
  projectUsesCanvas,
  type ProjectBlock,
} from "@/lib/types";

export const dynamic = "force-dynamic";

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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await readSite();
  const project = site.projects.find((item) => item.slug === slug);

  return { title: project?.title ?? "Projet" };
}

function getBlockWidth(block: ProjectBlock): BlockWidth {
  if ("width" in block && block.width) {
    return block.width as BlockWidth;
  }

  return "full";
}

function getBlockAlign(block: ProjectBlock): BlockAlign {
  if ("align" in block && block.align) {
    return block.align as BlockAlign;
  }

  return "center";
}

function getBlockClassName(block: ProjectBlock, index: number) {
  const width = getBlockWidth(block);
  const align = getBlockAlign(block);

  const classes = [
    "project-block",
    "col-span-12",
    WIDTH_CLASSES[width],
    width !== "full" ? START_CLASSES[align] : "",
  ];

  if (index % 3 === 1) {
    classes.push("md:mt-20");
  }

  if (index % 3 === 2) {
    classes.push("md:mt-36");
  }

  return classes.filter(Boolean).join(" ");
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const site = await readSite();
  const project = site.projects.find((item) => item.slug === slug);

  if (!project) {
    notFound();
  }

  const blocks: ProjectBlock[] =
    project.content ||
    project.images.map((img, index) => ({
      type: "image" as const,
      src: img.src,
      caption: img.caption,
      width: index === 0 ? ("full" as const) : index % 2 === 0 ? ("half" as const) : ("third" as const),
      align: index % 2 === 0 ? ("left" as const) : ("right" as const),
    }));

  const textBlocks = blocks.filter((b): b is Extract<ProjectBlock, { type: "text" }> => b.type === "text");
  const imageBlocks = blocks.filter(
    (b): b is Extract<ProjectBlock, { type: "image" }> => b.type === "image" && !!b.src,
  );
  const useCanvas = projectUsesCanvas(project);

  const canvasItems: CanvasItem[] = imageBlocks.map((block, index) => ({
    id: `img-${index}`,
    src: block.src,
    placement: block.canvas || defaultCanvasPlacement(index),
  }));

  return (
    <main className="bg-black text-white min-h-screen relative">
      <SiteHeader settings={site.settings} />

      <div className="pt-32 pb-40 px-6 md:px-[var(--header-inset)]">
        <div className="mb-16 mt-10">
          <h1 className="text-4xl md:text-7xl leading-tight max-w-4xl typo-georgia italic">
            {project.title}
          </h1>
        </div>

        {useCanvas ? (
          <>
            {textBlocks.map((block, index) => (
              <div
                key={`text-${index}`}
                className="mb-10 max-w-3xl text-lg md:text-xl leading-relaxed font-light"
                style={{
                  textAlign: block.align === "center" ? "center" : block.align === "right" ? "right" : "left",
                  marginLeft: block.align === "center" ? "auto" : undefined,
                  marginRight: block.align === "center" || block.align === "right" ? "auto" : undefined,
                }}
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            ))}
            <PlacementCanvas items={canvasItems} editable={false} minHeight={720} dark />
            {imageBlocks.map((block, index) =>
              block.caption ? (
                <div
                  key={`cap-${index}`}
                  className="caption-tight mt-6 text-sm md:text-base leading-relaxed typo-georgia opacity-80 max-w-2xl"
                  dangerouslySetInnerHTML={{ __html: block.caption }}
                />
              ) : null,
            )}
          </>
        ) : (
          <div className="grid grid-cols-12 gap-x-6 gap-y-24 md:gap-y-32 items-start">
            {blocks.map((block, index) => {
              if (block.type === "image") {
                if (!block.src) return null;
                return (
                  <figure key={index} className={getBlockClassName(block, index)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={block.src}
                      alt={project.title}
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
                  key={index}
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
