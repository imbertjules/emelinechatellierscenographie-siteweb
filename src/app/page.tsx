import { SiteHeader } from "@/components/SiteHeader";
import { readSite } from "@/lib/store";
import type { HomeProjectAlign, HomeProjectWidth } from "@/lib/types";

export const dynamic = "force-dynamic";

const WIDTH_CLASSES: Record<HomeProjectWidth, string> = {
  small: "w-full md:max-w-[32%]",
  medium: "w-full md:max-w-[48%]",
  large: "w-full md:max-w-[64%]",
  full: "w-full",
};

const ALIGN_CLASSES: Record<HomeProjectAlign, string> = {
  left: "md:ml-0 md:mr-auto",
  center: "mx-auto",
  right: "md:ml-auto md:mr-0",
};

export default async function HomePage() {
  const site = await readSite();
  const projects = site.projects
    .filter((project) => project.showOnHome && project.images[0])
    .sort((a, b) => a.order - b.order);

  return (
    <main>
      <SiteHeader settings={site.settings} current="home" />
      <section className="grid grid-cols-12 gap-y-28 gap-x-8 max-w-[1600px] mx-auto px-8 py-32">
        {projects.map((project) => {
          const widthClass = WIDTH_CLASSES[project.homeWidth ?? "medium"] || WIDTH_CLASSES.medium;
          const alignClass = ALIGN_CLASSES[project.homeAlign ?? "center"] || ALIGN_CLASSES.center;

          return (
            <a
              key={project.id}
              href={`/projets/${project.slug}`}
              className={`col-span-12 flex flex-col ${widthClass} ${alignClass} mb-10`}
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
