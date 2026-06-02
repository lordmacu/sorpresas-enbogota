import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-24 h-24 mx-auto mb-8 rounded-full bg-[#F5E6D3] flex items-center justify-center">
        <svg
          className="w-12 h-12 text-[#D4A574]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 15.545l-7.393-5.943a2 2 0 01-.54-2.022m-8.13 9.522l8.13-5.523a2 2 0 012.022.54L12 10.5M12 21.5V10m0 0L7.5 7M12 10l4.5 3"
          />
        </svg>
      </div>
      <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#2D2A26] mb-4">
        Página no encontrada
      </h1>
      <p className="text-[#6B6560] text-lg mb-8 max-w-md">
        Lo sentimos, la página que buscas no existe o fue movida.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link href="/" className="btn-primary">
          Volver al inicio
        </Link>
        <Link href="/categorias" className="btn-secondary">
          Ver productos
        </Link>
      </div>
    </div>
  );
}