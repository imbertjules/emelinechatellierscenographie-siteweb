export const HOME_LAYOUTS = [
  "smallleft",
  "mediumright",
  "largeleft",
  "smallright",
  "mediumleft",
  "largeright",
  "mediumcenter",
  "smallcenter",
] as const;

export type HomeLayout = (typeof HOME_LAYOUTS)[number];

export type ProjectImage = {
  src: string;
  caption: string;
};

export type Project = {
  id: string;
  slug: string;
  title: string;
  showOnHome: boolean;
  homeLayout: HomeLayout;
  order: number;
  images: ProjectImage[];
};

export type SiteSettings = {
  name: string;
  tagline: string;
  email: string;
};

export type SiteData = {
  settings: SiteSettings;
  aboutHtml: string;
  projects: Project[];
};
