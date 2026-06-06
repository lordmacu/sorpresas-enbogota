import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { GtmEvent } from "@/components/GtmEvent";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductSeoContent } from "@/components/ProductSeoContent";
import { SITE_URL, SITE_NAME, formatCOP, waLink } from "@/lib/site";
import { loadSeo } from "@/lib/seo";
import productos from "@/data/productos.json";
import categorias from "@/data/categorias.json";
import landings from "@/data/landings.json";
import testimonios from "@/data/testimonios.json";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return productos.productos.map((p) => ({
    slug: p.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const producto = productos.productos.find((p) => p.slug === slug);

  if (!producto) {
    return { title: "Producto no encontrado" };
  }

  const seo = await loadSeo(slug);

  const fallbackDescripcion =
    (producto.descripcion || "").replace(/\s+/g, " ").trim().slice(0, 160) ||
    `${producto.nombre} — regalo y sorpresa a domicilio en Bogotá.`;

  const metaTitle = seo?.metaTitle || producto.nombre;
  const metaDescription = seo?.metaDescription || fallbackDescripcion;
  const metaKeywords = (producto as any).keywords || "";

  return {
    title: metaTitle,
    description: metaDescription,
    keywords: metaKeywords || undefined,
    alternates: { canonical: `/producto/${slug}` },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: `${SITE_URL}/producto/${slug}`,
      type: "website",
      images: producto.imagen ? [{ url: producto.imagen }] : undefined,
    },
  };
}

// Garantías de confianza (iconos distintos para mejor lectura visual).
const TRUST = [
  {
    label: "Flores frescas",
    d: "M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z",
  },
  {
    label: "Empaque premium",
    d: "M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-13.5h17.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H3.375A1.125 1.125 0 012.25 10.875v-2.25c0-.621.504-1.125 1.125-1.125z",
  },
  {
    label: "Entrega en Bogotá",
    d: "M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12",
  },
  {
    label: "Confirmación rápida",
    d: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  },
];

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const producto = productos.productos.find((p) => p.slug === slug);

  if (!producto) {
    notFound();
  }

  const seo = await loadSeo(slug);
  const categoria = categorias.categorias.find((c) => c.id === producto.categoria);

  // Detecta la ocasión del producto (busca en landings por slug o categoría)
  const ocasion = landings.landings.find(
    (l) =>
      l.tipo === "ocasion" &&
      (slug.includes(l.slug.split("-")[0]) || producto.categoria.includes(l.slug.split("-")[0]))
  );

  const relatedProducts = productos.productos
    .filter((p) => p.categoria === producto.categoria && p.slug !== slug && p.visible)
    .slice(0, 4);

  // Datos enriquecidos (pueden faltar en algunos productos).
  const galeria: string[] = Array.isArray(producto.galeria)
    ? (producto.galeria as string[])
    : [];
  const contenido: string[] = Array.isArray(producto.contenido)
    ? (producto.contenido as unknown[]).filter(
        (x): x is string => typeof x === "string" && x.trim().length > 0
      )
    : [];

  // Tags curados: descartamos slugs internos (con "-"/"_") y ruido del scraping.
  const tagsLimpios = Array.from(
    new Set(
      (producto.tags ?? [])
        .filter((t) => typeof t === "string" && !/[-_]/.test(t) && t.length <= 24)
        .map((t) => t.charAt(0).toUpperCase() + t.slice(1))
    )
  ).slice(0, 6);

  const disponible = producto.stock > 0;
  const hasDiscount =
    producto.precioAnterior && producto.precioAnterior > producto.precio;

  // Busca testimonios relacionados a este producto
  const productReviews = (testimonios.testimonios as any[]).filter(
    (t) => t.producto_slug === slug
  );

  // === Datos estructurados (JSON-LD) para SEO ===
  const productLd: any = {
    "@context": "https://schema.org",
    "@type": "Product",
    inLanguage: "es-CO",
    name: producto.nombre,
    description: producto.descripcion,
    image: producto.imagen ? [producto.imagen] : undefined,
    sku: producto.id,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      price: producto.precio,
      priceCurrency: "COP",
      itemCondition: "https://schema.org/NewCondition",
      availability:
        producto.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      priceValidUntil: `${new Date().getFullYear() + 1}-12-31`,
      url: `${SITE_URL}/producto/${slug}`,
      seller: { "@type": "Organization", name: SITE_NAME },
      areaServed: { "@type": "City", name: "Bogotá" },
    },
  };

  // Agrega testimonios como Review schema si existen
  if (productReviews.length > 0) {
    productLd.review = productReviews.map((t: any) => ({
      "@type": "Review",
      author: { "@type": "Person", name: t.nombre },
      datePublished: t.fecha,
      reviewBody: t.texto,
      reviewRating: {
        "@type": "Rating",
        ratingValue: t.rating,
        bestRating: 5,
        worstRating: 1,
      },
    }));

    // Calcula aggregate rating si hay reviews
    const avgRating = (
      productReviews.reduce((sum: number, t: any) => sum + t.rating, 0) /
      productReviews.length
    ).toFixed(1);
    productLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: avgRating,
      reviewCount: productReviews.length,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      ...(ocasion
        ? [{ "@type": "ListItem", position: 2, name: ocasion.h1, item: `${SITE_URL}/${ocasion.slug}` }]
        : []),
      {
        "@type": "ListItem",
        position: ocasion ? 3 : 2,
        name: categoria?.nombre || "Categorías",
        item: categoria ? `${SITE_URL}/categorias/${categoria.slug}` : `${SITE_URL}/categorias`,
      },
      {
        "@type": "ListItem",
        position: ocasion ? 4 : 3,
        name: producto.nombre,
        item: `${SITE_URL}/producto/${slug}`,
      },
    ],
  };

  const faqLd = seo && seo.faqs.length > 0
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: seo.faqs.map((f) => ({
          "@type": "Question",
          name: f.pregunta,
          acceptedAnswer: {
            "@type": "Answer",
            text: f.respuesta,
          },
        })),
      }
    : null;

  const jsonLdPayload = faqLd
    ? [productLd, breadcrumbLd, faqLd]
    : [productLd, breadcrumbLd];

  const descripcionVisible = seo?.intro
    ? seo.intro.split(/\n{2,}/)[0]?.trim() || producto.descripcion
    : producto.descripcion;

  return (
    <div className="flex flex-col">
      <JsonLd data={jsonLdPayload} />
      <GtmEvent
        event="view_item"
        data={{
          item_id: producto.slug,
          item_name: producto.nombre,
          item_category: producto.categoria,
          value: producto.precio,
          currency: "COP",
        }}
      />
      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#F5E6D3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-sm text-[#6B6560] flex-wrap">
            <Link href="/" className="hover:text-[#8B2635] transition-colors">
              Inicio
            </Link>
            <span>/</span>
            {ocasion && (
              <>
                <Link
                  href={`/${ocasion.slug}`}
                  className="hover:text-[#8B2635] transition-colors"
                >
                  {ocasion.h1}
                </Link>
                <span>/</span>
              </>
            )}
            <Link
              href={`/categorias/${producto.categoria}`}
              className="hover:text-[#8B2635] transition-colors"
            >
              {categoria?.nombre}
            </Link>
            <span>/</span>
            <span className="text-[#2D2A26] truncate">{producto.nombre}</span>
          </nav>
        </div>
      </div>

      {/* Product Detail */}
      <section className="py-12 lg:py-20 bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
            {/* Galería */}
            <div className="relative">
              <ProductGallery
                imagen={producto.imagen}
                galeria={galeria}
                alt={producto.nombre}
              >
                {/* Badges superpuestos */}
                <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                  {producto.popular && (
                    <span className="badge badge-popular">Popular</span>
                  )}
                  {hasDiscount && (
                    <span className="badge badge-discount">
                      -{Math.round(((producto.precioAnterior! - producto.precio) / producto.precioAnterior!) * 100)}%
                    </span>
                  )}
                </div>
              </ProductGallery>
            </div>

            {/* Info */}
            <div>
              <p className="eyebrow mb-3">{categoria?.nombre}</p>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2A26] mb-4 text-balance">
                {producto.nombre}
              </h1>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-6">
                <span className="font-accent text-3xl font-bold text-[#8B2635]">
                  {formatCOP(producto.precio)}
                </span>
                {hasDiscount && (
                  <span className="font-accent text-lg text-[#6B6560] line-through">
                    {formatCOP(producto.precioAnterior!)}
                  </span>
                )}
              </div>

              {/* Editorial teaser (primer párrafo del SEO o descripcion del catálogo) */}
              <p className="text-[#6B6560] text-lg leading-relaxed mb-8 text-pretty">
                {descripcionVisible}
              </p>

              {/* Qué incluye */}
              {contenido.length > 0 && (
                <div className="mb-8 rounded-2xl border border-[#F5E6D3] bg-white p-5 sm:p-6">
                  <h2 className="font-display text-lg font-semibold text-[#2D2A26] mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#8B2635]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V21m-8.625-13.5h17.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H3.375A1.125 1.125 0 012.25 10.875v-2.25c0-.621.504-1.125 1.125-1.125z" />
                    </svg>
                    Qué incluye
                  </h2>
                  <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2.5">
                    {contenido.map((item, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm">
                        <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-[#D4A574] shrink-0" />
                        <span className="text-[#4A4540] leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tags */}
              {tagsLimpios.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-8">
                  {tagsLimpios.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-[#F5E6D3] text-[#6B6560] text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Disponibilidad */}
              <div className="flex items-center gap-2 mb-8">
                <span className={`w-2 h-2 rounded-full ${disponible ? "bg-[#4A7C59]" : "bg-[#D4A574]"}`} />
                <span className="text-sm text-[#6B6560]">
                  {disponible ? "Disponible para entrega" : "Disponible bajo pedido"}
                </span>
              </div>

              {/* CTA */}
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href={waLink(`Hola! Quiero pedir ${producto.nombre}`)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-gtm-slug={producto.slug}
                  data-gtm-name={producto.nombre}
                  data-gtm-precio={producto.precio}
                  className="inline-flex items-center justify-center gap-2 flex-1 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold text-base px-8 py-4 rounded-full transition-all hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" />
                  </svg>
                  Pedir por WhatsApp
                </a>
              </div>

              {/* Trust */}
              <div className="mt-8 pt-8 border-t border-[#F5E6D3]">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  {TRUST.map((t) => (
                    <div key={t.label} className="flex flex-col items-center gap-2">
                      <svg className="w-6 h-6 text-[#4A7C59]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={t.d} />
                      </svg>
                      <span className="text-xs text-[#6B6560]">{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contenido editorial/SEO (intro, highlights, FAQs, etc.) */}
      {seo && <ProductSeoContent seo={seo} />}

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="py-16 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#2D2A26] mb-8">
              También te puede gustar
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((related) => (
                <ProductCard key={related.id} producto={related} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
