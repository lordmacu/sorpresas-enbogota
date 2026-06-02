import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import config from "@/data/config.json";
import testimonios from "@/data/testimonios.json";

export const viewport: Viewport = {
  themeColor: "#8B2635",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} | Flores, Desayunos y Regalos a Domicilio en Bogotá`,
    template: `%s | ${SITE_NAME} Bogotá`,
  },
  description:
    "Flores y sorpresas premium en Bogotá. Ramos de rosas, cajas de regalo, canastas gourmet y experiencias únicas. Entrega en Bogotá. WhatsApp: +57 315 464 5370",
  keywords: [
    "flores Bogotá",
    "regalos Bogotá",
    "sorpresas Bogotá",
    "ramos de flores",
    "florería Bogotá",
    "regalos para mamá",
    "regalos para papá",
    "cajas de regalo",
    "entregar flores Bogotá",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: `${SITE_NAME} | Flores, Desayunos y Regalos a Domicilio en Bogotá`,
    description:
      "Ramos de rosas, cajas de regalo, canastas gourmet y experiencias únicas. Entrega en Bogotá.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "es_CO",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | Flores, Desayunos y Regalos a Domicilio en Bogotá`,
    description:
      "Ramos de rosas, cajas de regalo, canastas gourmet y experiencias únicas.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Reseñas reales (data/testimonios.json) → AggregateRating + Review en el schema
// del negocio. Pueden producir estrellas en los resultados de búsqueda.
const reviews = testimonios.testimonios;
const avgRating = (
  reviews.reduce((sum, t) => sum + t.rating, 0) / reviews.length
).toFixed(1);

// Localidades de Bogotá que cubrimos (refuerza el SEO local / area served).
const LOCALIDADES = [
  "Usaquén", "Chapinero", "Suba", "Engativá", "Fontibón",
  "Kennedy", "Teusaquillo", "Barrios Unidos", "Puente Aranda",
];

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Store",
  "@id": `${SITE_URL}/#store`,
  inLanguage: "es-CO",
  name: SITE_NAME,
  url: SITE_URL,
  image: `${SITE_URL}/opengraph-image`,
  logo: `${SITE_URL}/icon.svg`,
  description: config.descripcion,
  slogan: config.tagline,
  address: {
    "@type": "PostalAddress",
    addressLocality: "Bogotá",
    addressRegion: "Bogotá D.C.",
    addressCountry: "CO",
  },
  geo: { "@type": "GeoCoordinates", latitude: 4.711, longitude: -74.0721 },
  hasMap: "https://www.google.com/maps/place/Bogot%C3%A1",
  areaServed: [
    { "@type": "City", name: "Bogotá" },
    ...LOCALIDADES.map((n) => ({ "@type": "AdministrativeArea", name: n })),
  ],
  priceRange: "$$",
  currenciesAccepted: "COP",
  paymentAccepted: "Efectivo, Transferencia bancaria, Tarjeta",
  telephone: `+57${config.whatsapp}`,
  email: config.email,
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "08:00",
      closes: "19:00",
    },
  ],
  sameAs: [
    `https://instagram.com/${config.instagram}`,
    `https://facebook.com/${config.facebook}`,
  ],
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
    reviewRating: {
      "@type": "Rating",
      ratingValue: t.rating,
      bestRating: 5,
      worstRating: 1,
    },
  })),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      {/* suppressHydrationWarning: extensiones del navegador (ColorZilla, Grammarly…)
          inyectan atributos en <body> antes de que React hidrate. Esto evita el
          warning de hydration mismatch por ese atributo; no oculta errores reales
          del árbol de componentes. */}
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <JsonLd data={organizationLd} />
        <Header whatsapp={config.whatsapp} />
        <main className="flex-1">{children}</main>
        <Footer config={config} />
        <WhatsAppFloat whatsapp={config.whatsapp} />
      </body>
    </html>
  );
}