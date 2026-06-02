import { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME, waLink } from "@/lib/site";
import config from "@/data/config.json";

const TITLE = "Contacto: pide tu regalo a domicilio en Bogotá";
const DESCRIPTION =
  "Contáctanos para enviar regalos, flores y desayunos sorpresa a domicilio en Bogotá. Atención por WhatsApp, horario y cobertura. Te respondemos rápido.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/contacto" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/contacto`, type: "website" },
};

export default function ContactoPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Contacto", item: `${SITE_URL}/contacto` },
    ],
  };
  const contactLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: TITLE,
    url: `${SITE_URL}/contacto`,
    mainEntity: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      email: config.email,
      telephone: `+57${config.whatsapp}`,
      areaServed: { "@type": "City", name: "Bogotá" },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: `+57${config.whatsapp}`,
        availableLanguage: "Spanish",
      },
    },
  };

  const items = [
    {
      titulo: "WhatsApp",
      valor: `+57 ${config.whatsapp}`,
      desc: "La forma más rápida de pedir. Te respondemos y coordinamos tu entrega.",
      href: waLink("Hola! Quiero hacer un pedido"),
    },
    {
      titulo: "Correo",
      valor: config.email,
      desc: "Para consultas, pedidos corporativos o alianzas.",
      href: `mailto:${config.email}`,
    },
    {
      titulo: "Instagram",
      valor: `@${config.instagram}`,
      desc: "Mira ideas, novedades y sorpresas reales que hemos entregado.",
      href: `https://instagram.com/${config.instagram}`,
    },
  ];

  return (
    <div className="flex flex-col">
      <JsonLd data={[breadcrumbLd, contactLd]} />

      <section className="bg-gradient-to-br from-[#8B2635] to-[#6B1D2A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white">Contacto</span>
          </nav>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4 max-w-3xl">Hablemos</h1>
          <p className="text-xl text-white/80 max-w-2xl leading-relaxed">
            Estamos para ayudarte a elegir el regalo perfecto y entregarlo donde lo necesites en Bogotá.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {items.map((it) => (
              <a
                key={it.titulo}
                href={it.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-2xl border border-[#F5E6D3] bg-[#FDFBF7] p-6 card-hover"
              >
                <h2 className="font-display text-lg font-semibold text-[#2D2A26] mb-1">{it.titulo}</h2>
                <p className="text-[#8B2635] font-semibold mb-2">{it.valor}</p>
                <p className="text-sm text-[#6B6560] leading-relaxed">{it.desc}</p>
              </a>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-[#F5E6D3] p-6">
              <h2 className="font-display text-lg font-semibold text-[#2D2A26] mb-2">Horario de atención</h2>
              <p className="text-[#6B6560]">{config.horario}</p>
            </div>
            <div className="rounded-2xl border border-[#F5E6D3] p-6">
              <h2 className="font-display text-lg font-semibold text-[#2D2A26] mb-2">Cobertura</h2>
              <p className="text-[#6B6560]">
                Entregamos en toda Bogotá.{" "}
                <Link href="/cobertura-bogota" className="text-[#8B2635] font-semibold hover:underline">
                  Mira las zonas →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
