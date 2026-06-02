"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoMark } from "@/components/Logo";
import { SITE_NAME } from "@/lib/site";

interface HeaderProps {
  whatsapp: string;
}

// Categorías destacadas en la barra de navegación. Etiquetas cortas y curadas
// (los nombres reales del catálogo son largos, p. ej. "Anchetas de Cumpleaños").
const NAV_CATEGORIAS = [
  { label: "Desayunos", slug: "desayunos-sorpresas" },
  { label: "Flores", slug: "flores-rosas" },
  { label: "Amor", slug: "amor" },
  { label: "Cumpleaños", slug: "anchetas-de-cumpleanos" },
  { label: "Fresas", slug: "fresas-con-chocolate" },
];

export function Header({ whatsapp }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-[#F5E6D3]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0" aria-label={SITE_NAME}>
            <LogoMark className="w-10 h-10 shrink-0" />
            <span className="font-display text-xl lg:text-2xl font-semibold text-[#2D2A26]">
              {SITE_NAME}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            <Link href="/" className="nav-link px-3 py-2">
              Inicio
            </Link>

            {NAV_CATEGORIAS.map((cat) => (
              <Link
                key={cat.slug}
                href={`/categorias/${cat.slug}`}
                className="nav-link px-3 py-2 whitespace-nowrap"
              >
                {cat.label}
              </Link>
            ))}

            <Link href="/categorias" className="nav-link px-3 py-2">
              Categorías
            </Link>

            <Link href="/blog" className="nav-link px-3 py-2">
              Blog
            </Link>

            <Link href="/cobertura-bogota" className="nav-link px-3 py-2">
              Cobertura
            </Link>

            <Link
              href="/categorias/promociones"
              className="nav-link px-3 py-2 text-[#8B2635] font-semibold"
            >
              Ofertas
            </Link>
          </nav>

          {/* CTA + Mobile Menu Button */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={`https://wa.me/57${whatsapp}?text=Hola!%20Quiero%20hacer%20un%20pedido`}
              target="_blank"
              className="hidden sm:inline-flex btn-primary text-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" />
              </svg>
              WhatsApp
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 text-[#2D2A26]"
              aria-label="Menú"
            >
              {isMenuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav className="lg:hidden py-4 border-t border-[#F5E6D3]">
            <div className="flex flex-col gap-1">
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className="py-3 px-2 text-[#2D2A26] font-medium hover:text-[#8B2635]"
              >
                Inicio
              </Link>

              {NAV_CATEGORIAS.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/categorias/${cat.slug}`}
                  onClick={() => setIsMenuOpen(false)}
                  className="py-3 px-2 text-[#2D2A26] font-medium hover:text-[#8B2635]"
                >
                  {cat.label}
                </Link>
              ))}

              <Link
                href="/categorias"
                onClick={() => setIsMenuOpen(false)}
                className="py-3 px-2 text-[#2D2A26] font-medium hover:text-[#8B2635]"
              >
                Ver todas las categorías
              </Link>

              <Link
                href="/blog"
                onClick={() => setIsMenuOpen(false)}
                className="py-3 px-2 text-[#2D2A26] font-medium hover:text-[#8B2635]"
              >
                Blog
              </Link>

              <Link
                href="/cobertura-bogota"
                onClick={() => setIsMenuOpen(false)}
                className="py-3 px-2 text-[#2D2A26] font-medium hover:text-[#8B2635]"
              >
                Cobertura en Bogotá
              </Link>

              <Link
                href="/categorias/promociones"
                onClick={() => setIsMenuOpen(false)}
                className="py-3 px-2 text-[#8B2635] font-semibold mt-2 border-t border-[#F5E6D3] pt-4"
              >
                Ofertas
              </Link>

              <Link
                href={`https://wa.me/57${whatsapp}`}
                target="_blank"
                className="btn-primary w-fit mt-4"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" />
                </svg>
                Pedir por WhatsApp
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
