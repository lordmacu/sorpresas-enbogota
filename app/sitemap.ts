import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import categorias from "@/data/categorias.json";
import productos from "@/data/productos.json";
import landings from "@/data/landings.json";
import guias from "@/data/guias.json";
import blog from "@/data/blog.json";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const estaticas: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/categorias`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/cobertura-bogota`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/blog/guias`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/como-funciona`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/nosotros`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/opiniones`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/preguntas-frecuentes`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/contacto`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  const landingUrls: MetadataRoute.Sitemap = landings.landings.map((l) => ({
    url: `${SITE_URL}/${l.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const guiaUrls: MetadataRoute.Sitemap = guias.guias.map((g) => ({
    url: `${SITE_URL}/blog/guias/${g.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const blogUrls: MetadataRoute.Sitemap = blog.posts.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const categoriaUrls: MetadataRoute.Sitemap = categorias.categorias.map((c) => ({
    url: `${SITE_URL}/categorias/${c.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
    images: c.imagen ? [`${SITE_URL}${c.imagen}`] : undefined,
  }));

  const productoUrls: MetadataRoute.Sitemap = productos.productos.map((p) => ({
    url: `${SITE_URL}/producto/${p.slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
    images: p.imagen ? [`${SITE_URL}${p.imagen}`] : undefined,
  }));

  return [...estaticas, ...landingUrls, ...guiaUrls, ...blogUrls, ...categoriaUrls, ...productoUrls];
}
