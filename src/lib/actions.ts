"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, clearAdminCookie, requireAdmin, setAdminCookie } from "./auth";
import {
  Project,
  ProjectImage,
  ProjectBlock,
  CanvasPlacement,
  clampPlacement,
  defaultCanvasPlacement,
} from "./types";
import { readSite, slugify, writeSite } from "./store";
import { saveUpload, deleteUploadByUrl } from "./uploads";

function revalidatePublic() {
  revalidatePath("/");
  revalidatePath("/a-propos");
  revalidatePath("/projets", "layout");
  revalidatePath("/admin/projets");
  revalidatePath("/admin/a-propos");
  revalidatePath("/admin/reglages");
  revalidatePath("/admin", "layout");
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (!checkPassword(password)) {
    redirect("/admin/login?error=1");
  }
  await setAdminCookie();
  redirect("/admin");
}

export async function logoutAction() {
  await clearAdminCookie();
  redirect("/admin/login");
}

export async function saveSettingsAction(formData: FormData) {
  await requireAdmin();
  const site = await readSite();
  site.settings = {
    name: String(formData.get("name") || "").trim() || site.settings.name,
    tagline: String(formData.get("tagline") || "").trim(),
    email: String(formData.get("email") || "").trim(),
  };
  try {
    await writeSite(site);
  } catch (e) {
    console.error('Error writing site in saveSettingsAction:', e);
    const msg = encodeURIComponent(String(e instanceof Error ? e.message : e));
    redirect(`/admin?error=1&msg=${msg}`);
  }
  revalidatePublic();
  redirect("/admin");
}

export async function saveAboutAction(formData: FormData) {
  await requireAdmin();
  const site = await readSite();
  const about = String(formData.get("aboutHtml") || "");
  console.log('saveAboutAction received aboutHtml length=', about.length);
  site.aboutHtml = about;
  try {
    await writeSite(site);
  } catch (e) {
    console.error('Error writing site in saveAboutAction:', e);
    const msg = encodeURIComponent(String(e instanceof Error ? e.message : e));
    redirect(`/admin/a-propos?error=1&msg=${msg}`);
  }
  revalidatePublic();
  redirect("/admin/a-propos");
}

async function imagesFromForm(formData: FormData, existing: ProjectImage[]) {
  const count = Number(formData.get("imageCount") || 0);
  const next: ProjectImage[] = [];

  for (let i = 0; i < count; i += 1) {
    const src = String(formData.get(`existingSrc-${i}`) || "");
    const caption = String(formData.get(`caption-${i}`) || "");
    const file = formData.get(`file-${i}`);

    if (file instanceof File && file.size > 0) {
      const uploadedUrl = await saveUpload(file);
      next.push({ src: uploadedUrl, caption });
    } else if (src) {
      next.push({ src, caption });
    }
  }

  // Si aucune image n'a pu être récupérée mais qu'il y en avait avant, on garde l'existant par sécurité
  if (next.length === 0 && existing.length > 0) {
    return existing;
  }

  return next;
}

export async function saveProjectAction(formData: FormData) {
  await requireAdmin();
  const site = await readSite();
  const id = String(formData.get("id") || "") || crypto.randomUUID();
  const title = String(formData.get("title") || "").trim();

  if (!title) {
    redirect("/admin/projets/nouveau");
  }

  const current = site.projects.find((p) => p.id === id);

  // Parse structured data from form
  const contentStr = formData.get("content") as string || "[]";
  const imagesStr = formData.get("images") as string || "[]";

  let content: ProjectBlock[] = [];
  try {
    content = JSON.parse(contentStr);
  } catch (e) {
    console.error("Failed to parse content JSON", e);
  }

  let images: ProjectImage[] = [];
  try {
    images = JSON.parse(imagesStr);
  } catch (e) {
    console.error("Failed to parse images JSON", e);
  }

  // Always persist canvas placements (auto-create defaults when missing).
  let imageIndex = 0;
  content = content.map((block) => {
    if (block.type !== "image") return block;
    const canvas = clampPlacement(block.canvas || defaultCanvasPlacement(imageIndex));
    imageIndex += 1;
    return { ...block, canvas, width: undefined, align: undefined };
  });

  let homeCanvas: CanvasPlacement | undefined = current?.homeCanvas;
  const homeCanvasStr = formData.get("homeCanvas");
  if (typeof homeCanvasStr === "string" && homeCanvasStr) {
    try {
      homeCanvas = clampPlacement(JSON.parse(homeCanvasStr) as CanvasPlacement);
    } catch {
      // keep existing
    }
  }
  const showOnHome = formData.get("showOnHome") === "on";
  if (showOnHome && !homeCanvas) {
    const homeIndex = site.projects.filter((p) => p.showOnHome).length;
    homeCanvas = defaultCanvasPlacement(current ? Math.max(0, homeIndex - 1) : homeIndex);
  }

  const project: Project = {
    id,
    title,
    slug: slugify(title),
    showOnHome,
    homeLayout: undefined,
    homeWidth: undefined,
    homeAlign: undefined,
    homeCanvas,
    order: Number(formData.get("order") || current?.order || site.projects.length + 1),
    images,
    content,
  };

  const index = site.projects.findIndex((p) => p.id === id);
  if (index >= 0) {
    site.projects[index] = project;
  } else {
    site.projects.push(project);
  }

  try {
    await writeSite(site);
  } catch (e) {
    console.error('Error writing site in saveProjectAction:', e);
    const msg = encodeURIComponent(String(e instanceof Error ? e.message : e));
    redirect(`/admin/projets?error=1&msg=${msg}`);
  }
  revalidatePublic();
  redirect("/admin/projets");
}

export async function saveHomeCanvasAction(formData: FormData) {
  await requireAdmin();
  const site = await readSite();
  const raw = String(formData.get("placements") || "[]");
  let placements: Array<{ projectId: string; canvas: CanvasPlacement }> = [];
  try {
    placements = JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse home canvas placements", e);
    throw new Error("Données du canevas d’accueil invalides.");
  }

  const byId = new Map(placements.map((p) => [p.projectId, clampPlacement(p.canvas)]));
  site.projects = site.projects.map((project) => {
    const next = byId.get(project.id);
    if (!next) return project;
    return { ...project, homeCanvas: next };
  });

  try {
    await writeSite(site);
  } catch (e) {
    console.error("Error writing site in saveHomeCanvasAction:", e);
    throw e instanceof Error ? e : new Error(String(e));
  }
  revalidatePublic();
}

export async function deleteProjectAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const site = await readSite();

  const projectToDelete = site.projects.find((p) => p.id === id);

  if (projectToDelete) {
    for (const img of projectToDelete.images) {
      try {
        await deleteUploadByUrl(img.src);
      } catch (e) {
        console.error("Erreur lors de la suppression de l'image:", e);
      }
    }
  }

  site.projects = site.projects.filter((p) => p.id !== id);
  try {
    await writeSite(site);
  } catch (e) {
    console.error('Error writing site in deleteProjectAction:', e);
    const msg = encodeURIComponent(String(e instanceof Error ? e.message : e));
    redirect(`/admin/projets?error=1&msg=${msg}`);
  }
  revalidatePublic();
  redirect("/admin/projets");
}
