"use client";

import { SiteHeader } from "@/components/SiteHeader";
import { PlacementCanvas, type CanvasItem } from "@/components/PlacementCanvas";
import type { SiteSettings } from "@/lib/types";

type Props = {
  settings: SiteSettings;
  items: CanvasItem[];
  onClose: () => void;
};

/** Aperçu of the homepage canvas with real site header/chrome. */
export function HomeLayoutPreview({ settings, items, onClose }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Aperçu de l’accueil"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#000",
        overflow: "auto",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          display: "flex",
          justifyContent: "flex-end",
          gap: 12,
          padding: "10px 16px",
          pointerEvents: "none",
        }}
      >
        <p
          style={{
            margin: 0,
            marginRight: "auto",
            fontSize: 12,
            color: "#fff",
            background: "rgba(0,0,0,0.55)",
            padding: "6px 10px",
            maxWidth: "70%",
          }}
        >
          Aperçu public de l’accueil — non enregistré tant que vous n’avez pas cliqué sur Enregistrer
        </p>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: "1px solid #fff",
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            padding: "8px 14px",
            cursor: "pointer",
            pointerEvents: "auto",
            fontSize: 14,
          }}
        >
          Fermer
        </button>
      </div>

      <main>
        <SiteHeader settings={settings} current="home" />
        <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-28 md:py-32">
          <PlacementCanvas items={items} editable={false} minHeight={900} dark />
        </section>
      </main>
    </div>
  );
}
