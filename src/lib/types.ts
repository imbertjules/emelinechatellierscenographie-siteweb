export type ProjectImage = {
  src: string;
  caption: string;
};

export type ProjectBlock =
  | { type: 'image'; src: string; caption: string; width: 'full' | 'half' | 'third'; align: 'left' | 'center' | 'right' }
  | { type: 'text'; content: string; align: 'left' | 'center' | 'right' }
  | { type: 'info'; items: { label: string; value: string }[] };

export type HomeProjectWidth = "small" | "medium" | "large" | "full";
export type HomeProjectAlign = "left" | "center" | "right";

export type Project = {
  id: string;
  slug: string;
  title: string;
  showOnHome: boolean;
  homeLayout?: string;
  homeWidth?: HomeProjectWidth;
  homeAlign?: HomeProjectAlign;
  order: number;
  images: ProjectImage[];
  content?: ProjectBlock[];
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
