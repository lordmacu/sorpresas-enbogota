import { SITE_URL, SITE_NAME } from "@/lib/site";
import categorias from "@/data/categorias.json";
import landings from "@/data/landings.json";
import guias from "@/data/guias.json";
import productos from "@/data/productos.json";
import config from "@/data/config.json";

/**
 * /llms.txt — resumen del sitio en Markdown para motores de IA / LLMs
 * (estándar https://llmstxt.org). Se genera desde los datos del sitio.
 */
export const dynamic = "force-static";

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

  const md = `# ${SITE_NAME} — Flores y Sorpresas a Domicilio en Bogotá

> ${config.descripcion}

${SITE_NAME} es una tienda de regalos y sorpresas a domicilio en Bogotá, Colombia. Vendemos desayunos sorpresa, ramos de flores y rosas, anchetas, fresas con chocolate, peluches, cajas mágicas y detalles para cumpleaños, aniversarios, día de la madre, amor y amistad y otras ocasiones. Los pedidos se realizan por WhatsApp y entregamos en toda Bogotá, muchas veces el mismo día.

## Datos del negocio
- Nombre: ${SITE_NAME}
- Ciudad: Bogotá, Colombia
- Pedidos por WhatsApp: +57 ${config.whatsapp}
- Horario: ${config.horario}
- Instagram: @${config.instagram}
- Cómo comprar: elige el producto en el sitio y escribe por WhatsApp para confirmar fecha, hora, dirección de entrega y mensaje personalizado.
- Entrega: domicilios en toda Bogotá; entrega el mismo día si se pide temprano.

## Páginas principales
- [Inicio](${SITE_URL})
- [Todas las categorías](${SITE_URL}/categorias)
- [Cobertura por zona en Bogotá](${SITE_URL}/cobertura-bogota)
- [Guías e ideas para regalar](${SITE_URL}/guias)
- [Cómo funciona](${SITE_URL}/como-funciona)
- [Opiniones de clientes](${SITE_URL}/opiniones)
- [Preguntas frecuentes](${SITE_URL}/preguntas-frecuentes)
- [Sobre nosotros](${SITE_URL}/nosotros)
- [Contacto](${SITE_URL}/contacto)
${landingsLista}

## Cobertura por zona en Bogotá
Entregamos regalos a domicilio en toda Bogotá. Páginas por barrio/zona:
${barriosLista}

## Guías e ideas para regalar
${guiasLista}

## Categorías
${categoriasLista}

## Productos más vendidos
${masVendidos}

## Recursos
- [Mapa del sitio (sitemap.xml)](${SITE_URL}/sitemap.xml)
`;

  return new Response(md, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
