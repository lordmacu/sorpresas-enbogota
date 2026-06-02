import { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, waLink } from "@/lib/site";

const TITLE = "Cómo funciona: pide tu regalo a domicilio en Bogotá";
const DESCRIPTION =
  "Pedir un regalo a domicilio en Bogotá es muy fácil: elige el detalle, escríbenos por WhatsApp y nosotros lo entregamos con tu mensaje. Así funciona, paso a paso.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/como-funciona" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/como-funciona`, type: "website" },
};

const PASOS = [
  ["01", "Elige tu regalo", "Explora el catálogo por categoría u ocasión y escoge el detalle perfecto: desayunos sorpresa, flores, anchetas, fresas con chocolate y más."],
  ["02", "Escríbenos por WhatsApp", "Haz clic en \"Pedir por WhatsApp\" y confirma fecha, hora, dirección de entrega y el mensaje que quieres incluir en la tarjeta."],
  ["03", "Confirmamos tu pedido", "Te confirmamos disponibilidad, el valor del domicilio según tu zona y la forma de pago. Sin registros ni formularios largos."],
  ["04", "Recibe la sorpresa", "Armamos tu regalo a mano y lo entregamos con empaque premium en toda Bogotá, a la hora acordada. Tú solo disfrutas su reacción."],
];

export default function ComoFuncionaPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Cómo funciona", item: `${SITE_URL}/como-funciona` },
    ],
  };
  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "Cómo pedir un regalo a domicilio en Bogotá",
    description: DESCRIPTION,
    step: PASOS.map(([n, t, d], i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: t,
      text: d,
      url: `${SITE_URL}/como-funciona#paso-${n}`,
    })),
  };

  return (
    <div className="flex flex-col">
      <JsonLd data={[breadcrumbLd, howToLd]} />

      <section className="bg-gradient-to-br from-[#8B2635] to-[#6B1D2A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white">Cómo funciona</span>
          </nav>
          <p className="eyebrow text-[#E2BE84] mb-3">Fácil y rápido</p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4 max-w-3xl">
            Pedir tu sorpresa es muy sencillo
          </h1>
          <p className="text-xl text-white/80 max-w-2xl leading-relaxed">
            En cuatro pasos enviamos tu regalo a domicilio en toda Bogotá, coordinando todo por WhatsApp.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid sm:grid-cols-2 gap-8">
            {PASOS.map(([n, t, d]) => (
              <div key={n} id={`paso-${n}`} className="flex gap-5">
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-[#8B2635]/10 flex items-center justify-center font-display text-xl font-bold text-[#8B2635]">
                  {n}
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-[#2D2A26] mb-2">{t}</h2>
                  <p className="text-[#6B6560] leading-relaxed">{d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-14 text-center">
            <a href={waLink("Hola! Quiero hacer un pedido")} target="_blank" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold px-8 py-4 rounded-full transition-all hover:scale-105">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" /></svg>
              Hacer mi pedido
            </a>
            <p className="mt-6 text-[#6B6560]">
              ¿Tienes dudas? Lee las <Link href="/preguntas-frecuentes" className="text-[#8B2635] font-semibold hover:underline">preguntas frecuentes</Link> o mira nuestra <Link href="/cobertura-bogota" className="text-[#8B2635] font-semibold hover:underline">cobertura por zona</Link>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
