import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { SITE_NAME } from "@/lib/site";
import config from "@/data/config.json";

export const metadata: Metadata = {
  title: "Política de devoluciones",
  description: `Política de devoluciones y reembolsos de ${SITE_NAME}: qué hacer si tu regalo llega dañado, incorrecto o con algún inconveniente de calidad en Bogotá.`,
  alternates: { canonical: "/devoluciones" },
  robots: { index: true, follow: true },
};

export default function DevolucionesPage() {
  return (
    <LegalLayout titulo="Política de devoluciones" actualizado="Junio de 2026">
      <p>
        En <strong>{SITE_NAME}</strong> queremos que cada sorpresa llegue
        perfecta. Si algo no sale como esperabas, esta política explica cómo lo
        resolvemos.
      </p>

      <h2>1. Plazo para reportar</h2>
      <p>
        Por tratarse de productos frescos y perecederos (flores, alimentos,
        desayunos), pedimos que cualquier inconveniente se reporte{" "}
        <strong>el mismo día de la entrega, dentro de las primeras 24 horas</strong>.
        Pasado ese plazo no podemos garantizar la reposición.
      </p>

      <h2>2. Qué cubrimos</h2>
      <p>Reponemos el producto o hacemos el reembolso cuando:</p>
      <ul>
        <li>El pedido llegó <strong>dañado o en mal estado</strong>.</li>
        <li>Recibiste un <strong>producto equivocado</strong> o incompleto.</li>
        <li>Hubo un <strong>problema de calidad</strong> atribuible a nosotros.</li>
      </ul>
      <p>
        En estos casos, a tu elección, <strong>reemplazamos el producto sin costo</strong> o
        te <strong>devolvemos tu dinero</strong>.
      </p>

      <h2>3. Qué no aplica para devolución</h2>
      <ul>
        <li>
          Productos <strong>personalizados o hechos a pedido</strong> que se
          entregaron correctos y en buen estado.
        </li>
        <li>
          Variaciones leves de color, flores o presentación respecto a la foto,
          propias de productos naturales y artesanales (siempre conservando una
          calidad y valor equivalentes).
        </li>
        <li>
          Entregas fallidas por <strong>dirección o datos de contacto
          incorrectos</strong> proporcionados por el cliente.
        </li>
      </ul>

      <h2>4. Cómo solicitar una devolución</h2>
      <p>
        Escríbenos por WhatsApp al +57 {config.whatsapp} o a{" "}
        <a href={`mailto:${config.email}`}>{config.email}</a> con tu número de
        pedido y, de ser posible, una <strong>foto del producto</strong>. Revisamos
        cada caso de forma rápida y personal.
      </p>

      <h2>5. Reembolsos</h2>
      <p>
        Una vez aprobada la devolución, el reembolso se realiza por el{" "}
        <strong>mismo medio de pago</strong> usado en la compra. El tiempo de
        acreditación depende de tu banco o medio de pago, normalmente entre{" "}
        <strong>5 y 10 días hábiles</strong>.
      </p>

      <h2>6. Cambios y cancelaciones</h2>
      <p>
        Si necesitas cambiar o cancelar un pedido, contáctanos con la mayor
        antelación posible. Como muchos productos se preparan a pedido y son
        perecederos, las cancelaciones de último momento pueden no ser
        reembolsables.
      </p>

      <h2>7. Contacto</h2>
      <p>
        Para cualquier duda sobre devoluciones, escríbenos a{" "}
        <a href={`mailto:${config.email}`}>{config.email}</a> o por WhatsApp al
        +57 {config.whatsapp}. Estamos para ayudarte.
      </p>
    </LegalLayout>
  );
}
