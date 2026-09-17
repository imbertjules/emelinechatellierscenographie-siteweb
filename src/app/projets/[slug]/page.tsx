import { notFound } from "next/navigation";
import Link from "next/link";
import { readSite } from "@/lib/store";

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
  if (!project) notFound();

  return (
    <main className="bg-white text-black min-h-screen relative">
      <header className="fixed top-0 left-0 w-full z-50 px-6 py-4 flex justify-between items-center pointer-events-none">
        <div className="pointer-events-auto">
          <Link href="/" className="text-lg font-bold tracking-tighter">
            {site.settings.name}
          </Link>
        </div>
        <div className="pointer-events-auto">
          <Link
            href="/"
            className="w-6 h-6 flex items-center justify-center hover:opacity-50 transition-opacity"
            aria-label="Retour"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto pt-24 pb-32 px-6">
        <div className="mb-20 mt-10">
          <h1 className="text-4xl md:text-6xl font-serif italic leading-tight max-w-4xl">
            {project.title}
          </h1>
        </div>

        <div className="space-y-32">
          {project.images.map((image, index) => {
            const isFull = index === 0 || index % 3 === 0;
            return (
              <div key={image.src} className={`flex flex-col ${isFull ? 'w-full' : 'w-3/4 md:w-1/2'} ${index % 2 === 1 ? 'ml-auto' : 'mr-auto'}`}>
                <img
                  src={image.src}
                  alt={project.title}
                  className="w-full h-auto block object-cover shadow-sm"
                />
                {image.caption ? (
                  <div
                    className="mt-6 text-sm md:text-base leading-relaxed font-light opacity-80 max-w-2xl"
                    dangerouslySetInnerHTML={{ __html: image.caption }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
