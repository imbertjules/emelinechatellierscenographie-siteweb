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
      <div className="grid grid-cols-12 gap-y-32 gap-x-8 max-w-[1600px] mx-auto px-8 py-20">
        {project.images.map((image, index) => {
          const pattern = index % 4;
          const layoutClasses =
            pattern === 0 ? "col-span-7 col-start-1" :
            pattern === 1 ? "col-span-6 col-start-7" :
            pattern === 2 ? "col-span-4 col-start-4" :
            "col-span-8 col-start-3";

          return (
            <figure key={image.src} className={`flex flex-col ${layoutClasses}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image.src}
                alt={project.title}
                className="w-full h-auto block object-cover"
              />
              {image.caption ? (
                <figcaption
                  className="block font-serif font-bold text-[16px] leading-tight mt-5 max-w-xl text-white"
                  dangerouslySetInnerHTML={{ __html: image.caption }}
                />
              ) : null}
            </figure>
          );
        })}
      </div>
    </main>
  );
}
