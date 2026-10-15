"use client";

import { useMemo, useState, useTransition } from "react";
import type { CanvasPlacement, Project } from "@/lib/types";
import { clampPlacement, defaultCanvasPlacement, getHomeImage } from "@/lib/types";
import { PlacementCanvas, type CanvasItem } from "@/components/PlacementCanvas";
import { saveHomeCanvasAction } from "@/lib/actions";

type Draft = Record<string, CanvasPlacement>;

function draftsFrom(projects: Project[]): Draft {
  const next: Draft = {};
  projects.forEach((project, index) => {
    next[project.id] = clampPlacement(project.homeCanvas || defaultCanvasPlacement(index));
  });
  return next;
}

export function HomeCanvasForm({ projects }: { projects: Project[] }) {
  const homeProjects = useMemo(
    () =>
      projects
        .filter((p) => p.showOnHome && getHomeImage(p)?.src)
        .sort((a, b) => a.order - b.order),
    [projects],
  );

  const [placements, setPlacements] = useState<Draft>(() => draftsFrom(homeProjects));
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();

  const items: CanvasItem[] = homeProjects.map((project) => {
    const image = getHomeImage(project)!;
    return {
      id: project.id,
      src: image.src,
      label: project.title,
      placement: placements[project.id] || defaultCanvasPlacement(),
      href: `/projets/${project.slug}`,
    };
  });

  function onChange(id: string, placement: CanvasPlacement) {
    setPlacements((prev) => ({ ...prev, [id]: placement }));
    setMessage("");
  }

  function save() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set(
        "placements",
        JSON.stringify(
          homeProjects.map((p) => ({
            projectId: p.id,
            canvas: placements[p.id] || defaultCanvasPlacement(),
          })),
        ),
      );
      try {
        await saveHomeCanvasAction(fd);
        setMessage("Positions de l’accueil enregistrées.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Erreur d’enregistrement.");
      }
    });
  }

  if (homeProjects.length === 0) {
    return (
      <p style={{ color: "#111" }}>
        Aucun projet affiché sur l’accueil avec une photo. Cochez « Afficher sur la page d’accueil »
        et désignez une photo d’accueil dans un projet.
      </p>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16, color: "#111" }}>
      <p style={{ margin: 0, maxWidth: 640 }}>
        Glissez et redimensionnez une vignette par projet. Aimantage léger sur les bords et le
        centre. Enregistrez pour publier ces positions sur l’accueil.
      </p>
      <PlacementCanvas items={items} onChange={onChange} editable minHeight={800} dark />
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          style={{
            border: "1px solid #111",
            background: "#111",
            color: "#fff",
            padding: "12px 24px",
            cursor: "pointer",
            fontSize: 16,
            fontWeight: "bold",
          }}
        >
          {pending ? "Enregistrement…" : "Enregistrer l’accueil"}
        </button>
        {message ? <span>{message}</span> : null}
      </div>
    </div>
  );
}
