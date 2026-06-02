import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/ProductCard";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME, waLink } from "@/lib/site";
import guiasData from "@/data/guias.json";
import categorias from "@/data/categorias.json";

// Solo se renderizan los slugs definidos en guias.json; cualquier otra ruta 404.
export const dynamicParams = false;

interface Seccion {
  titulo: string;
  parrafos: string[];
}

interface Guia {
  slug: string;
  title: string;
  h1: string;
  metaDescription: string;
  excerpt: string;
  fecha: string;
  imagenCategoria: string;
  categoriasRelacionadas: string[];
  lead: string;
  secciones: Seccion[];
  faq: { pregunta: string; respuesta: string }[];
}

const GUIAS = guiasData.guias as Guia[];

function getGuia(slug: string): Guia | undefined {
  return GUIAS.find((g) => g.slug === slug);
}

function imagenDe(slugCategoria: string): string {
  const cat = categorias.categorias.find((c) => c.slug === slugCategoria);
  return cat?.imagen || "";
}

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function generateStaticParams() {
  return GUIAS.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guia = getGuia(slug);
  if (!guia) return { title: "Guía no encontrada" };

  const img = imagenDe(guia.imagenCategoria);
  return {
    title: guia.title,
    description: guia.metaDescription,
    alternates: { canonical: `/guias/${slug}` },
    openGraph: {
      title: guia.title,
      description: guia.metaDescription,
      url: `${SITE_URL}/guias/${slug}`,
      type: "article",
      images: img ? [`${SITE_URL}${img}`] : undefined,
    },
  };
}

async function loadProductos(categoriasFuente: string[], limit = 4) {
  const productos: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  for (const slug of categoriasFuente) {
    try {
      const data = await import(`@/data/scraped/${slug}.json`);
      for (const p of data.productos as { slug: string }[]) {
        if (seen.has(p.slug)) continue;
        seen.add(p.slug);
        productos.push({ ...p, categoria: slug });
      }
    } catch {
      // Categoría fuente sin archivo: la omitimos.
    }
  }
  return productos.slice(0, limit);
}

export default async function GuiaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guia = getGuia(slug);
  if (!guia) notFound();

  const heroImagen = imagenDe(guia.imagenCategoria);
  const productos = await loadProductos(guia.categoriasRelacionadas);
  const catsRelacionadas = guia.categoriasRelacionadas
    .map((s) => categorias.categorias.find((c) => c.slug === s))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const otrasGuias = GUIAS.filter((g) => g.slug !== slug).slice(0, 3);

  // === Datos estructurados (JSON-LD) ===
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guia.h1,
    description: guia.metaDescription,
    image: heroImagen ? `${SITE_URL}${heroImagen}` : undefined,
    datePublished: guia.fecha,
    dateModified: guia.fecha,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/guias/${slug}` },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Guías", item: `${SITE_URL}/guias` },
      { "@type": "ListItem", position: 3, name: guia.h1, item: `${SITE_URL}/guias/${slug}` },
    ],
  };
  const faqLd =
    guia.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: guia.faq.map((f) => ({
            "@type": "Question",
            name: f.pregunta,
            acceptedAnswer: { "@type": "Answer", text: f.respuesta },
          })),
        }
      : null;

  return (
    <div className="flex flex-col">
      <JsonLd data={[articleLd, breadcrumbLd, ...(faqLd ? [faqLd] : [])]} />

      {/* Hero */}
      <section className="relative bg-[#2D2A26] text-white overflow-hidden">
        {heroImagen && (
          <div className="absolute inset-0">
            <Image src={heroImagen} alt={guia.h1} fill priority className="object-cover opacity-30" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2D2A26] via-[#2D2A26]/80 to-[#2D2A26]/40" />
          </div>
        )}
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/guias" className="hover:text-white transition-colors">Guías</Link>
          </nav>
          <time className="text-sm uppercase tracking-wide text-[#E2BE84]" dateTime={guia.fecha}>
            {formatFecha(guia.fecha)}
          </time>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mt-3">
            {guia.h1}
          </h1>
        </div>
      </section>

      {/* Cuerpo del artículo */}
      <article className="py-14 lg:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xl text-[#2D2A26] leading-relaxed font-medium mb-10">{guia.lead}</p>

          <div className="space-y-10">
            {guia.secciones.map((s) => (
              <section key={s.titulo}>
                <h2 className="font-display text-2xl font-bold text-[#2D2A26] mb-4">{s.titulo}</h2>
                <div className="space-y-4">
                  {s.parrafos.map((p, i) => (
                    <p key={i} className="text-lg text-[#6B6560] leading-relaxed">{p}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* CTA en línea */}
          <div className="mt-12 rounded-3xl bg-[#FDFBF7] border border-[#F5E6D3] p-8 text-center">
            <h2 className="font-display text-2xl font-bold text-[#2D2A26] mb-3">
              ¿Listo para sorprender?
            </h2>
            <p className="text-[#6B6560] mb-6">
              Escríbenos por WhatsApp y coordinamos tu entrega a domicilio en Bogotá hoy mismo.
            </p>
            <a href={waLink(`Hola! Vengo de la guía "${guia.h1}" y quiero hacer un pedido`)} target="_blank" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold px-8 py-4 rounded-full transition-all hover:scale-105">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" />
              </svg>
              Pedir por WhatsApp
            </a>
          </div>
        </div>
      </article>

      {/* Productos relacionados */}
      {productos.length > 0 && (
        <section className="py-16 bg-[#FDFBF7]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl font-bold text-[#2D2A26] mb-10 text-center">
              Detalles que puedes pedir hoy
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {productos.map((producto) => (
                // @ts-expect-error productos provienen del JSON con campos extra
                <ProductCard key={producto.id as string} producto={producto} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {guia.faq.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl font-bold text-[#2D2A26] text-center mb-10">
              Preguntas frecuentes
            </h2>
            <div className="space-y-4">
              {guia.faq.map((item, i) => (
                <details key={i} className="group bg-[#FDFBF7] rounded-2xl border border-[#F5E6D3] p-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex items-center justify-between cursor-pointer font-display text-lg font-semibold text-[#2D2A26]">
                    {item.pregunta}
                    <svg className="w-5 h-5 text-[#8B2635] transition-transform group-open:rotate-180 shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-4 text-[#6B6560] leading-relaxed">{item.respuesta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Enlaces internos: categorías relacionadas + otras guías */}
      <section className="py-14 bg-[#FDFBF7] border-t border-[#F5E6D3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {catsRelacionadas.length > 0 && (
            <div className="mb-12">
              <h2 className="font-display text-2xl font-bold text-[#2D2A26] mb-6 text-center">
                Explora estas categorías
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {catsRelacionadas.map((cat) => (
                  <Link key={cat.id} href={`/categorias/${cat.slug}`} className="px-5 py-2 rounded-full border-2 border-[#F5E6D3] text-[#6B6560] hover:border-[#8B2635] hover:text-[#8B2635] transition-colors font-medium text-sm">
                    {cat.nombre}
                  </Link>
                ))}
                <Link href="/categorias" className="px-5 py-2 rounded-full bg-[#8B2635] text-white font-medium text-sm">
                  Ver todas →
                </Link>
              </div>
            </div>
          )}

          {otrasGuias.length > 0 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-[#2D2A26] mb-6 text-center">
                Sigue leyendo
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {otrasGuias.map((g) => (
                  <Link key={g.slug} href={`/guias/${g.slug}`} className="block bg-white rounded-2xl border border-[#F5E6D3] p-6 card-hover">
                    <h3 className="font-display text-lg font-semibold text-[#2D2A26] mb-2 leading-snug">{g.h1}</h3>
                    <p className="text-sm text-[#6B6560] leading-relaxed">{g.excerpt}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
