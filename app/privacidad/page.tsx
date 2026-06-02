import type { Metadata } from "next";
import { LegalLayout } from "@/components/LegalLayout";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import config from "@/data/config.json";

export const metadata: Metadata = {
  title: "Política de privacidad",
  description: `Política de tratamiento de datos personales de ${SITE_NAME}. Cómo recolectamos, usamos y protegemos tu información al hacer pedidos en Bogotá.`,
  alternates: { canonical: "/privacidad" },
  robots: { index: true, follow: true },
};

export default function PrivacidadPage() {
  return (
    <LegalLayout titulo="Política de privacidad" actualizado="Junio de 2026">
      <p>
        En <strong>{SITE_NAME}</strong> valoramos tu confianza. Esta política
        explica cómo recolectamos, usamos y protegemos tus datos personales
        cuando interactúas con nosotros, en cumplimiento de la Ley 1581 de 2012
        (Habeas Data) y demás normas colombianas aplicables.
      </p>

      <h2>1. Responsable del tratamiento</h2>
      <p>
        {SITE_NAME}, con operación en {config.direccion}. Para cualquier
        solicitud relacionada con tus datos puedes escribirnos a{" "}
        <a href={`mailto:${config.email}`}>{config.email}</a> o por WhatsApp al{" "}
        +57 {config.whatsapp}.
      </p>

      <h2>2. Datos que recolectamos</h2>
      <p>
        Solo recolectamos la información necesaria para gestionar tu pedido y la
        entrega:
      </p>
      <ul>
        <li>Nombre de quien hace el pedido y de quien recibe la sorpresa.</li>
        <li>Número de teléfono y datos de contacto de WhatsApp.</li>
        <li>Dirección de entrega en Bogotá y datos de la ocasión.</li>
        <li>Mensaje personalizado que desees incluir con el regalo.</li>
      </ul>

      <h2>3. Finalidad del tratamiento</h2>
      <ul>
        <li>Coordinar, preparar y entregar tu pedido.</li>
        <li>Confirmar fecha, hora y dirección de entrega.</li>
        <li>Brindarte soporte y responder tus consultas.</li>
        <li>Enviarte información sobre tu pedido y, si lo autorizas, novedades.</li>
      </ul>

      <h2>4. Confidencialidad de las sorpresas</h2>
      <p>
        Tratamos cada pedido con discreción. No contactamos a la persona que
        recibe la sorpresa salvo lo estrictamente necesario para coordinar la
        entrega.
      </p>

      <h2>5. Conservación y seguridad</h2>
      <p>
        Conservamos tus datos únicamente durante el tiempo necesario para
        cumplir con las finalidades descritas y nuestras obligaciones legales.
        Aplicamos medidas razonables para proteger tu información frente a acceso
        no autorizado.
      </p>

      <h2>6. Tus derechos</h2>
      <p>
        Como titular, puedes conocer, actualizar, rectificar y solicitar la
        supresión de tus datos, así como revocar la autorización otorgada.
        Escríbenos a <a href={`mailto:${config.email}`}>{config.email}</a> para
        ejercer estos derechos.
      </p>

      <h2>7. Cambios a esta política</h2>
      <p>
        Podemos actualizar esta política en cualquier momento. La versión vigente
        siempre estará disponible en{" "}
        <a href={`${SITE_URL}/privacidad`}>{SITE_URL}/privacidad</a>.
      </p>
    </LegalLayout>
  );
}
