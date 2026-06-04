import Link from "next/link";
import configType from "@/data/config.json";
import landings from "@/data/landings.json";
import { LogoMark } from "@/components/Logo";
import { SITE_NAME } from "@/lib/site";

interface FooterProps {
  config: typeof configType;
}

// Páginas de barrio para el bloque de enlaces de cobertura local.
const BARRIOS = landings.landings
  .filter((l) => (l as { tipo?: string }).tipo === "barrio")
  .map((l) => ({ nombre: (l as { zonaNombre?: string }).zonaNombre ?? l.h1, slug: l.slug }));

export function Footer({ config }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#2D2A26] text-white">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4" aria-label={SITE_NAME}>
              <LogoMark className="w-10 h-10 shrink-0" />
              <span className="font-display text-xl font-semibold">{SITE_NAME}</span>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              {config.tagline}. Entrega flores y sorpresas premium en Bogotá con amor.
            </p>
            <div className="flex items-center gap-3">
              <a
                href={`https://instagram.com/${config.instagram}`}
                target="_blank"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#8B2635] transition-colors"
                aria-label="Instagram"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href={`https://instagram.com/${config.instagram}`}
                target="_blank"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#8B2635] transition-colors"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a
                href={`https://wa.me/57${config.whatsapp}`}
                target="_blank"
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-[#25D366] transition-colors"
                aria-label="WhatsApp"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Categorías</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/categorias/flores-rosas" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Ramos de Flores
                </Link>
              </li>
              <li>
                <Link href="/categorias/cajas-magicas" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Cajas Mágicas
                </Link>
              </li>
              <li>
                <Link href="/categorias/desayunos-sorpresas" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Desayunos Sorpresa
                </Link>
              </li>
              <li>
                <Link href="/categorias" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Ver todas las categorías
                </Link>
              </li>
            </ul>

            <h3 className="font-display text-lg font-semibold mb-4 mt-8">Más buscados</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/desayunos-sorpresa-bogota" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Desayunos sorpresa a domicilio Bogotá
                </Link>
              </li>
              <li>
                <Link href="/regalos-a-domicilio-bogota" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Regalos a domicilio en Bogotá
                </Link>
              </li>
              <li>
                <Link href="/ramos-de-flores-bogota" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Ramos de flores a domicilio Bogotá
                </Link>
              </li>
              <li>
                <Link href="/regalos-a-domicilio-mismo-dia-bogota" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Regalos el mismo día en Bogotá
                </Link>
              </li>
              <li>
                <Link href="/regalos-de-cumpleanos-bogota" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Regalos de cumpleaños
                </Link>
              </li>
              <li>
                <Link href="/regalos-de-aniversario-bogota" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Regalos de aniversario
                </Link>
              </li>
              <li>
                <Link href="/guias" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Guías e ideas para regalar
                </Link>
              </li>
              <li>
                <Link href="/blog" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Blog de regalos y sorpresas
                </Link>
              </li>
            </ul>
          </div>

          {/* Info */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Información</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-start gap-2">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {config.direccion}
              </li>
              <li className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {config.horario}
              </li>
              <li>
                <a
                  href={`https://wa.me/57${config.whatsapp}`}
                  className="flex items-center gap-2 hover:text-[#25D366] transition-colors"
                >
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  +57 {config.whatsapp}
                </a>
              </li>
            </ul>

            <h3 className="font-display text-lg font-semibold mb-4 mt-8">Empresa</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/como-funciona" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Cómo funciona
                </Link>
              </li>
              <li>
                <Link href="/nosotros" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Sobre nosotros
                </Link>
              </li>
              <li>
                <Link href="/opiniones" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Opiniones
                </Link>
              </li>
              <li>
                <Link href="/preguntas-frecuentes" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Preguntas frecuentes
                </Link>
              </li>
              <li>
                <Link href="/contacto" className="text-gray-400 hover:text-white transition-colors text-sm">
                  Contacto
                </Link>
              </li>
            </ul>
          </div>

          {/* CTA */}
          <div>
            <h3 className="font-display text-lg font-semibold mb-4">Haz tu pedido</h3>
            <p className="text-gray-400 text-sm mb-4">
              Escríbenos por WhatsApp y te ayudamos a elegir el regalo perfecto.
            </p>
            <a
              href={`https://wa.me/57${config.whatsapp}?text=Hola!%20Quiero%20hacer%20un%20pedido`}
              target="_blank"
              className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold px-5 py-3 rounded-full transition-all hover:scale-105"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" />
              </svg>
              Escribir por WhatsApp
            </a>
          </div>
        </div>

        {/* Cobertura local (enlaces SEO por barrio) */}
        {BARRIOS.length > 0 && (
          <div className="border-t border-white/10 mt-10 pt-8">
            <h3 className="font-display text-lg font-semibold mb-4">
              <Link href="/cobertura-bogota" className="hover:text-[#E2BE84] transition-colors">
                Regalos a domicilio por zona en Bogotá
              </Link>
            </h3>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {BARRIOS.map((b) => (
                <Link
                  key={b.slug}
                  href={`/${b.slug}`}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  {b.nombre}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {currentYear} {SITE_NAME} Bogotá. Todos los derechos reservados.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacidad" className="text-gray-500 hover:text-white transition-colors text-sm">
              Política de privacidad
            </Link>
            <Link href="/terminos" className="text-gray-500 hover:text-white transition-colors text-sm">
              Términos y condiciones
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}