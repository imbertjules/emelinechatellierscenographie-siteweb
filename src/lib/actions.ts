"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { checkPassword, clearAdminCookie, requireAdmin, setAdminCookie } from "./auth";
import { HOME_LAYOUTS } from "./types";
import type { HomeLayout, Project, ProjectImage } from "./types";
import { readSite, slugify, writeSite } from "./store";
import { saveUpload } from "./uploads";
import { del } from "@vercel/blob";

function revalidatePublic() {
  revalidatePath("/");
  revalidatePath("/a-propos");
  revalidatePath("/projets", "layout");
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
      next.push({ src: await saveUpload(file), caption });
    } else if (src) {
      next.push({ src, caption });
    }
  }

  if (next.length === 0 && existing[0]) {
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
  if (images.length === 0) {
    redirect(current ? `/admin/projets/${id}` : "/admin/projets/nouveau");
  }

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
  if (index >= 0) site.projects[index] = project;
  else site.projects.push(project);

  await writeSite(site);
  revalidatePublic();
  redirect("/admin/projets");
}

export async function deleteProjectAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const site = await readSite();

  // Trouve le projet avant de le supprimer pour récupérer ses images
  const projectToDelete = site.projects.find((p) => p.id === id);

  // Supprime les images du Vercel Blob si elles y sont stockées
  if (projectToDelete && process.env.BLOB_READ_WRITE_TOKEN) {
    for (const img of projectToDelete.images) {
      if (img.src.includes("vercel-storage.com") || img.src.includes("public.blob.vercel-storage.com")) {
        try {
          await del(img.src, { token: process.env.BLOB_READ_WRITE_TOKEN });
        } catch (e) {
          console.error("Erreur lors de la suppression de l'image blob:", e);
        }
      }
    }
  }

  // Retire le projet de la liste
  site.projects = site.projects.filter((p) => p.id !== id);
  await writeSite(site);
  revalidatePublic();
  redirect("/admin/projets");
}
