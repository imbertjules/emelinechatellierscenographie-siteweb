import { notFound } from "next/navigation";
import { ProjectPublicView, type PublicViewBlock } from "@/components/ProjectPublicView";
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

  const blocks: PublicViewBlock[] =
    project.content?.map((block, index) =>
      block.type === "image"
        ? {
            id: `img-${index}`,
            type: "image" as const,
            src: block.src,
            caption: block.caption,
            canvas: block.canvas,
            width: block.width,
            align: block.align,
          }
        : {
            id: `text-${index}`,
            type: "text" as const,
            content: block.content,
            align: block.align,
          },
    ) ||
    project.images.map((img, index) => ({
      id: `legacy-${index}`,
      type: "image" as const,
      src: img.src,
      caption: img.caption,
      width: index === 0 ? ("full" as const) : index % 2 === 0 ? ("half" as const) : ("third" as const),
      align: index % 2 === 0 ? ("left" as const) : ("right" as const),
    }));

  return <ProjectPublicView title={project.title} blocks={blocks} settings={site.settings} />;
}
