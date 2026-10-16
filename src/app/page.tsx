import { SiteHeader } from "@/components/SiteHeader";
import { HomeInfiniteCanvas } from "@/components/HomeInfiniteCanvas";
import type { CanvasItem } from "@/components/PlacementCanvas";
import { readSite } from "@/lib/store";
import { getHomeImage } from "@/lib/types";
import { legacyHomePlacements, resolveHomePlacement } from "@/lib/legacy-placement";

export const dynamic = "force-dynamic";

/**
 * Homepage always uses the freeform canvas, looped for infinite scroll.
 * Missing / auto homeCanvas → approximate production grid via homeWidth/homeAlign
 * at render time (no DB write). See legacy-placement.ts.
 * Admin live edit stays on a single non-looping PlacementCanvas.
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
      {/* Full-bleed board; no bottom pad so loop strips tile without a dead end. */}
      <section className="home-canvas-section w-full">
        {items.length > 0 ? (
          <HomeInfiniteCanvas items={items} captionClassName="home-caption" minHeight={900} />
        ) : null}
      </section>
    </main>
  );
}
