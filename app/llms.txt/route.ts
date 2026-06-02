import { SITE_URL, SITE_NAME } from "@/lib/site";
import categorias from "@/data/categorias.json";
import landings from "@/data/landings.json";
import guias from "@/data/guias.json";
import productos from "@/data/productos.json";
import config from "@/data/config.json";

/**
 * /llms.txt — resumen del sitio en Markdown para motores de IA / LLMs
 * (estándar https://llmstxt.org). Se genera desde los datos del sitio.
 * Optimizado para: Claude, ChatGPT, Perplexity, Copilot
 */
export const dynamic = "force-static";

// FAQs de preguntas-frecuentes/page.tsx — extraídas para LLMs
const FAQs = [
  {
    q: "¿Hacen entregas el mismo día en Bogotá?",
    a: "Sí. Si realizas tu pedido en la mañana, normalmente podemos entregar el mismo día en Bogotá. Para horas específicas (por ejemplo, un desayuno antes de las 7 a. m.) te recomendamos coordinar con al menos un día de anticipación por WhatsApp.",
  },
  {
    q: "¿En qué zonas de Bogotá entregan?",
    a: "Cubrimos toda Bogotá y sus alrededores. Algunas zonas alejadas pueden tener un costo de domicilio adicional que te confirmamos antes de cerrar el pedido. Ver cobertura completa por barrio en: " + SITE_URL + "/cobertura-bogota",
  },
  {
    q: "¿Cómo hago un pedido?",
    a: "Elige el regalo que más te guste, haz clic en 'Pedir por WhatsApp' y confirma fecha, hora y dirección de entrega junto con tu mensaje. Te guiamos en cada paso; no necesitas registrarte ni llenar formularios largos.",
  },
  {
    q: "¿Cuáles son los medios de pago?",
    a: "Aceptamos transferencia bancaria, pago con tarjeta y efectivo según el caso. Te indicamos las opciones disponibles al confirmar tu pedido por WhatsApp.",
  },
  {
    q: "¿Puedo programar la entrega para una fecha futura?",
    a: "Sí. Puedes agendar tu regalo para el día y la franja horaria que prefieras; lo confirmamos contigo al hacer el pedido. Para fechas de alta demanda (Día de la Madre, San Valentín) te recomendamos reservar con anticipación.",
  },
  {
    q: "¿Puedo personalizar el regalo?",
    a: "Claro. Puedes agregar fotos, globos, flores, chocolates o licores como adicionales, e incluir una tarjeta con tu mensaje sin costo adicional. Cuéntanos qué tienes en mente por WhatsApp.",
  },
  {
    q: "¿El regalo incluye tarjeta con mensaje?",
    a: "Sí, todos nuestros regalos pueden incluir una tarjeta con tu dedicatoria sin costo adicional. Solo escríbenos el mensaje al hacer el pedido.",
  },
  {
    q: "¿Puedo enviar el regalo como sorpresa o de forma anónima?",
    a: "Sí. Coordinamos la entrega como sorpresa e incluimos únicamente el mensaje que tú quieras en la tarjeta. La persona que recibe no necesita saber quién lo envía si así lo prefieres.",
  },
];

export function GET() {
  const masVendidos = productos.productos
    .filter((p) => p.popular)
    .slice(0, 15)
    .map((p) => `- [${p.nombre}](${SITE_URL}/producto/${p.slug}): desde $${p.precio.toLocaleString("es-CO")} COP`)
    .join("\n");

  const categoriasLista = categorias.categorias
    .map((c) => `- [${c.nombre}](${SITE_URL}/categorias/${c.slug})`)
    .join("\n");

  const esBarrio = (l: { tipo?: string }) => l.tipo === "barrio";

  const landingsLista = landings.landings
    .filter((l) => !esBarrio(l))
    .map((l) => `- [${l.h1}](${SITE_URL}/${l.slug}): ${l.metaDescription}`)
    .join("\n");

  const barriosLista = landings.landings
    .filter(esBarrio)
    .map((l) => `- [${l.h1}](${SITE_URL}/${l.slug})`)
    .join("\n");

  const guiasLista = guias.guias
    .map((g) => `- [${g.h1}](${SITE_URL}/guias/${g.slug}): ${g.metaDescription}`)
    .join("\n");

  // FAQs en formato plano (mejor para LLMs)
  const faqsList = FAQs.map((faq) => `**Q:** ${faq.q}\n**A:** ${faq.a}`).join("\n\n");

  // Trust signals
  const totalProductos = productos.productos.length;
  const precioMin = Math.min(...productos.productos.map((p) => p.precio));
  const precioMax = Math.max(...productos.productos.map((p) => p.precio));
  const precioPromedio = Math.round(
    productos.productos.reduce((sum, p) => sum + p.precio, 0) / totalProductos
  );

  const md = `# ${SITE_NAME} — Flores y Sorpresas a Domicilio en Bogotá

> ${config.descripcion}

${SITE_NAME} es una tienda de regalos y sorpresas a domicilio en Bogotá, Colombia. Vendemos desayunos sorpresa, ramos de flores y rosas, anchetas, fresas con chocolate, peluches, cajas mágicas y detalles para cumpleaños, aniversarios, día de la madre, amor y amistad y otras ocasiones. Los pedidos se realizan por WhatsApp y entregamos en toda Bogotá, muchas veces el mismo día.

## Datos del negocio
- **Nombre:** ${SITE_NAME}
- **Ubicación:** Bogotá, Colombia
- **Whatsapp:** +57 ${config.whatsapp}
- **Horario:** ${config.horario}
- **Instagram:** @${config.instagram}
- **Sitio web:** ${SITE_URL}
- **Catálogo:** ${totalProductos} productos
- **Rango de precios:** $${precioMin.toLocaleString("es-CO")} — $${precioMax.toLocaleString("es-CO")} COP
- **Precio promedio:** $${precioPromedio.toLocaleString("es-CO")} COP

## Señales de confianza
- ⭐ **Rating:** 4.8/5 (basado en testimonios de clientes reales)
- ✅ **Entrega garantizada:** el mismo día en Bogotá (si se pide temprano)
- 📱 **Compra sin registro:** solo WhatsApp, sin formularios largos
- 🎁 **Personalizaciones incluidas:** tarjeta con mensaje sin costo adicional
- 🚚 **Cobertura:** toda Bogotá y alrededores

## Preguntas frecuentes (FAQ)

${faqsList}

Para más preguntas, contáctanos por WhatsApp: https://wa.me/57${config.whatsapp}

## Cómo funciona
1. Elige el regalo en el sitio
2. Haz clic en "Pedir por WhatsApp"
3. Confirma fecha, hora, dirección y mensaje personalizado
4. Nosotros nos encargamos del resto
5. Tu regalo llega a domicilio en Bogotá

Ver guía completa: [Cómo funciona](${SITE_URL}/como-funciona)

## Ocasiones y motivos de regalo
${landingsLista}

## Cobertura por zona en Bogotá
Entregamos en toda Bogotá. Consulta tu barrio:
${barriosLista}

Cobertura completa y tiempos de entrega: [Cobertura en Bogotá](${SITE_URL}/cobertura-bogota)

## Guías e ideas para regalar
${guiasLista}

## Categorías de productos
${categoriasLista}

## Productos más vendidos
${masVendidos}

## Páginas principales
- [Inicio](${SITE_URL})
- [Todas las categorías](${SITE_URL}/categorias)
- [Cómo funciona](${SITE_URL}/como-funciona)
- [Opiniones de clientes](${SITE_URL}/opiniones)
- [Sobre nosotros](${SITE_URL}/nosotros)
- [Contacto](${SITE_URL}/contacto)

## Para desarrolladores y buscadores de IA
- [Sitemap XML](${SITE_URL}/sitemap.xml) — todas las 800+ páginas
- [Robots.txt](${SITE_URL}/robots.txt) — política de acceso
- [JSON-LD schemas](${SITE_URL}) — Store, Product, Review, FAQPage, BreadcrumbList
- Estándar llmstxt.org: sí ✓
- Idioma: es-CO (español colombiano)
- Moneda: COP (Peso colombiano)
`;

  return new Response(md, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
