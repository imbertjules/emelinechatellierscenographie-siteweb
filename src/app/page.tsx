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
      <section className="homeprojects">
        {projects.map((project) => (
          <a
            key={project.id}
            href={`/projets/${project.slug}`}
            className={`${project.homeLayout} homeimage-container`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={project.images[0].src} alt={project.title} />
            {project.images[0].caption ? (
              <div
                className="home-caption"
                dangerouslySetInnerHTML={{ __html: project.images[0].caption }}
              />
            ) : null}
          </a>
        ))}
      </section>
    </main>
  );
}
