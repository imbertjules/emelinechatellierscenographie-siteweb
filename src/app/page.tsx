import { SiteHeader } from "@/components/SiteHeader";
import { readSite } from "@/lib/store";
import type { HomeProjectAlign, HomeProjectWidth, HomeLayout } from "@/lib/types";

export const dynamic = "force-dynamic";

const HOME_LAYOUT_CLASSES: Record<HomeLayout, string> = {
  smallleft: "col-span-4 col-start-1 mt-0",
  mediumright: "col-span-5 col-start-8 mt-20",
  largeleft: "col-span-7 col-start-1 mt-0",
  smallright: "col-span-4 col-start-9 mt-12",
  mediumleft: "col-span-5 col-start-1 mt-24",
  largeright: "col-span-7 col-start-6 mt-12",
  mediumcenter: "col-span-5 col-start-4 mt-8",
  smallcenter: "col-span-4 col-start-5 mt-20",
};

const WIDTH_CLASSES: Record<HomeProjectWidth, string> = {
  small: "w-full md:w-[32%]",
  medium: "w-full md:w-[48%]",
  large: "w-full md:w-[64%]",
  full: "w-full",
};

const ALIGN_CLASSES: Record<HomeProjectAlign, string> = {
  left: "md:justify-self-start",
  center: "md:justify-self-center",
  right: "md:justify-self-end",
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
          const gridClasses = HOME_LAYOUT_CLASSES[project.homeLayout ?? "mediumcenter"] || HOME_LAYOUT_CLASSES.mediumcenter;
          const widthClass = WIDTH_CLASSES[project.homeWidth ?? "medium"] || WIDTH_CLASSES.medium;
          const alignClass = ALIGN_CLASSES[project.homeAlign ?? "center"] || ALIGN_CLASSES.center;

          return (
            <a
              key={project.id}
              href={`/projets/${project.slug}`}
              className={`flex flex-col ${gridClasses} ${widthClass} ${alignClass} mb-10`}
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
