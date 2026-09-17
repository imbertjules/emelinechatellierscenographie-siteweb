import { SiteHeader } from "@/components/SiteHeader";
import { readSite } from "@/lib/store";
import type { HomeProjectAlign, HomeProjectWidth } from "@/lib/types";

export const dynamic = "force-dynamic";

const WIDTH_CLASSES: Record<HomeProjectWidth, string> = {
  small: "md:col-span-4",
  medium: "md:col-span-5",
  large: "md:col-span-7",
  full: "md:col-span-12",
};

const START_CLASSES: Record<HomeProjectAlign, string> = {
  left: "md:col-start-1",
  center: "md:col-start-4",
  right: "md:col-start-8",
};

const OFFSET_CLASSES = ["mt-0", "mt-16", "mt-8", "mt-24"];

export default async function HomePage() {
  const site = await readSite();
  const projects = site.projects
    .filter((project) => project.showOnHome && project.images[0])
    .sort((a, b) => a.order - b.order);

  return (
    <main>
      <SiteHeader settings={site.settings} current="home" />
      <section className="grid grid-cols-12 gap-y-28 gap-x-8 max-w-[1600px] mx-auto px-8 py-32">
        {projects.map((project, index) => {
          const widthClass = WIDTH_CLASSES[project.homeWidth ?? "medium"] || WIDTH_CLASSES.medium;
          const startClass = START_CLASSES[project.homeAlign ?? "center"] || START_CLASSES.center;
          const offsetClass = OFFSET_CLASSES[index % OFFSET_CLASSES.length] || "mt-0";

          return (
            <a
              key={project.id}
              href={`/projets/${project.slug}`}
              className={`col-span-12 flex flex-col ${widthClass} ${startClass} ${offsetClass} mb-10`}
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
