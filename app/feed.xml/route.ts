import { SITE_URL, SITE_NAME } from "@/lib/site";
import productos from "@/data/productos.json";

/**
 * /feed.xml — Feed de productos para Google Merchant Center (Google Shopping).
 * Formato RSS 2.0 con el namespace g: de Google. Se genera desde productos.json,
 * así que se actualiza solo en cada deploy. Pega esta URL en Merchant Center
 * (Productos → Feeds → desde URL) y activa los listados gratuitos.
 *
 * Notas: son regalos artesanales sin GTIN/código de barras -> identifier_exists=no
 * + brand (el nombre de la tienda). El envío se configura a nivel de cuenta en
 * Merchant Center (no en el feed).
 */
export const dynamic = "force-static";

type Producto = {
  id: string;
  nombre: string;
  slug: string;
  precio: number;
  precioAnterior?: number;
  descripcion?: string;
  imagen?: string;
  categoria?: string;
  visible?: boolean;
  stock?: number;
};

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// CDATA para textos largos (título/descripción) sin pelear con caracteres especiales.
const cdata = (s: unknown) =>
  `<![CDATA[${String(s ?? "").replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

function itemXml(p: Producto): string {
  const link = `${SITE_URL}/producto/${p.slug}`;
  const image = p.imagen ? `${SITE_URL}${p.imagen}` : "";
  const hasSale = !!p.precioAnterior && p.precioAnterior > p.precio;
  const price = hasSale ? p.precioAnterior! : p.precio;
  const salePrice = hasSale ? p.precio : null;
  const desc = (p.descripcion || p.nombre || "").replace(/\s+/g, " ").trim().slice(0, 4900);

  return [
    "    <item>",
    `      <g:id>${esc(p.slug)}</g:id>`,
    `      <g:title>${cdata(p.nombre)}</g:title>`,
    `      <g:description>${cdata(desc)}</g:description>`,
    `      <g:link>${esc(link)}</g:link>`,
    image ? `      <g:image_link>${esc(image)}</g:image_link>` : "",
    "      <g:availability>in_stock</g:availability>",
    `      <g:price>${price} COP</g:price>`,
    salePrice ? `      <g:sale_price>${salePrice} COP</g:sale_price>` : "",
    "      <g:condition>new</g:condition>",
    `      <g:brand>${esc(SITE_NAME)}</g:brand>`,
    "      <g:identifier_exists>no</g:identifier_exists>",
    p.categoria ? `      <g:product_type>${esc(p.categoria)}</g:product_type>` : "",
    "    </item>",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function GET() {
  const items = (productos.productos as Producto[])
    .filter((p) => p.visible !== false && (p.stock ?? 0) > 0 && p.precio > 0)
    .map(itemXml)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${esc(SITE_NAME)}</title>
    <link>${esc(SITE_URL)}</link>
    <description>Regalos y sorpresas a domicilio en Bogotá</description>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
