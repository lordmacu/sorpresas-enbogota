import { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, waLink } from "@/lib/site";

const TITLE = "Preguntas frecuentes sobre regalos a domicilio en Bogotá";
const DESCRIPTION =
  "Resolvemos tus dudas sobre entregas, pagos, personalización y cobertura de regalos, flores y desayunos sorpresa a domicilio en Bogotá.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/preguntas-frecuentes" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: `${SITE_URL}/preguntas-frecuentes`, type: "website" },
};

const FAQ = [
  ["¿Hacen entregas el mismo día en Bogotá?", "Sí. Si realizas tu pedido en la mañana, normalmente podemos entregar el mismo día en Bogotá. Para horas específicas (por ejemplo, un desayuno antes de las 7 a. m.) te recomendamos coordinar con al menos un día de anticipación por WhatsApp."],
  ["¿En qué zonas de Bogotá entregan?", "Cubrimos toda Bogotá y sus alrededores. Algunas zonas alejadas pueden tener un costo de domicilio adicional que te confirmamos antes de cerrar el pedido. Puedes ver la cobertura por barrio en nuestra página de zonas."],
  ["¿Cómo hago un pedido?", "Elige el regalo que más te guste, haz clic en \"Pedir por WhatsApp\" y confirma fecha, hora y dirección de entrega junto con tu mensaje. Te guiamos en cada paso; no necesitas registrarte ni llenar formularios largos."],
  ["¿Cuáles son los medios de pago?", "Aceptamos transferencia bancaria, pago con tarjeta y efectivo según el caso. Te indicamos las opciones disponibles al confirmar tu pedido por WhatsApp."],
  ["¿Puedo programar la entrega para una fecha futura?", "Sí. Puedes agendar tu regalo para el día y la franja horaria que prefieras; lo confirmamos contigo al hacer el pedido. Para fechas de alta demanda (Día de la Madre, San Valentín) te recomendamos reservar con anticipación."],
  ["¿Puedo personalizar el regalo?", "Claro. Puedes agregar fotos, globos, flores, chocolates o licores como adicionales, e incluir una tarjeta con tu mensaje sin costo adicional. Cuéntanos qué tienes en mente por WhatsApp."],
  ["¿El regalo incluye tarjeta con mensaje?", "Sí, todos nuestros regalos pueden incluir una tarjeta con tu dedicatoria sin costo adicional. Solo escríbenos el mensaje al hacer el pedido."],
  ["¿Puedo enviar el regalo como sorpresa o de forma anónima?", "Sí. Coordinamos la entrega como sorpresa e incluimos únicamente el mensaje que tú quieras en la tarjeta. La persona que recibe no necesita saber quién lo envía si así lo prefieres."],
];

export default function PreguntasFrecuentesPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Preguntas frecuentes", item: `${SITE_URL}/preguntas-frecuentes` },
    ],
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "es-CO",
    mainEntity: FAQ.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <div className="flex flex-col">
      <JsonLd data={[breadcrumbLd, faqLd]} />

      <section className="bg-gradient-to-br from-[#8B2635] to-[#6B1D2A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
            <span>/</span>
            <span className="text-white">Preguntas frecuentes</span>
          </nav>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-4 max-w-3xl">
            Preguntas frecuentes
          </h1>
          <p className="text-xl text-white/80 max-w-2xl leading-relaxed">
            Todo lo que necesitas saber sobre entregas, pagos y personalización en Bogotá.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-24 bg-[#FDFBF7]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-4">
            {FAQ.map(([q, a], i) => (
              <details key={i} className="group bg-white rounded-2xl border border-[#F5E6D3] p-5 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between cursor-pointer font-display text-lg font-semibold text-[#2D2A26]">
                  {q}
                  <svg className="w-5 h-5 text-[#8B2635] transition-transform group-open:rotate-180 shrink-0 ml-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="mt-4 text-[#6B6560] leading-relaxed">{a}</p>
              </details>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-[#6B6560] mb-6">¿No resolvimos tu duda? Escríbenos y te ayudamos.</p>
            <a href={waLink("Hola! Tengo una pregunta")} target="_blank" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold px-8 py-4 rounded-full transition-all hover:scale-105">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" /></svg>
              Escribir por WhatsApp
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
