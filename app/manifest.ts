import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";
import config from "@/data/config.json";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} | Flores, desayunos y regalos a domicilio`,
    short_name: SITE_NAME,
    description: config.descripcion,
    start_url: "/",
    display: "standalone",
    background_color: "#FDFBF7",
    theme_color: "#8B2635",
    lang: "es-CO",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180" },
    ],
  };
}
