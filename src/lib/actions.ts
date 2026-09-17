"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, clearAdminCookie, requireAdmin, setAdminCookie } from "./auth";
import { HOME_LAYOUTS } from "./types";
import type { HomeLayout, Project, ProjectImage } from "./types";
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
  await writeSite(site);
  revalidatePublic();
  redirect("/admin");
}

export async function saveAboutAction(formData: FormData) {
  await requireAdmin();
  const site = await readSite();
  site.aboutHtml = String(formData.get("aboutHtml") || "");
  await writeSite(site);
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
  const images = await imagesFromForm(formData, current?.images || []);

  const layout = String(formData.get("homeLayout") || "") as HomeLayout;
  const project: Project = {
    id,
    title,
    slug: slugify(title),
    showOnHome: formData.get("showOnHome") === "on",
    homeLayout: HOME_LAYOUTS.includes(layout)
        ? layout
        : HOME_LAYOUTS[site.projects.length % HOME_LAYOUTS.length],
    order: Number(formData.get("order") || current?.order || site.projects.length + 1),
    images,
  };

  const index = site.projects.findIndex((p) => p.id === id);
  if (index >= 0) {
    site.projects[index] = project;
  } else {
    site.projects.push(project);
  }

  await writeSite(site);
  revalidatePublic();
  redirect("/admin/projets");
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
  await writeSite(site);
  revalidatePublic();
  redirect("/admin/projets");
}
