import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { readSite } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
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
  if (!project) notFound();

  return (
    <main className="project-page">
      <SiteHeader settings={site.settings} />
      <div className="project-gallery">
        {project.images.map((image) => (
          <figure key={image.src} className="project-figure">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.src} alt={project.title} />
            {image.caption ? (
              <figcaption
                className="project-caption"
                dangerouslySetInnerHTML={{ __html: image.caption }}
              />
            ) : null}
          </figure>
        ))}
      </div>
    </main>
  );
}
