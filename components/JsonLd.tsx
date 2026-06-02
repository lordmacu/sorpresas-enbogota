/**
 * Inyecta datos estructurados (JSON-LD) en el HTML renderizado en el servidor.
 * Es un Server Component: el <script> queda en el HTML inicial, ideal para SEO.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // El contenido es generado por nosotros a partir de datos propios.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
