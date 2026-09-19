import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { readSite } from "@/lib/store";
import type { ProjectBlock } from "@/lib/types";

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
      type: "image",
      src: img.src,
      caption: img.caption,
      width: index === 0 ? "full" : index % 2 === 0 ? "half" : "third",
      align: index % 2 === 0 ? "left" : "right",
    }));

  return (
    <main className="bg-black text-white min-h-screen relative">
      <SiteHeader settings={site.settings} />

      <div className="pt-32 pb-40 px-6 md:px-[var(--header-inset)]">
        <div className="mb-24 mt-10">
          <h1 className="text-4xl md:text-7xl leading-tight max-w-4xl typo-georgia italic">
            {project.title}
          </h1>
        </div>

        <div className="grid grid-cols-12 gap-x-6 gap-y-24 md:gap-y-32 items-start">
          {blocks.map((block, index) => {
            if (block.type === "image") {
              return (
                <figure key={index} className={getBlockClassName(block, index)}>
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
                    className={`${getBlockClassName(
                        block,
                        index,
                    )} text-lg md:text-xl leading-relaxed font-light`}
                    dangerouslySetInnerHTML={{ __html: block.content }}
                />
            );
          })}
        </div>
      </div>
    </main>
  );
}