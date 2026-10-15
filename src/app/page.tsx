import { SiteHeader } from "@/components/SiteHeader";
import { PlacementCanvas, type CanvasItem } from "@/components/PlacementCanvas";
import { readSite } from "@/lib/store";
import { defaultCanvasPlacement, getHomeImage } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Homepage always uses the freeform canvas.
 * Missing homeCanvas values get a default placement (no grid fallback).
 */
export default async function HomePage() {
  const site = await readSite();
  const projects = site.projects
    .filter((project) => project.showOnHome && getHomeImage(project)?.src)
    .sort((a, b) => a.order - b.order);

  const items: CanvasItem[] = projects.map((project, index) => {
    const image = getHomeImage(project)!;
    return {
      id: project.id,
      src: image.src,
      caption: image.caption,
      placement: project.homeCanvas || defaultCanvasPlacement(index),
      href: `/projets/${project.slug}`,
    };
  });

  return (
    <main>
      <SiteHeader settings={site.settings} current="home" />
      <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-28 md:py-32">
        {items.length > 0 ? (
          <PlacementCanvas items={items} editable={false} minHeight={900} dark />
        ) : null}
      </section>
    </main>
  );
}
