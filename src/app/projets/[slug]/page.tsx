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
          <h1 className="text-4xl md:text-7xl font-serif italic leading-tight max-w-4xl">
            {project.title}
          </h1>
        </div>

        <div className="space-y-32">
          {blocks.map((block, index) => {
            if (block.type === 'image') {
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

              return (
                <div key={index} className={`flex flex-col ${widthClass} ${alignClass}`}>
                  <img
                    src={block.src}
                    alt={project.title}
                    className="w-full h-auto block object-cover shadow-sm"
                  />
                  {block.caption && (
                    <div
                      className="mt-6 text-sm md:text-base leading-relaxed font-light opacity-80 max-w-2xl"
                      dangerouslySetInnerHTML={{ __html: block.caption }}
                    />
                  )}
                </div>
              );
            }

            if (block.type === 'text') {
              const alignClass = {
                left: 'text-left',
                center: 'text-center',
                right: 'text-right'
              }[block.align];

              return (
                <div key={index} className={`text-lg md:text-xl leading-relaxed font-light ${alignClass}`}>
                  <div dangerouslySetInnerHTML={{ __html: block.content }} />
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </main>
  );
}
