import type { MetadataRoute } from "next";
import { readSite } from "@/lib/store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = await readSite();
  const baseUrl = "https://emelinechatellierscenographie.fr";
  const routes = ["", "/a-propos"];
  const projectRoutes = site.projects.map((project) => `/projets/${project.slug}`);

  return [...routes, ...projectRoutes].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
  }));
}
