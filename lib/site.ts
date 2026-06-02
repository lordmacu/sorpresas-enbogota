import config from "@/data/config.json";

/** URL canónica del sitio (sin slash final). */
export const SITE_URL = (config.dominio || "https://sorpresas.enbogota.app").replace(/\/$/, "");

export const SITE_NAME = config.nombre || "Sorpresas";

/** Número de WhatsApp del negocio (sin prefijo de país). Fuente única. */
export const WHATSAPP = config.whatsapp;

/** Construye un enlace wa.me con mensaje prellenado. */
export function waLink(mensaje = "Hola! Quiero hacer un pedido"): string {
  return `https://wa.me/57${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
}

/** Construye una URL absoluta a partir de una ruta relativa. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Formatea un precio en pesos colombianos. */
export function formatCOP(price: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(price);
}
