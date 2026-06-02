import Link from "next/link";
import Image from "next/image";
import { ProductCard } from "@/components/ProductCard";
import { TestimonialCard } from "@/components/TestimonialCard";
import { JsonLd } from "@/components/JsonLd";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import categorias from "@/data/categorias.json";
import productos from "@/data/productos.json";
import testimonios from "@/data/testimonios.json";
import landings from "@/data/landings.json";
import guias from "@/data/guias.json";
import blog from "@/data/blog.json";
import config from "@/data/config.json";

const SHOWCASE_SLUGS = [
  "desayunos-sorpresas",
  "flores-rosas",
  "cumpleanos",
  "anchetas-de-cumpleanos",
  "fresas-con-chocolate",
  "amor",
];

export default function Home() {
  const arr = productos.productos;
  const catImg = (slug: string) =>
    categorias.categorias.find((c) => c.slug === slug)?.imagen || "";

  // Imágenes de hero generadas con IA (MiniMax image-01), estética editorial de marca.
  const heroDesayuno = "/images/hero/desayuno.webp";
  const heroFlores = "/images/hero/flores-1.webp";

  const bestSellers = arr.filter((p) => p.popular).slice(0, 8);
  const offers = arr
    .filter((p) => p.visible && p.precioAnterior && p.precioAnterior > p.precio)
    .slice(0, 4);

  const showcase = SHOWCASE_SLUGS.map((s) =>
    categorias.categorias.find((c) => c.slug === s)
  ).filter((c): c is NonNullable<typeof c> => Boolean(c));

  // Landings de ocasión/urgencia para la sección "Compra por ocasión" del home.
  // Acorta el h1 para usarlo como etiqueta corta (la URL conserva las keywords).
  const cortar = (t: string) =>
    t.replace(/ a domicilio en Bogotá$/i, "").replace(/ en Bogotá$/i, "").trim();
  const ocasiones = landings.landings
    .filter((l) => {
      const tipo = (l as { tipo?: string }).tipo;
      return tipo === "ocasion" || tipo === "urgencia";
    })
    .map((l) => ({
      slug: l.slug,
      etiqueta: cortar(l.h1),
      imagen: catImg((l as { ctaCategoria?: string }).ctaCategoria || "") || heroDesayuno,
    }));

  const guiasHome = guias.guias.slice(0, 3);
  const blogHome = blog.posts.slice(0, 3);
  const postImg = (slug: string) =>
    productos.productos.find((p) => p.slug === slug)?.imagen || "";

  const wa = (msg: string) =>
    `https://wa.me/57${config.whatsapp}?text=${encodeURIComponent(msg)}`;

  const websiteLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "es-CO",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/categorias/{search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <JsonLd data={websiteLd} />

      {/* ===================== HERO ===================== */}
      <section className="relative overflow-hidden bg-grain bg-gradient-to-b from-[#FBF3E8] via-[#FDFBF7] to-[#FDFBF7]">
        <div className="absolute -top-32 -right-24 w-[28rem] h-[28rem] bg-[#D4A574]/20 rounded-full blur-3xl" />
        <div className="absolute top-40 -left-32 w-[26rem] h-[26rem] bg-[#8B2635]/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 lg:pt-20 lg:pb-28">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Texto */}
            <div className="order-2 lg:order-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-sm border border-[#EBD9C2] rounded-full px-4 py-2 mb-7">
                <span className="w-2 h-2 bg-[#4A7C59] rounded-full animate-pulse-soft" />
                <span className="text-sm font-medium text-[#6B6560]">
                  Entrega el mismo día en Bogotá
                </span>
              </div>

              <h1 className="font-display text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-7xl font-bold text-[#2D2A26] text-balance mb-6">
                Sorpresas que cuentan
                <br className="hidden sm:block" />{" "}
                <span className="text-gradient-gold">una historia</span>
              </h1>

              <p className="text-lg sm:text-xl text-[#6B6560] leading-relaxed text-pretty max-w-xl mx-auto lg:mx-0 mb-9">
                Desayunos sorpresa, ramos de flores y detalles únicos, hechos a
                mano y entregados con amor en toda Bogotá.
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
                <Link href="/categorias" className="btn-primary text-base px-8 py-4 w-full sm:w-auto justify-center">
                  Explorar catálogo
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <a href={wa("Hola! Quiero hacer un pedido")} target="_blank" className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold px-8 py-4 rounded-full transition-all hover:-translate-y-0.5">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" />
                  </svg>
                  Pedir por WhatsApp
                </a>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-2 gap-y-2 mt-9 text-sm text-[#6B6560]">
                <span className="inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#4A7C59]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Flores frescas
                </span>
                <span className="divider-dot inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#4A7C59]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Empaque premium
                </span>
                <span className="divider-dot inline-flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-[#4A7C59]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                  Mensaje personalizado
                </span>
              </div>
            </div>

            {/* Composición de imágenes */}
            <div className="order-1 lg:order-2 relative mx-auto w-full max-w-md lg:max-w-none">
              {/* círculo decorativo */}
              <div className="absolute -inset-3 sm:-inset-5 rounded-[2.5rem] border border-[#D4A574]/30 hidden sm:block" />

              <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden ring-gold shadow-soft img-zoom">
                {heroDesayuno && (
                  <Image
                    src={heroDesayuno}
                    alt="Desayuno sorpresa a domicilio en Bogotá"
                    fill
                    priority
                    className="object-cover"
                    sizes="(max-width: 1024px) 90vw, 45vw"
                  />
                )}
              </div>

              {/* imagen secundaria superpuesta */}
              {heroFlores && (
                <div className="absolute -bottom-6 -left-5 sm:-left-8 w-32 sm:w-44 aspect-square rounded-2xl overflow-hidden ring-[5px] ring-white shadow-float img-zoom">
                  <Image
                    src={heroFlores}
                    alt="Ramo de flores a domicilio en Bogotá"
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 8rem, 11rem"
                  />
                </div>
              )}

              {/* chip flotante */}
              <div className="absolute -top-3 right-2 sm:-right-4 bg-white rounded-2xl shadow-float px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#4A7C59]/12 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#4A7C59]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <div className="leading-tight">
                  <p className="font-display font-semibold text-[#2D2A26] text-sm">Entrega hoy</p>
                  <p className="text-xs text-[#6B6560]">en toda Bogotá</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== CATEGORÍAS (showcase) ===================== */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="reveal-up flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10 lg:mb-14">
            <div>
              <p className="eyebrow mb-3">Explora</p>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2A26] text-balance">
                Un detalle para cada ocasión
              </h2>
            </div>
            <Link href="/categorias" className="text-[#8B2635] font-semibold hover:underline inline-flex items-center gap-2 shrink-0">
              Ver las {categorias.categorias.length} categorías
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {showcase.map((c, i) => (
              <Link
                key={c.id}
                href={`/categorias/${c.slug}`}
                className={`group relative overflow-hidden rounded-3xl img-zoom card-hover ${
                  i === 0 ? "col-span-2 lg:col-span-1 aspect-[16/11] lg:aspect-[3/4]" : "aspect-[3/4]"
                }`}
              >
                <Image
                  src={c.imagen}
                  alt={`Categoría ${c.nombre}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 tile-overlay" />
                <div className="absolute inset-x-0 bottom-0 p-5 lg:p-6">
                  <h3 className="font-display text-xl lg:text-2xl font-semibold text-white mb-1">
                    {c.nombre}
                  </h3>
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/85 group-hover:text-white transition-colors">
                    Ver colección
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== MÁS VENDIDOS ===================== */}
      {bestSellers.length > 0 && (
        <section className="py-16 lg:py-24 bg-[#FDFBF7]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="reveal-up text-center mb-12">
              <p className="eyebrow mb-3">Los favoritos</p>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2A26]">
                Los más regalados
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {bestSellers.map((producto) => (
                <ProductCard key={producto.id} producto={producto} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================== COMPRA POR OCASIÓN ===================== */}
      {ocasiones.length > 0 && (
        <section className="py-16 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="reveal-up text-center mb-12">
              <p className="eyebrow mb-3">¿Para qué ocasión?</p>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2A26]">
                Compra por ocasión
              </h2>
              <p className="text-[#6B6560] mt-4 max-w-2xl mx-auto">
                Encuentra el regalo perfecto según el momento que quieres celebrar, con entrega a domicilio en Bogotá.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
              {ocasiones.map((o) => (
                <Link
                  key={o.slug}
                  href={`/${o.slug}`}
                  className="group relative overflow-hidden rounded-2xl aspect-[4/3] img-zoom card-hover"
                >
                  {o.imagen && (
                    <Image
                      src={o.imagen}
                      alt={o.etiqueta}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    />
                  )}
                  <div className="absolute inset-0 tile-overlay" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="font-display text-base lg:text-lg font-semibold text-white leading-snug">
                      {o.etiqueta}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================== OFERTAS ===================== */}
      {offers.length > 0 && (
        <section className="py-16 lg:py-24 bg-gradient-to-b from-white to-[#F5E6D3]/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-12">
              <div className="reveal-up">
                <p className="eyebrow mb-3">Precios especiales</p>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2A26]">
                  En oferta esta semana
                </h2>
              </div>
              <Link href="/categorias/promociones" className="text-[#8B2635] font-semibold hover:underline flex items-center gap-2 shrink-0">
                Ver todas las ofertas
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {offers.map((producto) => (
                <ProductCard key={producto.id} producto={producto} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================== CÓMO FUNCIONA ===================== */}
      <section className="py-16 lg:py-24 bg-[#8B2635] text-white relative overflow-hidden bg-grain">
        <div className="absolute -bottom-32 -right-24 w-96 h-96 bg-[#D4A574]/15 rounded-full blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="eyebrow text-[#E2BE84] mb-3">Fácil y rápido</p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold">
              Sorprender es muy sencillo
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
            {[
              ["01", "Elige el regalo", "Explora nuestras categorías y encuentra el detalle perfecto para tu ocasión."],
              ["02", "Escríbenos por WhatsApp", "Confirma fecha, hora, dirección de entrega y tu mensaje personalizado."],
              ["03", "Recibe la sorpresa", "Entregamos con empaque premium en toda Bogotá. Tú disfrutas su reacción."],
            ].map(([n, t, d]) => (
              <div key={n} className="text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center font-display text-2xl font-bold text-[#E2BE84]">
                  {n}
                </div>
                <h3 className="font-display text-xl font-semibold mb-3">{t}</h3>
                <p className="text-white/70 text-sm leading-relaxed max-w-xs mx-auto">{d}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-14">
            <a href={wa("Hola! Quiero hacer un pedido")} target="_blank" className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold px-8 py-4 rounded-full transition-all hover:scale-105">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" /></svg>
              Hacer mi pedido ahora
            </a>
          </div>
        </div>
      </section>

      {/* ===================== TESTIMONIOS ===================== */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="reveal-up text-center mb-12">
            <p className="eyebrow mb-3">Lo que dicen nuestros clientes</p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2A26]">
              Historias que nos enorgullecen
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonios.testimonios.slice(0, 3).map((testimonio) => (
              <TestimonialCard key={testimonio.id} testimonio={testimonio} />
            ))}
          </div>
        </div>
      </section>

      {/* ===================== GUÍAS / IDEAS ===================== */}
      {guiasHome.length > 0 && (
        <section className="py-16 lg:py-24 bg-[#FDFBF7]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="reveal-up flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <p className="eyebrow mb-3">Inspiración</p>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2A26]">
                  Ideas para regalar
                </h2>
              </div>
              <Link href="/guias" className="text-[#8B2635] font-semibold hover:underline inline-flex items-center gap-2 shrink-0">
                Ver todas las guías
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {guiasHome.map((g) => (
                <Link
                  key={g.slug}
                  href={`/guias/${g.slug}`}
                  className="block bg-white rounded-2xl border border-[#F5E6D3] p-6 card-hover"
                >
                  <h3 className="font-display text-lg font-semibold text-[#2D2A26] mb-2 leading-snug">
                    {g.h1}
                  </h3>
                  <p className="text-sm text-[#6B6560] leading-relaxed">{g.excerpt}</p>
                  <span className="inline-flex items-center gap-1 text-[#8B2635] font-semibold text-sm mt-4">
                    Leer guía
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===================== DEL BLOG ===================== */}
      {blogHome.length > 0 && (
        <section className="py-16 lg:py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="reveal-up flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <p className="eyebrow mb-3">Del blog</p>
                <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2D2A26]">
                  Guías de regalos para cada ocasión
                </h2>
              </div>
              <Link href="/blog" className="text-[#8B2635] font-semibold hover:underline inline-flex items-center gap-2 shrink-0">
                Ver todo el blog
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {blogHome.map((post) => {
                const img = post.heroImagen || postImg(post.heroProductSlug);
                return (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group flex flex-col bg-white rounded-2xl overflow-hidden border border-[#F5E6D3] card-hover"
                  >
                    <div className="relative aspect-[16/10] img-zoom overflow-hidden bg-[#F5E6D3]/30">
                      {img && (
                        <Image src={img} alt={post.h1} fill className="object-cover" sizes="(max-width: 768px) 100vw, 33vw" />
                      )}
                      <span className="absolute top-3 left-3 inline-flex items-center rounded-full bg-white/90 text-[#8B2635] px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                        {post.etiqueta}
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-lg font-semibold text-[#2D2A26] mb-2 leading-snug group-hover:text-[#8B2635] transition-colors">
                        {post.h1}
                      </h3>
                      <p className="text-sm text-[#6B6560] leading-relaxed line-clamp-2">{post.excerpt}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ===================== CTA FINAL ===================== */}
      <section className="py-20 lg:py-28 bg-gradient-to-br from-[#2D2A26] via-[#3D3A36] to-[#2D2A26] text-white relative overflow-hidden bg-grain">
        <div className="absolute -top-24 -left-20 w-80 h-80 bg-[#8B2635]/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-20 w-80 h-80 bg-[#D4A574]/15 rounded-full blur-3xl" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="eyebrow text-[#E2BE84] mb-4">Haz que se sienta especial</p>
          <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 text-balance">
            Cada momento merece <span className="text-gradient-gold">ser celebrado</span>
          </h2>
          <p className="text-lg text-white/70 mb-10 max-w-xl mx-auto text-pretty">
            Regalos que no solo se dan, sino que se sienten. Sorpresas que crean
            recuerdos para toda la vida.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href={wa("Hola! Quiero hacer un pedido")} target="_blank" className="inline-flex items-center justify-center gap-2 w-full sm:w-auto bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold px-8 py-4 rounded-full transition-all hover:scale-105">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 1.758-1.688 0-.633-.252-1.195-.572-1.48z" /></svg>
              Escribir por WhatsApp
            </a>
            <Link href="/categorias" className="inline-flex items-center justify-center gap-2 w-full sm:w-auto border-2 border-white/30 hover:border-white text-white font-semibold px-8 py-4 rounded-full transition-all">
              Ver catálogo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
