import { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { readSite } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "À propos",
};

export default async function AboutPage() {
  const site = await readSite();

  return (
    <main className="about-page">
      <SiteHeader settings={site.settings} current="about" />
      <article
        className="about-text"
        dangerouslySetInnerHTML={{ __html: site.aboutHtml }}
      />
    </main>
  );
}
