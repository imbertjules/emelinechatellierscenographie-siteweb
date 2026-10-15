import { notFound } from "next/navigation";
import { ProjectPublicView, type PublicViewBlock } from "@/components/ProjectPublicView";
import { defaultCanvasPlacement } from "@/lib/types";
import { legacyProjectImagePlacements, resolveImagePlacement } from "@/lib/legacy-placement";
import { readSite } from "@/lib/store";

export const dynamic = "force-dynamic";

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

  // Canvas at render: stored canvas ?? legacy width/align approx ?? default.
  // No DB write — shared Supabase JSON stays untouched until an admin save.
  const sourceBlocks =
    project.content ||
    project.images.map((img, index) => ({
      type: "image" as const,
      src: img.src,
      caption: img.caption,
      width: (index === 0 ? "full" : index % 2 === 0 ? "half" : "third") as
        | "full"
        | "half"
        | "third",
      align: (index % 2 === 0 ? "left" : "right") as "left" | "right",
    }));

  const legacyPack = legacyProjectImagePlacements(sourceBlocks);

  let imageIndex = 0;
  const fromContent: PublicViewBlock[] = sourceBlocks.map((block) => {
    if (block.type === "image") {
      const placement = resolveImagePlacement(block, imageIndex, legacyPack);
      const id = `img-${imageIndex}`;
      imageIndex += 1;
      return {
        id,
        type: "image" as const,
        src: block.src,
        caption: block.caption,
        canvas: placement,
      };
    }
    return {
      id: `text-${imageIndex}`,
      type: "text" as const,
      content: block.content,
      align: block.align,
    };
  });

  const blocks: PublicViewBlock[] =
    fromContent.length > 0
      ? fromContent
      : project.images.map((img, index) => ({
          id: `legacy-${index}`,
          type: "image" as const,
          src: img.src,
          caption: img.caption,
          canvas: defaultCanvasPlacement(index),
        }));

  return <ProjectPublicView title={project.title} blocks={blocks} settings={site.settings} />;
}
