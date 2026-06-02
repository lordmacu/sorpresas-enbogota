import { Metadata } from "next";
import Link from "next/link";
import { TestimonialCard } from "@/components/TestimonialCard";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME, waLink } from "@/lib/site";
import testimonios from "@/data/testimonios.json";

const TITLE = "Opiniones de clientes: reseñas de Momentos Bogotá";
const DESCRIPTION =
  "Lee las opiniones reales de quienes han enviado regalos, flores y desayunos sorpresa con Momentos en Bogotá. Experiencias y reseñas de nuestros clientes.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/opiniones" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/opiniones`, type: "website" },
};

export default function OpinionesPage() {
  const reviews = testimonios.testimonios;
  const avgRating = (
    reviews.reduce((sum, t) => sum + t.rating, 0) / reviews.length
  ).toFixed(1);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Opiniones", item: `${SITE_URL}/opiniones` },
    ],
  };
  // Las reseñas se muestran en esta misma página → schema alineado con el contenido visible.
  const ratingLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `Regalos y sorpresas a domicilio en Bogotá — ${SITE_NAME}`,
    description: DESCRIPTION,
    brand: { "@type": "Brand", name: SITE_NAME },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: avgRating,
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    },
    review: reviews.map((t) => ({
      "@type": "Review",
      author: { "@type": "Person", name: t.nombre },
      datePublished: t.fecha,
      reviewBody: t.texto,
      reviewRating: { "@type": "Rating", ratingValue: t.rating, bestRating: 5, worstRating: 1 },
    })),
  };

  return (
    <div className="flex flex-col">
      <JsonLd data={[breadcrumbLd, ratingLd]} />

      <section className="bg-gradient-to-br from-[#8B2635] to-[#6B1D2A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white">Opiniones</span>
          </nav>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4 max-w-3xl">
            Lo que dicen nuestros clientes
          </h1>
          <div className="flex items-center gap-3 text-white/85">
            <span className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} className="w-5 h-5 text-[#E2BE84]" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.367 2.446a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.366-2.446a1 1 0 00-1.175 0l-3.366 2.446c-.784.57-1.838-.197-1.539-1.118l1.286-3.957a1 1 0 00-.363-1.118L2.07 9.394c-.783-.57-.38-1.81.588-1.81h4.163a1 1 0 00.95-.69l1.287-3.957z" />
                </svg>
              ))}
            </span>
            <span className="text-lg">{avgRating} de 5 · {reviews.length} reseñas</span>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {reviews.map((t) => (
              <TestimonialCard key={t.id} testimonio={t} />
            ))}
          </div>

          <div className="mt-14 text-center">
            <p className="text-[#6B6560] mb-6">¿Listo para vivir tu propia experiencia?</p>
            <a href={waLink("Hola! Quiero hacer un pedido")} target="_blank" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold px-8 py-4 rounded-full transition-all hover:scale-105">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" /></svg>
              Hacer mi pedido
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
