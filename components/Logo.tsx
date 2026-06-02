import { SITE_NAME } from "@/lib/site";

interface LogoMarkProps {
  className?: string;
}

/**
 * Mark de la marca: un destello ("sorpresa") en oro sobre un disco burdeos.
 * Vectorial, mismo lenguaje que el favicon (app/icon.svg). Sin dependencia de
 * fuentes, legible a cualquier tamaño.
 */
export function LogoMark({ className = "w-10 h-10" }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={className}
      role="img"
      aria-label={`Logo de ${SITE_NAME}`}
    >
      <defs>
        <linearGradient id="logoBg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B2635" />
          <stop offset="1" stopColor="#6B1D2A" />
        </linearGradient>
        <linearGradient id="logoGold" x1="9" y1="7" x2="31" y2="33" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E9C98E" />
          <stop offset="1" stopColor="#C8903F" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="20" fill="url(#logoBg)" />
      <path
        d="M19.4 7C20.6 17 23.9 20.3 34 21.6C23.9 22.9 20.6 26.2 19.4 36.2C18.2 26.2 14.9 22.9 4.8 21.6C14.9 20.3 18.2 17 19.4 7Z"
        fill="url(#logoGold)"
      />
      <path
        d="M29 7.5C29.4 10.1 29.9 10.6 32.5 11C29.9 11.4 29.4 11.9 29 14.5C28.6 11.9 28.1 11.4 25.5 11C28.1 10.6 28.6 10.1 29 7.5Z"
        fill="#F5E6D3"
      />
    </svg>
  );
}

/** Lockup completo: mark + nombre de la marca en serif. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <LogoMark className="w-10 h-10 shrink-0" />
      <span className="font-display text-xl lg:text-2xl font-semibold text-[#2D2A26]">
        {SITE_NAME}
      </span>
    </span>
  );
}
