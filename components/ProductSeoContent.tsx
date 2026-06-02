import type { SeoContent } from "@/lib/seo";

/**
 * Renderiza el contenido editorial/SEO generado por `prompts/producto-seo.md`.
 * Es un Server Component: todo el HTML se envía en el primer response, lo que
 * favorece SEO, GEO/AEO y accesibilidad (no depende de JS en el cliente).
 *
 * Secciones:
 *   - Intro editorial (2 párrafos)
 *   - Highlights (beneficios cortos)
 *   - Para quién es
 *   - Ocasiones
 *   - Cuidados (si aplica)
 *   - Mensajes para tarjeta
 *   - FAQs (con <details> progresivo, sin JS)
 */
export function ProductSeoContent({ seo }: { seo: SeoContent }) {
  const {
    intro,
    highlights,
    paraQuien,
    ocasiones,
    cuidados,
    mensajesTarjeta,
    faqs,
  } = seo;

  const introParrafos = intro
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <section className="bg-white border-t border-[#F5E6D3]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 space-y-14">
        {/* Intro editorial */}
        {introParrafos.length > 0 && (
          <div className="reveal-up">
            <p className="eyebrow mb-4">Sobre este detalle</p>
            <div className="font-display text-[1.35rem] sm:text-[1.5rem] leading-relaxed text-[#2D2A26] text-pretty">
              {introParrafos.map((p, i) => (
                <p key={i} className={i > 0 ? "mt-5" : undefined}>
                  {p}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Highlights */}
        {highlights.length > 0 && (
          <div className="reveal-up">
            <p className="eyebrow mb-4">Lo que hace especial este regalo</p>
            <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-3">
              {highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-3 text-[#2D2A26]">
                  <svg
                    aria-hidden="true"
                    className="w-5 h-5 mt-[3px] shrink-0 text-[#8B2635]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  <span className="text-[1.0625rem] leading-snug">{h}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Para quién */}
        {paraQuien && (
          <div className="reveal-up rounded-2xl bg-[#FDFBF7] border border-[#F5E6D3] p-6 sm:p-8">
            <p className="eyebrow mb-2">Para quién es</p>
            <p className="font-display text-xl sm:text-2xl text-[#2D2A26] leading-snug text-balance">
              {paraQuien}
            </p>
          </div>
        )}

        {/* Ocasiones */}
        {ocasiones.length > 0 && (
          <div className="reveal-up">
            <p className="eyebrow mb-4">Ocasiones ideales</p>
            <div className="flex flex-wrap gap-2">
              {ocasiones.map((o) => (
                <span
                  key={o}
                  className="px-4 py-1.5 rounded-full bg-[#F5E6D3] text-[#6B1D2A] text-sm font-medium font-accent"
                >
                  {o}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cuidados */}
        {cuidados.length > 0 && (
          <div className="reveal-up">
            <p className="eyebrow mb-4">Cuidados</p>
            <ul className="space-y-2 text-[#4A4540]">
              {cuidados.map((c, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[0.95rem] leading-relaxed">
                  <span className="mt-[8px] w-1.5 h-1.5 rounded-full bg-[#D4A574] shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mensajes para tarjeta */}
        {mensajesTarjeta.length > 0 && (
          <div className="reveal-up">
            <p className="eyebrow mb-4">Mensajes para tu tarjeta</p>
            <p className="text-sm text-[#6B6560] mb-5 text-pretty">
              Inspírate con estas dedicatorias o escríbenos la tuya por WhatsApp.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {mensajesTarjeta.map((m, i) => (
                <figure
                  key={i}
                  className="rounded-2xl border border-[#F5E6D3] bg-[#FDFBF7] p-5"
                >
                  <svg
                    aria-hidden="true"
                    className="w-5 h-5 text-[#D4A574] mb-2"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7.17 6A5.17 5.17 0 002 11.17V18h6v-6H4.83A2.34 2.34 0 017.17 9.66V6zm10 0A5.17 5.17 0 0012 11.17V18h6v-6h-3.17A2.34 2.34 0 0117.17 9.66V6z" />
                  </svg>
                  <blockquote className="font-display italic text-[#2D2A26] text-[0.95rem] leading-snug text-pretty">
                    {m}
                  </blockquote>
                </figure>
              ))}
            </div>
          </div>
        )}

        {/* FAQs */}
        {faqs.length > 0 && (
          <div className="reveal-up">
            <p className="eyebrow mb-4">Preguntas frecuentes</p>
            <div className="divide-y divide-[#F5E6D3] border-y border-[#F5E6D3]">
              {faqs.map((f, i) => (
                <details
                  key={i}
                  className="group py-5"
                  {...(i === 0 ? { open: true } : {})}
                >
                  <summary className="flex items-start justify-between gap-4 cursor-pointer list-none">
                    <h3 className="font-display text-lg sm:text-xl text-[#2D2A26] leading-snug text-balance">
                      {f.pregunta}
                    </h3>
                    <span
                      aria-hidden="true"
                      className="mt-1 w-6 h-6 rounded-full border border-[#D4A574] flex items-center justify-center text-[#8B2635] transition-transform group-open:rotate-45 shrink-0"
                    >
                      <svg
                        className="w-3 h-3"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </summary>
                  <p className="mt-3 text-[#4A4540] leading-relaxed text-pretty">
                    {f.respuesta}
                  </p>
                </details>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
