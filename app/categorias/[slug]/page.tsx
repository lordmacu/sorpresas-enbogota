import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ProductCard } from "@/components/ProductCard";
import { JsonLd } from "@/components/JsonLd";
import { GtmEvent } from "@/components/GtmEvent";
import { SITE_URL, waLink } from "@/lib/site";
import categorias from "@/data/categorias.json";
import landings from "@/data/landings.json";
import { getCategoriaInfo, getSubcategoriaParent, getBreadcrumb } from "@/lib/categorias";
import Link from "next/link";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Limpia colas del scraping (p. ej. "Calificación: 5 Estrellas ☆☆☆☆") que se
// colaban en las descripciones de categoría y, por ende, en las meta-descriptions.
function limpiarDescripcion(desc: string): string {
  return (desc || "")
    .replace(/Calificaci[oó]n:[\s\S]*$/i, "")
    .replace(/[★☆]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Encuentra una landing de ocasión/urgencia relacionada con esta categoría para
// cruzar el enlace (cierra el silo categoría ↔ landing).
function landingRelacionada(slug: string) {
  const candidatas = landings.landings.filter((l) => {
    const tipo = (l as { tipo?: string }).tipo;
    return tipo === "ocasion" || tipo === "urgencia";
  });
  return (
    candidatas.find((l) => (l as { ctaCategoria?: string }).ctaCategoria === slug) ||
    candidatas.find((l) =>
      ((l as { categoriasFuente?: string[] }).categoriasFuente || []).includes(slug)
    ) ||
    null
  );
}

export async function generateStaticParams() {
  return categorias.categorias.map((cat) => ({ slug: cat.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const categoria = getCategoriaInfo(slug);
  const esSubcategoria = getSubcategoriaParent(slug) !== null;

  if (!categoria) {
    return { title: "Categoría no encontrada" };
  }

  // Evita duplicar "Bogotá" cuando el nombre de la colección ya lo incluye.
  const titulo =
    esSubcategoria || /bogot/i.test(categoria.nombre)
      ? categoria.nombre
      : `${categoria.nombre} en Bogotá`;

  const imagen = "imagen" in categoria ? (categoria as { imagen?: string }).imagen : undefined;

  const lugar = /bogot/i.test(categoria.nombre) ? "" : " en Bogotá";
  const descripcionMeta = `Encuentra ${categoria.nombre.toLowerCase()}${lugar}. ${limpiarDescripcion(categoria.descripcion)}`
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

  return {
    title: titulo,
    description: descripcionMeta,
    alternates: { canonical: `/categorias/${slug}` },
    openGraph: {
      title: titulo,
      description: descripcionMeta,
      url: `${SITE_URL}/categorias/${slug}`,
      type: "website",
      images: imagen ? [{ url: imagen }] : undefined,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;

  const categoria = getCategoriaInfo(slug);
  const catPrincipal = getSubcategoriaParent(slug);
  const esSubcategoria = catPrincipal !== null;
  const breadcrumb = getBreadcrumb(slug);

  if (!categoria) {
    notFound();
  }

  // === CARGAR JSON DINÁMICAMENTE PARA SEO ===
  // Subcategoría: carga su propio JSON
  // Categoría principal: combina sus subcategorías
  let productos: any[] = [];

  if (esSubcategoria) {
    // Cargar JSON específico de la subcategoría
    try {
      const data = await import(`@/data/scraped/${slug}.json`);
      productos = data.productos.map((p: any) => ({ ...p, categoria: slug }));
    } catch {
      productos = [];
    }
  } else {
    // Cargar y combinar JSONs de todas las subcategorías
    const subcategorias = categoria.subcategorias ?? [];
    for (const sub of subcategorias) {
      try {
        const data = await import(`@/data/scraped/${sub.slug}.json`);
        productos.push(...data.productos.map((p: any) => ({ ...p, categoria: sub.slug })));
      } catch {
        // Subcategoría sin productos aún
      }
    }

    // También cargar productos de la categoría principal si existen
    try {
      const data = await import(`@/data/scraped/${slug}.json`);
      productos.push(...data.productos.map((p: any) => ({ ...p, categoria: slug })));
    } catch {
      // Sin productos directos en categoría principal
    }
  }

  // Deduplicar por slug
  const seen = new Set();
  productos = productos.filter((p) => {
    if (seen.has(p.slug)) return false;
    seen.add(p.slug);
    return true;
  });

  const descripcionLimpia = limpiarDescripcion(categoria.descripcion);
  const ctaLanding = landingRelacionada(slug);

  // === Datos estructurados (JSON-LD) para SEO ===
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Categorías", item: `${SITE_URL}/categorias` },
      { "@type": "ListItem", position: 3, name: categoria.nombre, item: `${SITE_URL}/categorias/${slug}` },
    ],
  };

  const collectionLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: categoria.nombre,
    description: descripcionLimpia,
    url: `${SITE_URL}/categorias/${slug}`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: productos.length,
      itemListElement: productos.slice(0, 50).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE_URL}/producto/${p.slug}`,
        name: p.nombre,
      })),
    },
  };

  return (
    <div className="flex flex-col">
      <JsonLd data={[breadcrumbLd, collectionLd]} />
      <GtmEvent
        event="view_item_list"
        data={{
          item_list_id: slug,
          item_list_name: categoria.nombre,
          items_count: productos.length,
        }}
      />
      {/* Hero con foto real de la categoría */}
      <section className="relative py-16 lg:py-28 bg-gradient-to-br from-[#8B2635] to-[#6B1D2A] text-white overflow-hidden">
        {categoria.imagen && (
          <Image
            src={categoria.imagen}
            alt={`Categoría ${categoria.nombre}`}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        )}
        {/* Overlays para legibilidad del texto sobre la foto */}
        <div className="absolute inset-0 bg-[#6B1D2A]/82" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#2D2A26]/75 via-transparent to-[#2D2A26]/30" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/" className="hover:text-white transition-colors">
              Inicio
            </Link>
            {breadcrumb.map((item, i) => (
              <span key={item.slug} className="flex items-center gap-2">
                <span>/</span>
                {i === breadcrumb.length - 1 ? (
                  <span className="text-white">{item.nombre}</span>
                ) : (
                  <Link
                    href={`/categorias/${item.slug}`}
                    className="hover:text-white transition-colors"
                  >
                    {item.nombre}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          <div className="max-w-2xl">
            <p className="text-[#D4A574] font-semibold text-sm uppercase tracking-widest mb-3">
              {productos.length} productos
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
              {categoria.nombre}
            </h1>
            <p className="text-xl text-white/70 leading-relaxed">
              {descripcionLimpia}
            </p>
          </div>
        </div>
      </section>

      {/* Subcategorías (solo si es categoría principal) */}
      {!esSubcategoria && categoria.subcategorias && categoria.subcategorias.length > 0 && (
        <section className="bg-white border-b border-[#F5E6D3]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/categorias/${categoria.slug}`}
                className="px-4 py-2 rounded-full bg-[#8B2635] text-white text-sm font-medium"
              >
                Ver todo
              </Link>
              {categoria.subcategorias.map((sub: { nombre: string; slug: string }) => (
                <Link
                  key={sub.slug}
                  href={`/categorias/${sub.slug}`}
                  className="px-4 py-2 rounded-full border border-[#F5E6D3] text-[#6B6560] hover:border-[#8B2635] hover:text-[#8B2635] transition-colors text-sm font-medium"
                >
                  {sub.nombre}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Products Grid */}
      <section className="py-16 lg:py-24 bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <p className="text-[#6B6560]">
              <span className="font-semibold text-[#2D2A26]">{productos.length}</span> productos encontrados
            </p>
            <a
              href={waLink("Hola! Estoy buscando un regalo y no lo encuentro en la web")}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#8B2635] font-semibold hover:underline"
            >
              ¿No encuentras lo que buscas? Escríbenos →
            </a>
          </div>

          {productos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {productos.map((producto) => (
                <ProductCard key={producto.id} producto={producto} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#F5E6D3] flex items-center justify-center">
                <svg className="w-10 h-10 text-[#D4A574]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.545l-7.393-5.943a2 2 0 01-.54-2.022m-8.13 9.522l8.13-5.523a2 2 0 012.022.54L12 10.5M12 21.5V10m0 0L7.5 7M12 10l4.5 3" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-semibold text-[#2D2A26] mb-2">
                Próximamente más productos
              </h3>
              <p className="text-[#6B6560] mb-6">
                Estamos preparando esta categoría. ¡Escríbenos para ayudarte!
              </p>
              <a
                href={waLink(`Hola! Quiero información sobre ${categoria.nombre}`)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                Consultar por WhatsApp
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Cross-link a la landing de ocasión relacionada (cierra el silo SEO) */}
      {ctaLanding && (
        <section className="py-12 bg-[#FDFBF7] border-t border-[#F5E6D3]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              href={`/${ctaLanding.slug}`}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-white border border-[#F5E6D3] p-6 sm:p-8 card-hover"
            >
              <div>
                <p className="eyebrow mb-2">Guía relacionada</p>
                <h2 className="font-display text-xl sm:text-2xl font-bold text-[#2D2A26] leading-snug">
                  {ctaLanding.h1}
                </h2>
                <p className="text-sm text-[#6B6560] mt-2 max-w-xl">
                  {(ctaLanding as { subtitulo?: string }).subtitulo}
                </p>
              </div>
              <span className="inline-flex items-center gap-2 text-[#8B2635] font-semibold shrink-0 group-hover:gap-3 transition-all">
                Ver más
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </span>
            </Link>
          </div>
        </section>
      )}

      {/* Other Categories */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold text-[#2D2A26] mb-8 text-center">
            Explora otras categorías
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {categorias.categorias
              .filter((c) => c.slug !== slug)
              .map((cat) => (
                <Link
                  key={cat.id}
                  href={`/categorias/${cat.slug}`}
                  className="px-5 py-2 rounded-full border-2 border-[#F5E6D3] text-[#6B6560] hover:border-[#8B2635] hover:text-[#8B2635] transition-colors font-medium text-sm"
                >
                  {cat.nombre}
                </Link>
              ))}
          </div>
        </div>
      </section>
    </div>
  );
}