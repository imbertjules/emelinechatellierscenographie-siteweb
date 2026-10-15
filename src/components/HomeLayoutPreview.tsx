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
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 50,
          border: "1px solid #fff",
          background: "rgba(0,0,0,0.8)",
          color: "#fff",
          padding: "8px 14px",
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        Fermer l’aperçu
      </button>

      <main className="relative min-h-screen bg-black text-white">
        <SiteHeader settings={settings} current="home" embedded />
        <section className="max-w-[1600px] mx-auto px-4 md:px-8 py-28 md:py-32">
          <PlacementCanvas items={items} editable={false} minHeight={900} dark />
        </section>
      </main>
    </div>
  );
}
