"use client";

import { useState } from "react";
import Image from "next/image";

interface ProductGalleryProps {
  imagen: string;
  galeria?: string[];
  alt: string;
  children?: React.ReactNode; // badges superpuestos sobre la imagen activa
}

export function ProductGallery({ imagen, galeria = [], alt, children }: ProductGalleryProps) {
  // Imagen principal + galería, deduplicadas y sin vacíos.
  const imagenes = Array.from(new Set([imagen, ...galeria].filter(Boolean)));
  const [activa, setActiva] = useState(imagenes[0] ?? "");

  if (imagenes.length === 0) {
    return (
      <div className="relative aspect-square rounded-3xl bg-[#F5E6D3]/30 overflow-hidden flex items-center justify-center">
        <div className="w-32 h-32 rounded-full bg-[#F5E6D3] flex items-center justify-center">
          <svg className="w-16 h-16 text-[#D4A574]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 15.545l-7.393-5.943a2 2 0 01-.54-2.022m-8.13 9.522l8.13-5.523a2 2 0 012.022.54L12 10.5M12 21.5V10m0 0L7.5 7M12 10l4.5 3" />
          </svg>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square rounded-3xl bg-[#F5E6D3]/30 overflow-hidden ring-gold">
        <Image
          src={activa}
          alt={alt}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 45vw"
        />
        {children}
      </div>

      {imagenes.length > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
          {imagenes.slice(0, 10).map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setActiva(src)}
              aria-label={`Ver imagen ${i + 1}`}
              aria-pressed={activa === src}
              className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-colors ${
                activa === src
                  ? "border-[#8B2635]"
                  : "border-transparent hover:border-[#D4A574]"
              }`}
            >
              <Image src={src} alt="" fill className="object-cover" sizes="120px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
