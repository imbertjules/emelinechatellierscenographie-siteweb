import { notFound } from "next/navigation";
import { readSite } from "@/lib/store";
import { ProjectBlock } from "@/lib/types";
import {SiteHeader} from "@/components/SiteHeader";

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

  if (!project) {
    notFound();
    return null;
  }

  // Fallback: if no content blocks defined, convert images to blocks
  const blocks: ProjectBlock[] = project.content || project.images.map((img, i) => ({
    type: 'image',
    src: img.src,
    caption: img.caption,
    width: i === 0 ? 'full' : (i % 2 === 0 ? 'half' : 'third'),
    align: i % 2 === 0 ? 'center' : (i % 3 === 0 ? 'left' : 'right'),
  }));

  return (
    <main className="bg-black text-white min-h-screen relative">
      <SiteHeader settings={site.settings} />
      <div className="max-w-5xl mx-auto pt-32 pb-40 px-6">
        <div className="mb-24 mt-10">
        <h1 className="text-4xl md:text-7xl font-georgia italic leading-tight max-w-4xl">
            {project.title}
          </h1>
        </div>

        <div className="space-y-32">
          {(() => {
            const nodes = [] as React.ReactNode[];
            const offsets = [0, 64, 32, 96];
            // base offset per project derived from slug to vary spacing
            const slugHash = project.slug.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
            const base = slugHash % offsets.length;
            for (let i = 0; i < blocks.length; i += 1) {
              const block = blocks[i];

              // If an image block is followed by a text block and the image is half-width,
              // render them side-by-side on md+ screens.
              if (block.type === 'image') {
                const next = blocks[i + 1];
                const isPair = next !== undefined && next.type === 'text' && block.width === 'half';

                if (isPair) {
                  // next is narrowed to text block by the check above
                  const mt = offsets[(base + i) % offsets.length];
                  nodes.push(
                    <div key={`pair-${i}`} className="flex flex-col md:flex-row md:items-start gap-6" style={{ marginTop: mt }}>
                      <div className="w-full md:w-1/2">
                        <img src={block.src} alt={project.title} className="w-full h-auto block object-cover shadow-sm" />
                        {block.caption && (
                          <div className="caption-tight text-sm md:text-base leading-relaxed font-georgia opacity-80 max-w-2xl" dangerouslySetInnerHTML={{ __html: block.caption }} />
                        )}
                      </div>
                      <div className="w-full md:w-1/2 text-lg md:text-xl leading-relaxed font-light">
                        <div dangerouslySetInnerHTML={{ __html: next.content }} />
                      </div>
                    </div>
                  );
                  i += 1; // skip the next block because we've rendered the pair
                  continue;
                }
                const widthClass = {
                  full: 'w-full',
                  half: 'w-full md:w-1/2',
                  third: 'w-full md:w-1/3'
                }[block.width];

                const alignClass = {
                  left: 'mr-auto',
                  center: 'mx-auto',
                  right: 'ml-auto'
                }[block.align];

                const mt = offsets[(base + i) % offsets.length];

                nodes.push(
                  <div key={i} className={`flex flex-col ${widthClass} ${alignClass}`} style={{ marginTop: mt }}>
                    <img src={block.src} alt={project.title} className="w-full h-auto block object-cover shadow-sm" />
                    {block.caption && (
                      <div className="caption-tight text-sm md:text-base leading-relaxed font-georgia opacity-80 max-w-2xl" dangerouslySetInnerHTML={{ __html: block.caption }} />
                    )}
                  </div>
                );
                continue;
              }

              if (block.type === 'text') {
                nodes.push(
                  <div key={i} className={`text-lg md:text-xl leading-relaxed font-light`}>
                    <div dangerouslySetInnerHTML={{ __html: block.content }} />
                  </div>
                );
                continue;
              }
            }
            return nodes;
          })()}
        </div>
      </div>
    </main>
  );
}
