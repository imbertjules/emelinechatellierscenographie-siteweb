import { SiteHeader } from "@/components/SiteHeader";
import { readSite } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const site = await readSite();
  const projects = site.projects
    .filter((project) => project.showOnHome && project.images[0])
    .sort((a, b) => a.order - b.order);

  return (
    <main>
      <SiteHeader settings={site.settings} current="home" />
      <section className="grid grid-cols-12 gap-y-32 gap-x-8 max-w-[1600px] mx-auto px-8 py-32">
        {projects.map((project, index) => {
          const pattern = index % 4;
          const layoutClasses =
            pattern === 0 ? "col-span-6 col-start-1 mt-0" :
            pattern === 1 ? "col-span-6 col-start-7 mt-24" :
            pattern === 2 ? "col-span-5 col-start-4 mt-12" :
            "col-span-7 col-start-3 mt-40";

          return (
            <a
              key={project.id}
              href={`/projets/${project.slug}`}
              className={`flex flex-col ${layoutClasses} mb-10`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.images[0].src}
                alt={project.title}
                className="w-full h-auto block object-cover shadow-lg"
              />
              {project.images[0].caption ? (
                <div
                  className="block font-serif font-bold text-[16px] leading-tight mt-6 max-w-md text-white opacity-90"
                  dangerouslySetInnerHTML={{ __html: project.images[0].caption }}
                />
              ) : null}
            </a>
          );
        })}
      </section>
    </main>
  );
}
