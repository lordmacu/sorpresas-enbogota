import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { SITE_NAME } from "@/lib/site";
import config from "@/data/config.json";

export const metadata: Metadata = {
  title: "Términos y condiciones",
  description: `Términos y condiciones de ${SITE_NAME}: pedidos por WhatsApp, pagos, entregas en Bogotá, cambios y devoluciones.`,
  alternates: { canonical: "/terminos" },
  robots: { index: true, follow: true },
};

export default function TerminosPage() {
  return (
    <LegalLayout titulo="Términos y condiciones" actualizado="Junio de 2026">
      <p>
        Al realizar un pedido con <strong>{SITE_NAME}</strong> aceptas los
        siguientes términos y condiciones. Te recomendamos leerlos antes de
        confirmar tu compra.
      </p>

      <h2>1. Pedidos</h2>
      <p>
        Los pedidos se coordinan por WhatsApp ({config.whatsapp}). Un pedido se
        considera confirmado una vez acordados el producto, la fecha y hora de
        entrega, la dirección y el pago correspondiente.
      </p>

      <h2>2. Precios y pagos</h2>
      <p>
        Todos los precios se expresan en pesos colombianos (COP) e incluyen los
        impuestos aplicables. El pago se realiza por los medios acordados al
        confirmar el pedido. Nos reservamos el derecho de actualizar precios sin
        previo aviso; el precio aplicable es el vigente al momento de confirmar.
      </p>

      <h2>3. Entregas</h2>
      <ul>
        <li>Realizamos entregas en Bogotá dentro de nuestro horario: {config.horario}.</li>
        <li>
          Las entregas el mismo día están sujetas a disponibilidad y a la hora
          de confirmación del pedido.
        </li>
        <li>
          Es responsabilidad del cliente proporcionar una dirección y datos de
          contacto correctos. Una dirección errónea puede generar costos o
          retrasos adicionales.
        </li>
      </ul>

      <h2>4. Productos</h2>
      <p>
        Trabajamos con productos frescos y naturales (flores, alimentos). Por
        ello, algunos artículos pueden variar levemente en color o presentación
        respecto a las fotos, conservando siempre una calidad y valor
        equivalentes.
      </p>

      <h2>5. Cambios y cancelaciones</h2>
      <p>
        Cualquier cambio o cancelación debe solicitarse con la mayor antelación
        posible por WhatsApp. Dado que muchos productos se preparan a pedido y
        son perecederos, las cancelaciones de último momento pueden no ser
        reembolsables.
      </p>

      <h2>6. Devoluciones</h2>
      <p>
        Si tu pedido presenta algún inconveniente de calidad, contáctanos el
        mismo día de la entrega y lo resolveremos. Por tratarse de productos
        perecederos y personalizados, las devoluciones se evalúan caso por caso.
      </p>

      <h2>7. Contacto</h2>
      <p>
        Para cualquier duda sobre estos términos, escríbenos a{" "}
        <a href={`mailto:${config.email}`}>{config.email}</a> o por WhatsApp al
        +57 {config.whatsapp}.
      </p>
    </LegalLayout>
  );
}
