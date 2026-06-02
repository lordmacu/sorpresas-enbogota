import { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, waLink } from "@/lib/site";
import landings from "@/data/landings.json";

const TITLE = "Cobertura: regalos a domicilio por zona en Bogotá";
const DESCRIPTION =
  "Entregamos regalos, flores y desayunos sorpresa a domicilio en toda Bogotá. Consulta nuestra cobertura por barrio y zona, con entrega el mismo día.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/cobertura-bogota" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/cobertura-bogota`, type: "website" },
};

interface Barrio {
  slug: string;
  zonaNombre?: string;
  h1: string;
  puntosReferencia?: string[];
}

const BARRIOS = landings.landings.filter(
  (l) => (l as { tipo?: string }).tipo === "barrio"
) as unknown as Barrio[];

export default function CoberturaPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Cobertura en Bogotá", item: `${SITE_URL}/cobertura-bogota` },
    ],
  };
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Zonas de cobertura en Bogotá",
    itemListElement: BARRIOS.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/${b.slug}`,
      name: b.zonaNombre ?? b.h1,
    })),
  };

  return (
    <div className="flex flex-col">
      <JsonLd data={[breadcrumbLd, itemListLd]} />

      <section className="bg-gradient-to-br from-[#8B2635] to-[#6B1D2A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white">Cobertura en Bogotá</span>
          </nav>
          <p className="eyebrow text-[#E2BE84] mb-3">Entrega local</p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4 max-w-3xl">
            Regalos a domicilio en toda Bogotá
          </h1>
          <p className="text-xl text-white/80 max-w-2xl leading-relaxed">
            Llevamos desayunos sorpresa, flores y detalles a cada zona de la ciudad. Elige tu barrio y mira la cobertura.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {BARRIOS.map((b) => (
              <Link
                key={b.slug}
                href={`/${b.slug}`}
                className="group rounded-2xl border border-[#F5E6D3] bg-[#FDFBF7] p-6 card-hover"
              >
                <h2 className="font-display text-xl font-semibold text-[#2D2A26] mb-2 group-hover:text-[#8B2635] transition-colors">
                  {b.zonaNombre ?? b.h1}
                </h2>
                {b.puntosReferencia && b.puntosReferencia.length > 0 && (
                  <p className="text-sm text-[#6B6560] leading-relaxed">
                    {b.puntosReferencia.slice(0, 4).join(" · ")}
                  </p>
                )}
                <span className="inline-flex items-center gap-1 text-[#8B2635] font-semibold text-sm mt-4">
                  Ver zona
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-[#6B6560] mb-6">
              ¿Tu zona no aparece? Igual te ayudamos: escríbenos y confirmamos cobertura.
            </p>
            <a href={waLink("Hola! Quiero confirmar si entregan en mi zona de Bogotá")} target="_blank" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold px-8 py-4 rounded-full transition-all hover:scale-105">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" /></svg>
              Confirmar mi zona
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
