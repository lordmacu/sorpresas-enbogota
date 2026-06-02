import Link from "next/link";

interface LegalLayoutProps {
  titulo: string;
  actualizado: string;
  children: React.ReactNode;
}

/** Layout compartido para páginas legales (privacidad, términos). */
export function LegalLayout({ titulo, actualizado, children }: LegalLayoutProps) {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="bg-gradient-to-br from-[#8B2635] to-[#6B1D2A] text-white py-14 lg:py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-6">
            <Link href="/" className="hover:text-white transition-colors">
              Inicio
            </Link>
            <span>/</span>
            <span className="text-white">{titulo}</span>
          </nav>
          <h1 className="font-display text-4xl sm:text-5xl font-bold mb-3">
            {titulo}
          </h1>
          <p className="text-white/70 text-sm">
            Última actualización: {actualizado}
          </p>
        </div>
      </section>

      {/* Contenido */}
      <section className="py-14 lg:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 legal-prose">
          {children}
        </div>
      </section>
    </div>
  );
}
