import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import blogData from "@/data/blog.json";
import productos from "@/data/productos.json";

interface Post {
  slug: string;
  h1: string;
  excerpt: string;
  fecha: string;
  etiqueta: string;
  heroProductSlug: string;
  items: { productoSlug: string }[];
}
const POSTS = blogData.posts as Post[];

export const metadata: Metadata = {
  title: "Blog de regalos y sorpresas",
  description:
    "Ideas y guías de regalos a domicilio en Bogotá: qué regalar a papá, mamá o tu pareja, desayunos sorpresa y detalles para cada ocasión.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: `Blog de regalos y sorpresas | ${SITE_NAME}`,
    description:
      "Ideas y guías de regalos a domicilio en Bogotá para cada ocasión.",
    url: `${SITE_URL}/blog`,
    type: "website",
  },
};

const img = (slug: string) =>
  productos.productos.find((p) => p.slug === slug)?.imagen || "";

function formatFecha(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function BlogIndexPage() {
  const blogLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `Blog de ${SITE_NAME}`,
    url: `${SITE_URL}/blog`,
    blogPost: POSTS.map((p) => ({
      "@type": "BlogPosting",
      headline: p.h1,
      url: `${SITE_URL}/blog/${p.slug}`,
      datePublished: p.fecha,
    })),
  };

  const [featured, ...rest] = POSTS;

  return (
    <div className="flex flex-col">
      <JsonLd data={blogLd} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#8B2635] to-[#6B1D2A] text-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white">Blog</span>
          </nav>
          <p className="eyebrow text-[#E2BE84] mb-3">Ideas para regalar</p>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
            Blog de regalos y sorpresas
          </h1>
          <p className="text-xl text-white/75 max-w-2xl">
            Guías cortas y prácticas para elegir el detalle perfecto, con entrega a domicilio en Bogotá.
          </p>
        </div>
      </section>

      {/* Featured */}
      {featured && (
        <section className="py-12 lg:py-16 bg-[#FDFBF7]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link
              href={`/blog/${featured.slug}`}
              className="group grid lg:grid-cols-2 gap-0 rounded-3xl overflow-hidden border border-[#F5E6D3] bg-white card-hover"
            >
              <div className="relative aspect-[16/10] lg:aspect-auto lg:min-h-[340px] img-zoom overflow-hidden">
                {img(featured.heroProductSlug) && (
                  <Image
                    src={img(featured.heroProductSlug)}
                    alt={featured.h1}
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                )}
                <span className="absolute top-4 left-4 inline-flex items-center rounded-full bg-[#8B2635] text-white px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                  {featured.etiqueta}
                </span>
              </div>
              <div className="p-8 lg:p-10 flex flex-col justify-center">
                <time className="text-sm text-[#8B2635] font-semibold uppercase tracking-wide" dateTime={featured.fecha}>
                  {formatFecha(featured.fecha)}
                </time>
                <h2 className="font-display text-2xl lg:text-4xl font-bold text-[#2D2A26] mt-3 mb-4 leading-tight group-hover:text-[#8B2635] transition-colors">
                  {featured.h1}
                </h2>
                <p className="text-[#6B6560] text-lg leading-relaxed mb-6">{featured.excerpt}</p>
                <span className="inline-flex items-center gap-2 text-[#8B2635] font-semibold">
                  Leer artículo
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </span>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* Resto */}
      <section className="pb-16 lg:pb-24 bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {rest.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col bg-white rounded-3xl overflow-hidden border border-[#F5E6D3] card-hover"
              >
                <div className="relative aspect-[16/10] img-zoom overflow-hidden">
                  {img(post.heroProductSlug) && (
                    <Image
                      src={img(post.heroProductSlug)}
                      alt={post.h1}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  )}
                  <span className="absolute top-4 left-4 inline-flex items-center rounded-full bg-white/90 text-[#8B2635] px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                    {post.etiqueta}
                  </span>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <time className="text-xs text-[#6B6560] uppercase tracking-wide" dateTime={post.fecha}>
                    {formatFecha(post.fecha)}
                  </time>
                  <h2 className="font-display text-xl font-bold text-[#2D2A26] mt-2 mb-3 leading-snug group-hover:text-[#8B2635] transition-colors">
                    {post.h1}
                  </h2>
                  <p className="text-sm text-[#6B6560] leading-relaxed line-clamp-3">{post.excerpt}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-[#8B2635] font-semibold text-sm">
                    Leer más
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
