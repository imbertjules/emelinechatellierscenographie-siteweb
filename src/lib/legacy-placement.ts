import type {
  CanvasPlacement,
  HomeProjectAlign,
  HomeProjectWidth,
  Project,
  ProjectBlock,
} from "@/lib/types";
import { clampPlacement, defaultCanvasPlacement } from "@/lib/types";

/**
 * Public render prefers approximating the production CSS grid from legacy
 * width/align (and homeWidth/homeAlign) at read time — no DB write.
 *
 * Stored `canvas` / `homeCanvas` still win when present AND this flag is false,
 * or when legacy fields are absent. While true, home ignores auto-written
 * homeCanvas so the preview matches production; project images use canvas only
 * if already saved, else legacy conversion.
 */
/**
 * After manual canvas placements were saved to Supabase, prefer stored
 * homeCanvas / canvas. Set true only to fall back to legacy grid approx.
 */
export const PUBLIC_PREFER_LEGACY_GRID_APPROX = false;

/** 12-col grid math (matches Tailwind grid-cols-12 + gap-x-8 on ~1376px content). */
const COLS = 12;
const GAP_X_RATIO = 32 / 1376;

function trackFraction() {
  return (1 - (COLS - 1) * GAP_X_RATIO) / COLS;
}

function colStartToX(start1Based: number): number {
  const start0 = Math.max(0, start1Based - 1);
  const track = trackFraction();
  return (start0 * track + start0 * GAP_X_RATIO) * 100;
}

function spanToW(span: number): number {
  const track = trackFraction();
  const s = Math.min(COLS, Math.max(1, span));
  return (s * track + Math.max(0, s - 1) * GAP_X_RATIO) * 100;
}

const HOME_WIDTH_SPAN: Record<HomeProjectWidth, number> = {
  small: 4,
  medium: 5,
  large: 7,
  full: 12,
};

const HOME_ALIGN_START: Record<HomeProjectAlign, number> = {
  left: 1,
  center: 4,
  right: 8,
};

const HOME_MT_PX = [0, 64, 32, 96]; // mt-0, mt-16, mt-8, mt-24
const HOME_GAP_Y = 112; // gap-y-28
const HOME_MB = 40; // mb-10
const HOME_CAPTION = 52;
/** Typical home vignette height / width (many portraits on prod). */
const HOME_ASPECT = 1.42;

type BlockWidth = "full" | "large" | "medium" | "small" | "half" | "third";
type BlockAlign = "left" | "center" | "right";

const BLOCK_WIDTH_SPAN: Record<BlockWidth, number> = {
  full: 12,
  large: 7,
  medium: 5,
  small: 4,
  half: 6,
  third: 4,
};

const BLOCK_ALIGN_START: Record<BlockAlign, number> = {
  left: 1,
  center: 4,
  right: 8,
};

const PROJECT_GAP_Y = 128; // md:gap-y-32
const PROJECT_CAPTION = 56;
const PROJECT_ASPECT = 1.35;

function projectMtPx(blockIndex: number): number {
  if (blockIndex % 3 === 1) return 80; // md:mt-20
  if (blockIndex % 3 === 2) return 144; // md:mt-36
  return 0;
}

type PackItem = {
  id: string;
  start: number;
  span: number;
  mtPx: number;
  aspect: number;
  captionPx: number;
  mbPx: number;
};

type Packed = PackItem & { x: number; y: number; w: number; row: number };

/**
 * Approximate CSS grid auto-flow:row with explicit col-start/span.
 * y is returned in canvas units (% of board width) assuming boardWidthPx.
 */
function packGrid(items: PackItem[], boardWidthPx: number, rowGapPx: number): Packed[] {
  type Row = { occupied: boolean[]; topPx: number; heightPx: number };
  const rows: Row[] = [];
  const out: Packed[] = [];

  const newRow = (topPx: number): Row => ({
    occupied: Array.from({ length: COLS }, () => false),
    topPx,
    heightPx: 0,
  });

  let cursorTop = 0;
  if (rows.length === 0) rows.push(newRow(0));

  for (const item of items) {
    const span = Math.min(COLS, Math.max(1, item.span));
    const start0 = Math.min(COLS - span, Math.max(0, item.start - 1));

    const fits = (row: Row) => {
      for (let c = start0; c < start0 + span; c += 1) {
        if (row.occupied[c]) return false;
      }
      return true;
    };

    let rowIndex = rows.length - 1;
    if (!fits(rows[rowIndex])) {
      const prev = rows[rowIndex];
      cursorTop = prev.topPx + prev.heightPx + rowGapPx;
      rows.push(newRow(cursorTop));
      rowIndex = rows.length - 1;
    }

    // If still doesn't fit (explicit start past free cells), force new row
    if (!fits(rows[rowIndex])) {
      const prev = rows[rowIndex];
      cursorTop = prev.topPx + prev.heightPx + rowGapPx;
      rows.push(newRow(cursorTop));
      rowIndex = rows.length - 1;
    }

    const row = rows[rowIndex];
    for (let c = start0; c < start0 + span; c += 1) row.occupied[c] = true;

    const wPct = spanToW(span);
    const widthPx = (wPct / 100) * boardWidthPx;
    const imgH = widthPx * item.aspect;
    const blockH = item.mtPx + imgH + item.captionPx + item.mbPx;
    row.heightPx = Math.max(row.heightPx, blockH);

    const yPx = row.topPx + item.mtPx;
    out.push({
      ...item,
      start: start0 + 1,
      span,
      x: colStartToX(start0 + 1),
      y: (yPx / boardWidthPx) * 100,
      w: wPct,
      row: rowIndex,
    });
  }

  return out;
}

function homeSpan(width?: HomeProjectWidth): number {
  return HOME_WIDTH_SPAN[width ?? "medium"] ?? 5;
}

function homeStart(align?: HomeProjectAlign, span?: number): number {
  if ((span ?? 12) >= 12) return 1;
  return HOME_ALIGN_START[align ?? "center"] ?? 4;
}

/**
 * Convert homeWidth/homeAlign (+ index rhythm) to canvas placements for all
 * home projects in order. Deterministic; no I/O.
 */
export function legacyHomePlacements(
  projects: Project[],
  boardWidthPx = 1376,
): Map<string, CanvasPlacement> {
  const items: PackItem[] = projects.map((project, index) => {
    const span = homeSpan(project.homeWidth);
    return {
      id: project.id,
      start: homeStart(project.homeAlign, span),
      span,
      mtPx: HOME_MT_PX[index % HOME_MT_PX.length] || 0,
      aspect: HOME_ASPECT,
      captionPx: HOME_CAPTION,
      mbPx: HOME_MB,
    };
  });

  const packed = packGrid(items, boardWidthPx, HOME_GAP_Y);
  const map = new Map<string, CanvasPlacement>();
  for (const p of packed) {
    map.set(p.id, clampPlacement({ x: p.x, y: p.y, w: p.w }));
  }
  return map;
}

function blockWidth(block: Extract<ProjectBlock, { type: "image" }>): BlockWidth {
  const w = block.width as BlockWidth | undefined;
  if (w && w in BLOCK_WIDTH_SPAN) return w;
  return "full";
}

function blockAlign(block: Extract<ProjectBlock, { type: "image" }>): BlockAlign {
  const a = block.align as BlockAlign | undefined;
  if (a && a in BLOCK_ALIGN_START) return a;
  return "center";
}

/**
 * Convert legacy image width/align (+ block-index vertical rhythm) to canvas.
 * Text blocks consume index for rhythm but are not placed (they render above
 * the canvas in ProjectPublicView).
 */
export function legacyProjectImagePlacements(
  blocks: ProjectBlock[],
  boardWidthPx = 1376,
): Map<number, CanvasPlacement> {
  const imageEntries: { imageIndex: number; blockIndex: number; block: Extract<ProjectBlock, { type: "image" }> }[] =
    [];
  let imageIndex = 0;
  blocks.forEach((block, blockIndex) => {
    if (block.type === "image" && block.src) {
      imageEntries.push({ imageIndex, blockIndex, block });
      imageIndex += 1;
    }
  });

  const items: PackItem[] = imageEntries.map(({ imageIndex: i, blockIndex, block }) => {
    const width = blockWidth(block);
    const span = BLOCK_WIDTH_SPAN[width];
    const align = width === "full" ? "left" : blockAlign(block);
    const start = width === "full" ? 1 : BLOCK_ALIGN_START[align];
    const hasCaption =
      !!block.caption &&
      block.caption.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").trim().length > 0;
    return {
      id: String(i),
      start,
      span,
      mtPx: projectMtPx(blockIndex),
      aspect: PROJECT_ASPECT,
      captionPx: hasCaption ? PROJECT_CAPTION : 12,
      mbPx: 0,
    };
  });

  const packed = packGrid(items, boardWidthPx, PROJECT_GAP_Y);
  const map = new Map<number, CanvasPlacement>();
  for (const p of packed) {
    map.set(Number(p.id), clampPlacement({ x: p.x, y: p.y, w: p.w }));
  }
  return map;
}

type StoredImageWidth = NonNullable<Extract<ProjectBlock, { type: "image" }>["width"]>;
type StoredImageAlign = NonNullable<Extract<ProjectBlock, { type: "image" }>["align"]>;

/** Single-image helper when packing one-off (uses imageIndex as blockIndex). */
export function legacyImagePlacementFromFields(
  width: StoredImageWidth | BlockWidth | undefined,
  align: StoredImageAlign | BlockAlign | undefined,
  blockIndex: number,
  boardWidthPx = 1376,
): CanvasPlacement {
  const storedWidth: StoredImageWidth =
    width === "half" || width === "third" || width === "full" ? width : "full";
  const storedAlign: StoredImageAlign =
    align === "left" || align === "center" || align === "right" ? align : "center";
  const fake: ProjectBlock[] = Array.from({ length: blockIndex }, (_, i) => ({
    type: "image" as const,
    src: `placeholder-${i}`,
    caption: "",
    width: "third" as const,
    align: "left" as const,
  }));
  fake.push({
    type: "image",
    src: "target",
    caption: "",
    width: storedWidth,
    align: storedAlign,
  });
  return (
    legacyProjectImagePlacements(fake, boardWidthPx).get(blockIndex) ||
    defaultCanvasPlacement(blockIndex)
  );
}

/**
 * Resolve homepage placement for render (no DB write).
 * When PUBLIC_PREFER_LEGACY_GRID_APPROX: always use legacy homeWidth/homeAlign pack.
 * Otherwise: homeCanvas ?? legacy ?? default.
 */
export function resolveHomePlacement(
  project: Project,
  index: number,
  packedLegacy: Map<string, CanvasPlacement>,
): CanvasPlacement {
  const fromLegacy = packedLegacy.get(project.id);

  if (PUBLIC_PREFER_LEGACY_GRID_APPROX) {
    return fromLegacy || clampPlacement(project.homeCanvas || defaultCanvasPlacement(index));
  }

  if (project.homeCanvas) return clampPlacement(project.homeCanvas);
  return fromLegacy || defaultCanvasPlacement(index);
}

/**
 * Resolve project-page image placement for render (no DB write).
 * Stored canvas wins when set; else legacy width/align; else crude default.
 */
export function resolveImagePlacement(
  block: Extract<ProjectBlock, { type: "image" }>,
  imageIndex: number,
  packedLegacy: Map<number, CanvasPlacement>,
): CanvasPlacement {
  if (block.canvas) return clampPlacement(block.canvas);

  const fromLegacy = packedLegacy.get(imageIndex);
  if (fromLegacy) return fromLegacy;

  // No width/align either — last resort
  if (block.width || block.align) {
    return legacyImagePlacementFromFields(block.width, block.align, imageIndex);
  }

  return defaultCanvasPlacement(imageIndex);
}

/**
 * Seed admin drafts: same as public resolve so the editor opens on the
 * approximated layout. Saving persists canvas — reversible while width/align remain.
 */
export function seedHomePlacement(project: Project, index: number, allHome: Project[]): CanvasPlacement {
  const packed = legacyHomePlacements(allHome);
  return resolveHomePlacement(project, index, packed);
}

export function seedImagePlacement(
  block: Extract<ProjectBlock, { type: "image" }>,
  imageIndex: number,
  allBlocks: ProjectBlock[],
): CanvasPlacement {
  const packed = legacyProjectImagePlacements(allBlocks);
  return resolveImagePlacement(block, imageIndex, packed);
}
