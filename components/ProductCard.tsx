import Link from "next/link";
import Image from "next/image";
import { formatCOP, waLink } from "@/lib/site";

interface Producto {
  id: string;
  nombre: string;
  slug: string;
  precio: number;
  precioAnterior: number | null;
  descripcion: string;
  imagen: string;
  tags: string[];
  popular: boolean;
  visible: boolean;
  stock: number;
  categoria: string;
}

interface ProductCardProps {
  producto: Producto;
}

export function ProductCard({ producto }: ProductCardProps) {
  const hasDiscount =
    producto.precioAnterior && producto.precioAnterior > producto.precio;

  return (
    // Contenedor relativo (no es un <a>): el enlace al detalle se "estira" sobre
    // toda la card y el botón de WhatsApp queda como hermano, no anidado.
    <div className="group relative flex flex-col bg-white rounded-2xl overflow-hidden border border-[#F5E6D3] card-hover">
      {/* Image */}
      <div className="relative aspect-[4/5] img-zoom bg-[#F5E6D3]/30 overflow-hidden">
        {producto.imagen ? (
          <Image
            src={producto.imagen}
            alt={producto.nombre}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-[#F5E6D3] flex items-center justify-center">
              <svg className="w-10 h-10 text-[#D4A574]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.545l-7.393-5.943a2 2 0 01-.54-2.022m-8.13 9.522l8.13-5.523a2 2 0 012.022.54L12 10.5M12 21.5V10m0 0L7.5 7M12 10l4.5 3" />
              </svg>
            </div>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
          {producto.popular && <span className="badge badge-popular">Popular</span>}
          {hasDiscount && (
            <span className="badge badge-discount">
              -{Math.round(((producto.precioAnterior! - producto.precio) / producto.precioAnterior!) * 100)}%
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4">
        <p className="text-xs text-[#6B6560] uppercase tracking-wide mb-1">
          {producto.categoria?.replace(/-/g, " ")}
        </p>
        {/* Enlace principal estirado sobre toda la card */}
        <h3 className="font-display text-lg font-semibold text-[#2D2A26] mb-2 group-hover:text-[#8B2635] transition-colors line-clamp-2">
          <Link
            href={`/producto/${producto.slug}`}
            className="after:absolute after:inset-0 after:content-['']"
            data-gtm-slug={producto.slug}
            data-gtm-name={producto.nombre}
            data-gtm-precio={producto.precio}
          >
            {producto.nombre}
          </Link>
        </h3>
        <p className="text-sm text-[#6B6560] line-clamp-2 mb-3">
          {producto.descripcion}
        </p>

        {/* Price */}
        <div className="flex items-center gap-2 mb-3 mt-auto">
          <span className="price price-current">{formatCOP(producto.precio)}</span>
          {hasDiscount && (
            <span className="price price-original">{formatCOP(producto.precioAnterior!)}</span>
          )}
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#6B6560]">Ver detalles →</span>
          {/* Botón de pedido rápido: hermano del enlace, con z-index por encima
              del overlay estirado para seguir siendo clicable. */}
          <a
            href={waLink(`Hola! Quiero pedir ${producto.nombre}`)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Pedir ${producto.nombre} por WhatsApp`}
            data-gtm-slug={producto.slug}
            data-gtm-name={producto.nombre}
            data-gtm-precio={producto.precio}
            className="relative z-10 p-2 rounded-full bg-[#8B2635]/10 text-[#8B2635] hover:bg-[#25D366] hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
