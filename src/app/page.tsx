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
      {/* Full-bleed board: x=0/100-w = page edges; y=0 = flush under the fixed nav. */}
      <section className="home-canvas-section w-full pb-28 md:pb-32">
        {items.length > 0 ? (
          <PlacementCanvas
            items={items}
            editable={false}
            minHeight={900}
            dark
            captionClassName="home-caption"
          />
        ) : null}
      </section>
    </main>
  );
}
