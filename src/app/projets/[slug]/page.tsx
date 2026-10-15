import { notFound } from "next/navigation";
import { ProjectPublicView, type PublicViewBlock } from "@/components/ProjectPublicView";
import { defaultCanvasPlacement } from "@/lib/types";
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

  // Always canvas: migrate legacy images[] / missing canvas to default placements.
  let imageIndex = 0;
  const fromContent: PublicViewBlock[] =
    project.content?.map((block) => {
      if (block.type === "image") {
        const placement = block.canvas || defaultCanvasPlacement(imageIndex);
        imageIndex += 1;
        return {
          id: `img-${imageIndex - 1}`,
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
    }) || [];

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
