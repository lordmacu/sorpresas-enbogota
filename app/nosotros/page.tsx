import { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME, waLink } from "@/lib/site";
import config from "@/data/config.json";

const TITLE = "Sobre nosotros: regalos y sorpresas a domicilio en Bogotá";
const DESCRIPTION =
  "Conoce a Momentos: armamos a mano desayunos sorpresa, flores y regalos, y los entregamos con amor en toda Bogotá. Nuestra historia y por qué confiar en nosotros.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/nosotros" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/nosotros`, type: "website" },
};

const VALORES = [
  ["Hecho a mano", "Cada desayuno, ramo y ancheta se arma a mano el día de la entrega, con productos frescos."],
  ["Entrega cuidada", "Empaque premium y entrega puntual en toda Bogotá, coordinada contigo por WhatsApp."],
  ["Detalle personal", "Tu mensaje, fotos y adicionales para que cada sorpresa se sienta única."],
  ["Cercanía real", "Sin formularios largos: te atendemos por chat y te acompañamos en cada paso."],
];

export default function NosotrosPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Nosotros", item: `${SITE_URL}/nosotros` },
    ],
  };
  const aboutLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    inLanguage: "es-CO",
    name: TITLE,
    url: `${SITE_URL}/nosotros`,
    mainEntity: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <div className="flex flex-col">
      <JsonLd data={[breadcrumbLd, aboutLd]} />

      <section className="bg-gradient-to-br from-[#8B2635] to-[#6B1D2A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white">Nosotros</span>
          </nav>
          <p className="eyebrow text-[#E2BE84] mb-3">{config.tagline}</p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4 max-w-3xl">
            Hacemos que cada momento se sienta especial
          </h1>
          <p className="text-xl text-white/80 max-w-2xl leading-relaxed">
            Somos {SITE_NAME}, un equipo de Bogotá apasionado por las sorpresas bien hechas.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
          <p className="text-lg text-[#6B6560] leading-relaxed">
            {SITE_NAME} nació de una idea simple: que la distancia o la falta de tiempo nunca sean una excusa para no demostrar cariño. Por eso convertimos un mensaje por WhatsApp en una sorpresa real que llega a la puerta de quien tú quieres, en cualquier rincón de Bogotá.
          </p>
          <p className="text-lg text-[#6B6560] leading-relaxed">
            Cada desayuno sorpresa, ramo de flores y ancheta se prepara a mano el mismo día de la entrega, con productos frescos y mucho cuidado en los detalles. Creemos que un buen regalo no se mide por el precio, sino por la emoción que genera al recibirlo.
          </p>
          <p className="text-lg text-[#6B6560] leading-relaxed">
            Hoy acompañamos cumpleaños, aniversarios, reconciliaciones, graduaciones y miles de "porque sí". Y lo seguimos haciendo con la misma ilusión del primer pedido.
          </p>
        </div>
      </section>

      <section className="pb-16 lg:pb-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VALORES.map(([t, d]) => (
              <div key={t} className="rounded-2xl border border-[#F5E6D3] bg-[#FDFBF7] p-6">
                <h2 className="font-display text-lg font-semibold text-[#2D2A26] mb-2">{t}</h2>
                <p className="text-sm text-[#6B6560] leading-relaxed">{d}</p>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <a href={waLink("Hola! Quiero hacer un pedido")} target="_blank" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold px-8 py-4 rounded-full transition-all hover:scale-105">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" /></svg>
              Escríbenos por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
