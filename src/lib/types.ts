export type ProjectImage = {
  src: string;
  caption: string;
};

/**
 * Freeform placement.
 * - x, w: percent of canvas width (0–100)
 * - y: percent of canvas **width** (not height), so the page can grow downward without clamping
 */
export type CanvasPlacement = {
  x: number;
  y: number;
  w: number;
};

export type ProjectBlock =
  | {
      type: "image";
      src: string;
      caption: string;
      /** @deprecated Prefer canvas placement; kept for older projects. */
      width?: "full" | "half" | "third";
      /** @deprecated Prefer canvas placement; kept for older projects. */
      align?: "left" | "center" | "right";
      /** Freeform position on the project page canvas. */
      canvas?: CanvasPlacement;
      /** Marks this photo as the homepage thumbnail. */
      isHomePhoto?: boolean;
    }
  | { type: "text"; content: string; align: "left" | "center" | "right" };

export type HomeProjectWidth = "small" | "medium" | "large" | "full";
export type HomeProjectAlign = "left" | "center" | "right";

export type Project = {
  id: string;
  slug: string;
  title: string;
  showOnHome: boolean;
  homeLayout?: string;
  /** @deprecated Prefer homeCanvas; kept for older projects. */
  homeWidth?: HomeProjectWidth;
  /** @deprecated Prefer homeCanvas; kept for older projects. */
  homeAlign?: HomeProjectAlign;
  /** Freeform placement of this project's home photo on the shared homepage canvas. */
  homeCanvas?: CanvasPlacement;
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

export function defaultCanvasPlacement(index = 0): CanvasPlacement {
  const col = index % 3;
  const row = Math.floor(index / 3);
  return {
    x: 8 + col * 30,
    y: 8 + row * 36,
    w: 28,
  };
}

export function clampPlacement(p: CanvasPlacement): CanvasPlacement {
  const w = Math.min(90, Math.max(8, p.w));
  const x = Math.min(100 - w, Math.max(0, p.x));
  // y is width-relative; allow large values so the canvas can elongate
  const y = Math.max(0, Math.min(2000, p.y));
  return { x, y, w };
}

/** Rough bottom edge of a placement, in px, for a given board width. */
export function estimatePlacementBottom(p: CanvasPlacement, boardWidth: number, aspect = 0.7): number {
  const top = (p.y / 100) * boardWidth;
  const imgH = (p.w / 100) * boardWidth * aspect;
  return top + imgH;
}

export function getHomeImage(project: Project): ProjectImage | undefined {
  const blocks = project.content?.filter(
    (b): b is Extract<ProjectBlock, { type: "image" }> => b.type === "image" && !!b.src,
  );
  const featured = blocks?.find((b) => b.isHomePhoto);
  if (featured) return { src: featured.src, caption: featured.caption };
  if (blocks?.[0]) return { src: blocks[0].src, caption: blocks[0].caption };
  return project.images.find((image) => image.src);
}

export function projectUsesCanvas(project: { content?: ProjectBlock[] }): boolean {
  return (project.content || []).some(
    (b) => b.type === "image" && b.src && b.canvas && typeof b.canvas.x === "number",
  );
}

export function homeUsesCanvas(projects: Project[]): boolean {
  return projects.some((p) => p.homeCanvas && typeof p.homeCanvas.x === "number");
}
