"use client";

import { useEffect } from "react";
import { gtmPush } from "@/lib/gtm";

/**
 * Un único listener global de clics. Captura sin tener que tocar cada botón:
 *  - enlaces de WhatsApp (wa.me / whatsapp) → evento `whatsapp_click`
 *  - enlaces a /producto/<slug>            → evento `select_item`
 * El contexto del producto (id/nombre/precio) viaja en data-attributes
 * (data-gtm-slug / data-gtm-name / data-gtm-precio) cuando el enlace los trae.
 */
export function GtmTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href") || "";
      const d = a.dataset;
      const value = d.gtmPrecio ? Number(d.gtmPrecio) : undefined;

      if (/wa\.me|api\.whatsapp|whatsapp\.com/i.test(href)) {
        gtmPush({
          event: "whatsapp_click",
          item_id: d.gtmSlug || undefined,
          item_name: d.gtmName || undefined,
          value,
          currency: value ? "COP" : undefined,
        });
      } else if (/^\/producto\//.test(href)) {
        gtmPush({
          event: "select_item",
          item_id: d.gtmSlug || href.replace(/^\/producto\//, "").split(/[?#]/)[0],
          item_name: d.gtmName || undefined,
          value,
          currency: value ? "COP" : undefined,
        });
      }
    };
    document.addEventListener("click", onClick, true); // fase de captura: lo agarra siempre
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
