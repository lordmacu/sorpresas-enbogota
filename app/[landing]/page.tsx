import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/ProductCard";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import landingsData from "@/data/landings.json";
import categorias from "@/data/categorias.json";
import config from "@/data/config.json";

// Solo se renderizan los slugs definidos en landings.json; cualquier otra ruta
// de un solo segmento devuelve 404 (las rutas estáticas /categorias y /producto
// tienen precedencia sobre este segmento dinámico).
export const dynamicParams = false;

interface Landing {
  slug: string;
  title: string;
  metaDescription: string;
  h1: string;
  subtitulo: string;
  ctaCategoria: string;
  categoriasFuente: string[];
  keywords: string[];
  intro: string[];
  beneficios: { titulo: string; texto: string }[];
  faq: { pregunta: string; respuesta: string }[];
  // Campos opcionales para landings de cobertura local (tipo "barrio").
  tipo?: "ocasion" | "barrio" | "urgencia";
  zonaNombre?: string;
  puntosReferencia?: string[];
}

const LANDINGS = landingsData.landings as Landing[];

// Páginas de barrio (tipo "barrio") usadas para el enlazado interno de cobertura
// local: las landings generales enlazan a todas; cada barrio enlaza a las demás.
const BARRIOS = LANDINGS.filter((l) => l.tipo === "barrio").map((l) => ({
  nombre: l.zonaNombre ?? l.h1,
  slug: l.slug,
}));

const WHATSAPP = config.whatsapp;

function getLanding(slug: string): Landing | undefined {
  return LANDINGS.find((l) => l.slug === slug);
}

export function generateStaticParams() {
  return LANDINGS.map((l) => ({ landing: l.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ landing: string }>;
}): Promise<Metadata> {
  const { landing: slug } = await params;
  const landing = getLanding(slug);
  if (!landing) return { title: "Página no encontrada" };

  return {
    title: landing.title,
    description: landing.metaDescription,
    keywords: landing.keywords,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title: landing.title,
      description: landing.metaDescription,
      url: `${SITE_URL}/${slug}`,
      type: "website",
    },
  };
}

async function loadProductos(categoriasFuente: string[], limit = 8) {
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

export default async function LandingPage({
  params,
}: {
  params: Promise<{ landing: string }>;
}) {
  const { landing: slug } = await params;
  const landing = getLanding(slug);
  if (!landing) notFound();

  const productos = await loadProductos(landing.categoriasFuente);
  const heroImagen = (productos[0]?.imagen as string) || "";
  const ctaCat = categorias.categorias.find((c) => c.slug === landing.ctaCategoria);
  const waLink = `https://wa.me/57${WHATSAPP}?text=${encodeURIComponent(
    `Hola! Quiero información sobre ${landing.h1}`
  )}`;

  const otrasCategorias = categorias.categorias
    .filter((c) => !landing.categoriasFuente.includes(c.slug))
    .slice(0, 10);

  // Otras zonas para cross-linking entre páginas de barrio.
  const otrosBarrios = BARRIOS.filter((b) => b.slug !== slug).slice(0, 11);

  // === Datos estructurados (JSON-LD) ===
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: landing.h1, item: `${SITE_URL}/${slug}` },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: landing.faq.map((f) => ({
      "@type": "Question",
      name: f.pregunta,
      acceptedAnswer: { "@type": "Answer", text: f.respuesta },
    })),
  };

  return (
    <div className="flex flex-col">
      <JsonLd data={[breadcrumbLd, faqLd]} />

      {/* Hero */}
      <section className="relative bg-gradient-to-br from-[#8B2635] to-[#6B1D2A] text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-10 w-96 h-96 bg-[#D4A574] rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white">{landing.h1}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-5">
                {landing.h1}
              </h1>
              <p className="text-xl text-white/80 leading-relaxed mb-8 max-w-xl">
                {landing.subtitulo}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a href={waLink} target="_blank" className="btn-primary bg-[#25D366] hover:bg-[#20BD5A] text-base px-8 py-4">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" />
                  </svg>
                  Pedir por WhatsApp
                </a>
                {ctaCat && (
                  <Link href={`/categorias/${ctaCat.slug}`} className="inline-flex items-center justify-center gap-2 border-2 border-white/30 hover:border-white text-white font-semibold px-8 py-4 rounded-full transition-all">
                    Ver catálogo
                  </Link>
                )}
              </div>
            </div>

            {heroImagen && (
              <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl hidden lg:block">
                <Image
                  src={heroImagen}
                  alt={landing.h1}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 0px, 50vw"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Intro (contenido único SEO) */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          {landing.intro.map((parrafo, i) => (
            <p key={i} className="text-lg text-[#6B6560] leading-relaxed">
              {parrafo}
            </p>
          ))}
        </div>
      </section>

      {/* Beneficios */}
      <section className="pb-4 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {landing.beneficios.map((b) => (
              <div key={b.titulo} className="rounded-2xl border border-[#F5E6D3] bg-[#FDFBF7] p-6">
                <div className="w-10 h-10 rounded-full bg-[#8B2635]/10 flex items-center justify-center mb-4">
                  <svg className="w-5 h-5 text-[#8B2635]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="font-display text-lg font-semibold text-[#2D2A26] mb-1">{b.titulo}</h3>
                <p className="text-sm text-[#6B6560] leading-relaxed">{b.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Productos */}
      {productos.length > 0 && (
        <section className="py-16 lg:py-24 bg-[#FDFBF7]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-10">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#2D2A26]">
                Los favoritos para regalar
              </h2>
              {ctaCat && (
                <Link href={`/categorias/${ctaCat.slug}`} className="text-[#8B2635] font-semibold hover:underline flex items-center gap-2">
                  Ver todo
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {productos.map((producto) => (
                // @ts-expect-error productos provienen del JSON con campos extra
                <ProductCard key={producto.id as string} producto={producto} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Cómo funciona */}
      <section className="py-16 lg:py-20 bg-[#8B2635] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center mb-12">¿Cómo funciona?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              ["1", "Elige tu regalo", "Explora el catálogo y escoge el detalle perfecto para la ocasión."],
              ["2", "Escríbenos por WhatsApp", "Confirma dirección, fecha, hora de entrega y tu mensaje personalizado."],
              ["3", "Sorpréndelos", "Entregamos en Bogotá con empaque premium. Tú disfrutas su reacción."],
            ].map(([n, t, d]) => (
              <div key={n} className="text-center">
                <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-white/10 flex items-center justify-center font-display text-xl font-bold text-[#D4A574]">{n}</div>
                <h3 className="font-display text-xl font-semibold mb-2">{t}</h3>
                <p className="text-white/70 text-sm leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cobertura local (SEO local + enlazado interno entre barrios) */}
      <section className="py-14 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {landing.tipo === "barrio" ? (
            <>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#2D2A26] mb-3">
                Cobertura en {landing.zonaNombre}
              </h2>
              <p className="text-[#6B6560] mb-6">
                Entregamos tu sorpresa en {landing.zonaNombre} y sus alrededores, incluyendo:
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-10">
                {(landing.puntosReferencia ?? []).map((z) => (
                  <span key={z} className="px-4 py-2 rounded-full bg-[#F5E6D3]/60 text-[#6B6560] text-sm font-medium">
                    {z}
                  </span>
                ))}
              </div>
              {otrosBarrios.length > 0 && (
                <>
                  <p className="text-[#6B6560] mb-4 text-sm">
                    También entregamos en otras zonas de Bogotá:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {otrosBarrios.map((b) => (
                      <Link
                        key={b.slug}
                        href={`/${b.slug}`}
                        className="px-4 py-2 rounded-full border border-[#F5E6D3] text-[#6B6560] hover:border-[#8B2635] hover:text-[#8B2635] transition-colors text-sm font-medium"
                      >
                        {b.nombre}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#2D2A26] mb-3">
                Entregamos en toda Bogotá
              </h2>
              <p className="text-[#6B6560] mb-6">
                Llevamos tu sorpresa a cualquier zona de la ciudad. Mira nuestra cobertura por barrio:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {BARRIOS.map((b) => (
                  <Link
                    key={b.slug}
                    href={`/${b.slug}`}
                    className="px-4 py-2 rounded-full bg-[#F5E6D3]/60 text-[#6B6560] hover:bg-[#8B2635] hover:text-white transition-colors text-sm font-medium"
                  >
                    {b.nombre}
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 lg:py-24 bg-[#FDFBF7]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#2D2A26] text-center mb-10">
            Preguntas frecuentes
          </h2>
          <div className="space-y-4">
            {landing.faq.map((item, i) => (
              <details key={i} className="group bg-white rounded-2xl border border-[#F5E6D3] p-5 [&_summary::-webkit-details-marker]:hidden">
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

      {/* Enlaces internos a otras categorías */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold text-[#2D2A26] mb-6 text-center">
            Explora más categorías
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {otrasCategorias.map((cat) => (
              <Link key={cat.id} href={`/categorias/${cat.slug}`} className="px-5 py-2 rounded-full border-2 border-[#F5E6D3] text-[#6B6560] hover:border-[#8B2635] hover:text-[#8B2635] transition-colors font-medium text-sm">
                {cat.nombre}
              </Link>
            ))}
            <Link href="/categorias" className="px-5 py-2 rounded-full bg-[#8B2635] text-white font-medium text-sm">
              Ver todas →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="py-16 lg:py-20 bg-gradient-to-br from-[#2D2A26] to-[#3D3A36] text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-5">
            ¿Listo para sorprender?
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Escríbenos por WhatsApp y coordinamos tu entrega en Bogotá hoy mismo.
          </p>
          <a href={waLink} target="_blank" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold px-8 py-4 rounded-full transition-all hover:scale-105">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" />
            </svg>
            Hacer mi pedido
          </a>
        </div>
      </section>
    </div>
  );
}
