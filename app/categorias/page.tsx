import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import categorias from "@/data/categorias.json";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "Todas las categorías",
  description:
    "Explora todas nuestras categorías de regalos y sorpresas en Bogotá: desayunos sorpresa, ramos de flores, anchetas, cajas mágicas, detalles para cada ocasión y más.",
  alternates: { canonical: "/categorias" },
  openGraph: {
    title: `Todas las categorías | ${SITE_NAME}`,
    description:
      "Explora todas nuestras categorías de regalos y sorpresas en Bogotá.",
    url: `${SITE_URL}/categorias`,
    type: "website",
  },
};

export default function CategoriasIndexPage() {
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Todas las categorías",
    url: `${SITE_URL}/categorias`,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: categorias.categorias.length,
      itemListElement: categorias.categorias.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.nombre,
        url: `${SITE_URL}/categorias/${c.slug}`,
      })),
    },
  };

  return (
    <div className="flex flex-col">
      <JsonLd data={itemListLd} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#8B2635] to-[#6B1D2A] text-white py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/" className="hover:text-white transition-colors">
              Inicio
            </Link>
            <span>/</span>
            <span className="text-white">Categorías</span>
          </nav>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold mb-4">
            Todas las categorías
          </h1>
          <p className="text-xl text-white/70 max-w-2xl">
            {categorias.categorias.length} colecciones de regalos y sorpresas
            para cada momento especial en Bogotá.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="py-16 lg:py-24 bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
            {categorias.categorias.map((categoria) => (
              <Link
                key={categoria.id}
                href={`/categorias/${categoria.slug}`}
                className="group block bg-white rounded-2xl overflow-hidden border border-[#F5E6D3] card-hover"
              >
                <div className="relative aspect-[4/3] bg-[#F5E6D3]/30 img-zoom overflow-hidden">
                  {categoria.imagen ? (
                    <Image
                      src={categoria.imagen}
                      alt={`Categoría ${categoria.nombre}`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-12 h-12 text-[#D4A574]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.545l-7.393-5.943a2 2 0 01-.54-2.022m-8.13 9.522l8.13-5.523a2 2 0 012.022.54L12 10.5M12 21.5V10m0 0L7.5 7M12 10l4.5 3" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h2 className="font-display text-lg font-semibold text-[#2D2A26] group-hover:text-[#8B2635] transition-colors line-clamp-1">
                    {categoria.nombre}
                  </h2>
                  <p className="text-sm text-[#6B6560] mt-1 line-clamp-2">
                    {categoria.descripcion}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
