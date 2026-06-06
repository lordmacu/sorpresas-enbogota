// Empuja eventos al dataLayer de Google Tag Manager (GTM se carga en app/layout.tsx).
// En el panel de GTM se crean tags con trigger "Evento personalizado" = el campo `event`.
type GtmData = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer?: GtmData[];
  }
}

export function gtmPush(data: GtmData): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(data);
}
