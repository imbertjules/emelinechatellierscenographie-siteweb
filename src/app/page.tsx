import { SiteHeader } from "@/components/SiteHeader";
import { PlacementCanvas, type CanvasItem } from "@/components/PlacementCanvas";
import { readSite } from "@/lib/store";
import { getHomeImage } from "@/lib/types";
import { legacyHomePlacements, resolveHomePlacement } from "@/lib/legacy-placement";

export const dynamic = "force-dynamic";

/**
 * Homepage always uses the freeform canvas.
 * Missing / auto homeCanvas → approximate production grid via homeWidth/homeAlign
 * at render time (no DB write). See legacy-placement.ts.
 */
export default async function HomePage() {
  const site = await readSite();
  const projects = site.projects
    .filter((project) => project.showOnHome && getHomeImage(project)?.src)
    .sort((a, b) => a.order - b.order);

  const legacyPack = legacyHomePlacements(projects);

  const items: CanvasItem[] = projects.map((project, index) => {
    const image = getHomeImage(project)!;
    return {
      id: project.id,
      src: image.src,
      caption: image.caption,
      placement: resolveHomePlacement(project, index, legacyPack),
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
