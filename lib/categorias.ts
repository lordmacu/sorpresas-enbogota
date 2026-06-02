/**
 * Resuelve qué archivo JSON cargar según el slug de categoría.
 * Para subcategorías: busca directamente en /data/scraped/{slug}.json
 * Para categorías principales: combina los JSON de sus subcategorías.
 */

import categoriasJson from "@/data/categorias.json";

export interface Subcategoria {
  nombre: string;
  slug: string;
}

export interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string;
  imagen: string;
  popular: boolean;
  subcategorias: Subcategoria[];
}

// El JSON puede traer subcategorias vacías ([]), lo que TypeScript infiere como
// never[]. Casteamos a los tipos canónicos para tipar todos los consumidores.
const categorias = categoriasJson as unknown as { categorias: Categoria[] };

export const CATEGORIAS: Categoria[] = categorias.categorias;

export function getCategoriaSlugPath(slug: string): { tipo: "subcategoria" | "categoria"; jsonFiles: string[] } {
  // 1. Buscar si es una subcategoría directa
  for (const cat of categorias.categorias) {
    if (cat.subcategorias) {
      const sub = cat.subcategorias.find((s) => s.slug === slug);
      if (sub) {
        return { tipo: "subcategoria", jsonFiles: [slug] };
      }
    }
  }

  // 2. Buscar si es una categoría principal
  const catPrincipal = categorias.categorias.find((c) => c.slug === slug);
  if (catPrincipal) {
    // Agregar el slug de la categoría principal también por si hay productos directos
    const jsonFiles = [slug];
    if (catPrincipal.subcategorias) {
      for (const sub of catPrincipal.subcategorias) {
        jsonFiles.push(sub.slug);
      }
    }
    return { tipo: "categoria", jsonFiles };
  }

  // 3. No encontrado → return vacío
  return { tipo: "categoria", jsonFiles: [] };
}

export function getCategoriaInfo(slug: string): Categoria | null {
  // Buscar en categorías principales
  const cat = categorias.categorias.find((c) => c.slug === slug);
  if (cat) return cat;

  // Buscar en subcategorías
  for (const c of categorias.categorias) {
    if (c.subcategorias) {
      const sub = c.subcategorias.find((s) => s.slug === slug);
      if (sub) {
        return {
          id: sub.slug,
          nombre: sub.nombre,
          slug: sub.slug,
          descripcion: c.descripcion,
          imagen: c.imagen,
          popular: c.popular,
          subcategorias: [],
        };
      }
    }
  }

  return null;
}

export function getSubcategoriaParent(slug: string): Categoria | null {
  for (const cat of categorias.categorias) {
    if (cat.subcategorias) {
      const sub = cat.subcategorias.find((s) => s.slug === slug);
      if (sub) return cat;
    }
  }
  return null;
}

export function getBreadcrumb(slug: string): { nombre: string; slug: string }[] {
  const breadcrumb: { nombre: string; slug: string }[] = [];

  const catPrincipal = categorias.categorias.find((c) => c.slug === slug);
  if (catPrincipal) {
    breadcrumb.push({ nombre: catPrincipal.nombre, slug: catPrincipal.slug });
    return breadcrumb;
  }

  for (const cat of categorias.categorias) {
    if (cat.subcategorias) {
      const sub = cat.subcategorias.find((s) => s.slug === slug);
      if (sub) {
        breadcrumb.push({ nombre: cat.nombre, slug: cat.slug });
        breadcrumb.push({ nombre: sub.nombre, slug: sub.slug });
        return breadcrumb;
      }
    }
  }

  return breadcrumb;
}