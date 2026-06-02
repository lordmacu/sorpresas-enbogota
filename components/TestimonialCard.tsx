import testimonioType from "@/data/testimonios.json";

interface TestimonialCardProps {
  testimonio: (typeof testimonioType.testimonios)[0];
}

export function TestimonialCard({ testimonio }: TestimonialCardProps) {
  return (
    <div className="testimonial-card">
      {/* Stars */}
      <div className="flex items-center gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${i < testimonio.rating ? "text-[#D4A574]" : "text-gray-300"}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>

      {/* Quote */}
      <blockquote className="text-[#2D2A26] text-sm leading-relaxed mb-4">
        &ldquo;{testimonio.texto}&rdquo;
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#8B2635] flex items-center justify-center">
          <span className="text-white font-semibold text-sm">
            {testimonio.nombre
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </span>
        </div>
        <div>
          <p className="font-semibold text-sm text-[#2D2A26]">{testimonio.nombre}</p>
          <p className="text-xs text-[#6B6560]">
            {testimonio.ciudad} · {testimonio.producto}
          </p>
        </div>
      </div>
    </div>
  );
}