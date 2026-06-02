import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import guiasData from "@/data/guias.json";
import categorias from "@/data/categorias.json";

interface Guia {
  slug: string;
  title: string;
  h1: string;
  metaDescription: string;
  excerpt: string;
  fecha: string;
  imagenCategoria: string;
}

const GUIAS = guiasData.guias as Guia[];

const TITLE = "Guías e ideas para regalar en Bogotá";
const DESCRIPTION =
  "Ideas y guías para elegir el regalo perfecto: qué regalar en un aniversario, ideas de desayuno sorpresa, regalos de cumpleaños originales y cómo sorprender a tu pareja en Bogotá.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guias" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/guias`,
    type: "website",
  },
};

function imagenDe(slugCategoria: string): string {
  const cat = categorias.categorias.find((c) => c.slug === slugCategoria);
  return cat?.imagen || "";
}

function formatFecha(iso: string): string {
  // Evita desfases de zona horaria al parsear una fecha "YYYY-MM-DD".
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function GuiasIndexPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Guías", item: `${SITE_URL}/guias` },
    ],
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: GUIAS.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/guias/${g.slug}`,
      name: g.h1,
    })),
  };

  return (
    <div className="flex flex-col">
      <JsonLd data={[breadcrumbLd, itemListLd]} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#8B2635] to-[#6B1D2A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white">Guías</span>
          </nav>
          <p className="eyebrow text-[#E2BE84] mb-3">Ideas para regalar</p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4 max-w-3xl">
            {TITLE}
          </h1>
          <p className="text-xl text-white/80 max-w-2xl leading-relaxed">
            Consejos prácticos para elegir el detalle perfecto y enviarlo a domicilio en Bogotá.
          </p>
        </div>
      </section>

      {/* Listado de guías */}
      <section className="py-14 lg:py-20 bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {GUIAS.map((g) => {
              const img = imagenDe(g.imagenCategoria);
              return (
                <article key={g.slug} className="group bg-white rounded-3xl overflow-hidden shadow-soft card-hover border border-[#F5E6D3]">
                  <Link href={`/guias/${g.slug}`} className="block">
                    {img && (
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <Image
                          src={img}
                          alt={g.h1}
                          fill
                          className="object-cover img-zoom"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <time className="text-xs uppercase tracking-wide text-[#A39B8F]" dateTime={g.fecha}>
                        {formatFecha(g.fecha)}
                      </time>
                      <h2 className="font-display text-xl font-bold text-[#2D2A26] mt-2 mb-3 leading-snug group-hover:text-[#8B2635] transition-colors">
                        {g.h1}
                      </h2>
                      <p className="text-sm text-[#6B6560] leading-relaxed">{g.excerpt}</p>
                      <span className="inline-flex items-center gap-1 text-[#8B2635] font-semibold text-sm mt-4">
                        Leer guía
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                      </span>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
