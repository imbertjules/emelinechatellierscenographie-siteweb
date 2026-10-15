"use client";

import { useMemo, useState, useTransition } from "react";
import type { CanvasPlacement, Project, SiteSettings } from "@/lib/types";
import { defaultCanvasPlacement, getHomeImage } from "@/lib/types";
import { legacyHomePlacements, resolveHomePlacement } from "@/lib/legacy-placement";
import { PlacementCanvas, type CanvasItem } from "@/components/PlacementCanvas";
import { SiteHeader } from "@/components/SiteHeader";
import { saveHomeCanvasAction } from "@/lib/actions";

type Draft = Record<string, CanvasPlacement>;

function draftsFrom(projects: Project[]): Draft {
  const packed = legacyHomePlacements(projects);
  const next: Draft = {};
  projects.forEach((project, index) => {
    // Same resolve as public home (legacy approx while PREFER flag is on).
    next[project.id] = resolveHomePlacement(project, index, packed);
  });
  return next;
}

export function HomeCanvasForm({
  projects,
  settings,
}: {
  projects: Project[];
  settings: SiteSettings;
}) {
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

  const items: CanvasItem[] = homeProjects.map((project, index) => {
    const image = getHomeImage(project)!;
    return {
      id: project.id,
      src: image.src,
      label: project.title,
      caption: image.caption,
      placement: placements[project.id] || defaultCanvasPlacement(index),
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
        Placez les vignettes directement sur l’accueil tel que le public le voit. Tirez vers le bas
        pour allonger la page.
      </p>

      <div style={{ marginLeft: -24, marginRight: -24, position: "relative", zIndex: 0 }}>
        <main className="relative min-h-screen bg-black text-white" style={{ outline: "1px solid #333" }}>
          <SiteHeader settings={settings} current="home" embedded />
          <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-28 md:py-32">
            <PlacementCanvas
              items={items}
              onChange={onChange}
              editable
              minHeight={900}
              dark
              captionClassName="home-caption"
            />
          </section>
        </main>
      </div>

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
