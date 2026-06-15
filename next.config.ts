import type { NextConfig } from "next";

// process.cwd() (no __dirname): el config debe compilar en ESM (SWC WASM en
// Termux/Android) y CJS (SWC nativo en PC); __dirname no existe en ESM.
const projectRoot = process.cwd();

const nextConfig: NextConfig = {
  // Fija la raíz del proyecto en este directorio (sorpresas/). Evita que Next
  // infiera mal la raíz por un package-lock.json huérfano en el directorio padre.
  turbopack: {
    root: projectRoot,
  },
  // Mismo propósito para el bundler webpack (dev usa --webpack) y el file
  // tracing del build.
  outputFileTracingRoot: projectRoot,
  // distDir gateado: el celu construye en otra carpeta (NEXT_DIST_DIR) y hace
  // swap atómico. En Vercel no se setea → ".next" normal.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Los source maps en build/servidor consumen mucha RAM. Con ~750 páginas
  // estáticas no los necesitamos para producción.
  productionBrowserSourceMaps: false,
  experimental: {
    // === Control de memoria en build y dev ===
    // El build prerenderiza 700+ productos + 47 categorías. Sin límites, Next
    // lanza un worker por core (10) y satura la RAM → el Mac entra en swap y
    // se congela. Estos topes mantienen el pico de memoria acotado.
    cpus: 4, // máx. workers de generación estática (en vez de 10)
    memoryBasedWorkersCount: true, // reduce workers si hay poca RAM libre
    staticGenerationMaxConcurrency: 4, // páginas en paralelo por worker
    staticGenerationMinPagesPerWorker: 50, // menos workers para el lote de páginas
    serverSourceMaps: false, // no generar source maps de servidor en build
    preloadEntriesOnStart: false, // el dev server no precarga todas las rutas en RAM
    imgOptConcurrency: 2, // limita procesos sharp al optimizar las 826 imágenes
  },
  images: {
    // En el celu (Termux) no hay `sharp`: con NO_IMAGE_OPT=1 se sirven sin
    // optimizar. En Vercel no se setea → optimiza normal.
    unoptimized: process.env.NO_IMAGE_OPT === "1",
    // Las imágenes ahora son self-host (/images/shop/...). Estos patrones
    // quedan por si alguna referencia remota se cuela tras re-scrapear.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "/s/files/**",
      },
      {
        protocol: "https",
        hostname: "regalosconamorcolombia.com",
        pathname: "/wp-content/uploads/**",
      },
    ],
  },
};

export default nextConfig;
