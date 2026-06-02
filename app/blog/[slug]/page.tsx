import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME, formatCOP, waLink } from "@/lib/site";
import blogData from "@/data/blog.json";
import productos from "@/data/productos.json";
import categorias from "@/data/categorias.json";

export const dynamicParams = false;

interface BlogItem {
  titulo: string;
  texto: string;
  productoSlug: string;
  ctaCategoria: string;
  ctaTexto: string;
}
interface Post {
  slug: string;
  metaTitle: string;
  h1: string;
  metaDescription: string;
  excerpt: string;
  fecha: string;
  etiqueta: string;
  heroProductSlug: string;
  lead: string;
  intro: string[];
  items: BlogItem[];
  cierre: string[];
  faq: { pregunta: string; respuesta: string }[];
  categoriasRelacionadas: string[];
}

const POSTS = blogData.posts as Post[];
const getPost = (slug: string) => POSTS.find((p) => p.slug === slug);
const getProducto = (slug: string) =>
  productos.productos.find((p) => p.slug === slug);
const getCategoria = (slug: string) =>
  categorias.categorias.find((c) => c.slug === slug);

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Artículo no encontrado" };

  const img = getProducto(post.heroProductSlug)?.imagen;
  return {
    title: post.metaTitle,
    description: post.metaDescription,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: {
      title: post.metaTitle,
      description: post.metaDescription,
      url: `${SITE_URL}/blog/${slug}`,
      type: "article",
      publishedTime: post.fecha,
      images: img ? [{ url: img }] : undefined,
    },
  };
}

function WhatsAppIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" />
    </svg>
  );
}

function ItemBlock({ item, n, postH1 }: { item: BlogItem; n: number; postH1: string }) {
  const prod = getProducto(item.productoSlug);
  return (
    <div className="rounded-3xl border border-[#F5E6D3] bg-white overflow-hidden card-hover">
      <div className="grid sm:grid-cols-[1.45fr_1fr]">
        <div className="p-6 sm:p-8 order-2 sm:order-1 flex flex-col">
          <div className="flex items-start gap-3 mb-3">
            <span className="shrink-0 w-9 h-9 rounded-full bg-[#8B2635] text-white font-display font-bold flex items-center justify-center">
              {n}
            </span>
            <h2 className="font-display text-xl sm:text-2xl font-bold text-[#2D2A26] leading-snug">
              {item.titulo}
            </h2>
          </div>
          <p className="text-[#6B6560] leading-relaxed mb-5">{item.texto}</p>

          <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-3">
            {prod && (
              <span className="price price-current text-xl">{formatCOP(prod.precio)}</span>
            )}
            <a
              href={waLink(
                `Hola! Vengo del blog "${postH1}" y quiero pedir ${prod?.nombre ?? item.titulo}`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold text-sm px-5 py-2.5 rounded-full transition-all hover:-translate-y-0.5"
            >
              <WhatsAppIcon className="w-4 h-4" />
              Pedir por WhatsApp
            </a>
            <Link
              href={prod ? `/producto/${prod.slug}` : `/categorias/${item.ctaCategoria}`}
              className="text-[#8B2635] font-semibold text-sm hover:underline"
            >
              {prod ? "Ver en la tienda →" : `${item.ctaTexto} →`}
            </Link>
          </div>
        </div>

        <Link
          href={prod ? `/producto/${prod.slug}` : `/categorias/${item.ctaCategoria}`}
          className="relative block order-1 sm:order-2 aspect-[4/3] sm:aspect-auto sm:min-h-[230px] bg-[#F5E6D3]/30 img-zoom overflow-hidden"
        >
          {prod?.imagen && (
            <Image
              src={prod.imagen}
              alt={prod.nombre}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 40vw"
            />
          )}
        </Link>
      </div>
    </div>
  );
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const heroProd = getProducto(post.heroProductSlug) || getProducto(post.items[0]?.productoSlug);
  const heroImagen = heroProd?.imagen;
  const cats = post.categoriasRelacionadas
    .map(getCategoria)
    .filter((c): c is NonNullable<typeof c> => Boolean(c));
  const otros = POSTS.filter((p) => p.slug !== slug).slice(0, 3);

  // === JSON-LD ===
  const blogLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.h1,
    description: post.metaDescription,
    image: heroImagen ? `${SITE_URL}${heroImagen}` : undefined,
    datePublished: post.fecha,
    dateModified: post.fecha,
    author: { "@type": "Organization", name: SITE_NAME },
    publisher: { "@type": "Organization", name: SITE_NAME },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${slug}` },
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.h1, item: `${SITE_URL}/blog/${slug}` },
    ],
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: post.h1,
    itemListElement: post.items.map((it, i) => {
      const prod = getProducto(it.productoSlug);
      return {
        "@type": "ListItem",
        position: i + 1,
        name: prod?.nombre ?? it.titulo,
        url: prod ? `${SITE_URL}/producto/${prod.slug}` : `${SITE_URL}/categorias/${it.ctaCategoria}`,
      };
    }),
  };
  const faqLd =
    post.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faq.map((f) => ({
            "@type": "Question",
            name: f.pregunta,
            acceptedAnswer: { "@type": "Answer", text: f.respuesta },
          })),
        }
      : null;

  return (
    <div className="flex flex-col">
      <JsonLd data={[blogLd, breadcrumbLd, itemListLd, ...(faqLd ? [faqLd] : [])]} />

      {/* Hero */}
      <section className="relative bg-[#2D2A26] text-white overflow-hidden">
        {heroImagen && (
          <div className="absolute inset-0">
            <Image src={heroImagen} alt={post.h1} fill priority className="object-cover opacity-30" sizes="100vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2D2A26] via-[#2D2A26]/85 to-[#2D2A26]/45" />
          </div>
        )}
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <span>/</span>
            <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
          </nav>
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center rounded-full bg-[#8B2635] px-3 py-1 text-xs font-semibold uppercase tracking-wide">
              {post.etiqueta}
            </span>
            <time className="text-sm text-[#E2BE84]" dateTime={post.fecha}>
              {formatFecha(post.fecha)}
            </time>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-balance">
            {post.h1}
          </h1>
          <p className="text-lg text-white/75 mt-4 max-w-2xl text-pretty">{post.excerpt}</p>
        </div>
      </section>

      {/* Cuerpo */}
      <article className="py-14 lg:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-xl text-[#2D2A26] leading-relaxed font-medium mb-8">{post.lead}</p>
          <div className="space-y-4 mb-4">
            {post.intro.map((p, i) => (
              <p key={i} className="text-lg text-[#6B6560] leading-relaxed">{p}</p>
            ))}
          </div>

          {/* Listicle con CTA de compra por ítem */}
          <div className="space-y-6 mt-10">
            {post.items.map((item, i) => (
              <div key={item.titulo}>
                <ItemBlock item={item} n={i + 1} postH1={post.h1} />
                {i === 2 && (
                  <div className="my-6 rounded-3xl bg-[#8B2635] text-white px-6 py-7 sm:px-8 text-center bg-grain relative overflow-hidden">
                    <div className="absolute -bottom-16 -right-10 w-56 h-56 bg-[#D4A574]/20 rounded-full blur-3xl" />
                    <p className="relative font-display text-xl sm:text-2xl font-bold mb-2">
                      ¿Ya tienes tu favorito?
                    </p>
                    <p className="relative text-white/80 text-sm mb-5 max-w-md mx-auto">
                      Te ayudamos a elegir y coordinamos la entrega hoy mismo en Bogotá.
                    </p>
                    <a
                      href={waLink(`Hola! Estoy leyendo "${post.h1}" y quiero ayuda para elegir un regalo`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="relative inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold px-6 py-3 rounded-full transition-all hover:scale-105"
                    >
                      <WhatsAppIcon />
                      Escríbenos por WhatsApp
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Cierre */}
          <div className="space-y-4 mt-10">
            {post.cierre.map((p, i) => (
              <p key={i} className="text-lg text-[#6B6560] leading-relaxed">{p}</p>
            ))}
          </div>

          {/* CTA final */}
          <div className="mt-12 rounded-3xl bg-[#FDFBF7] border border-[#F5E6D3] p-8 text-center">
            <p className="eyebrow mb-3">Pide hoy</p>
            <h2 className="font-display text-2xl font-bold text-[#2D2A26] mb-3">
              Hagamos realidad la sorpresa
            </h2>
            <p className="text-[#6B6560] mb-6 max-w-md mx-auto">
              Escríbenos por WhatsApp, elige tu detalle y coordinamos la entrega a domicilio en Bogotá.
            </p>
            <a
              href={waLink(`Hola! Vengo del blog "${post.h1}" y quiero hacer un pedido`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold px-8 py-4 rounded-full transition-all hover:scale-105"
            >
              <WhatsAppIcon />
              Pedir por WhatsApp
            </a>
          </div>
        </div>
      </article>

      {/* FAQ */}
      {post.faq.length > 0 && (
        <section className="py-14 bg-[#FDFBF7] border-t border-[#F5E6D3]">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl font-bold text-[#2D2A26] text-center mb-10">
              Preguntas frecuentes
            </h2>
            <div className="space-y-4">
              {post.faq.map((item, i) => (
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
      )}

      {/* Enlaces internos */}
      <section className="py-14 bg-white border-t border-[#F5E6D3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {cats.length > 0 && (
            <div className="mb-12">
              <h2 className="font-display text-2xl font-bold text-[#2D2A26] mb-6 text-center">
                Explora estas categorías
              </h2>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {cats.map((cat) => (
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

          {otros.length > 0 && (
            <div>
              <h2 className="font-display text-2xl font-bold text-[#2D2A26] mb-6 text-center">
                Sigue leyendo
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {otros.map((p) => (
                  <Link key={p.slug} href={`/blog/${p.slug}`} className="block bg-[#FDFBF7] rounded-2xl border border-[#F5E6D3] p-6 card-hover">
                    <span className="text-xs font-semibold text-[#8B2635] uppercase tracking-wide">{p.etiqueta}</span>
                    <h3 className="font-display text-lg font-semibold text-[#2D2A26] mt-2 mb-2 leading-snug">{p.h1}</h3>
                    <p className="text-sm text-[#6B6560] leading-relaxed">{p.excerpt}</p>
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
