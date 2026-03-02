const fs = require("fs");
const path = require("path");
const { jsPDF } = require("jspdf");

const outputPath = path.resolve(
  process.cwd(),
  "output/pdf/orbit-resumen-1-pagina.pdf"
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const doc = new jsPDF({
  orientation: "portrait",
  unit: "pt",
  format: "a4",
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 42;
const maxY = pageHeight - margin;
const contentWidth = pageWidth - margin * 2;
const bulletIndent = 12;

let y = margin;

function ensureSpace(requiredHeight, sectionLabel) {
  if (y + requiredHeight > maxY) {
    throw new Error(
      `Overflow en una pagina al renderizar "${sectionLabel}". y=${y}, requiere=${requiredHeight}, maxY=${maxY}`
    );
  }
}

function addTitle(text) {
  const fontSize = 18;
  const lineHeight = 22;
  ensureSpace(lineHeight + 8, "titulo");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  doc.text(text, margin, y);
  y += lineHeight + 2;
}

function addHeading(text) {
  const fontSize = 12;
  const lineHeight = 15;
  ensureSpace(lineHeight + 3, text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fontSize);
  doc.text(text, margin, y);
  y += lineHeight;
}

function addParagraph(text) {
  const fontSize = 9.8;
  const lineHeight = 12.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(text, contentWidth);
  ensureSpace(lines.length * lineHeight + 4, "parrafo");
  lines.forEach((line) => {
    doc.text(line, margin, y);
    y += lineHeight;
  });
  y += 3;
}

function addBullets(items) {
  const fontSize = 9.8;
  const lineHeight = 12.2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);

  items.forEach((item) => {
    const wrapped = doc.splitTextToSize(item, contentWidth - bulletIndent - 3);
    const needed = wrapped.length * lineHeight + 1;
    ensureSpace(needed, "bullet");
    doc.text("-", margin, y);
    wrapped.forEach((line, idx) => {
      doc.text(line, margin + bulletIndent, y + idx * lineHeight);
    });
    y += wrapped.length * lineHeight + 1;
  });

  y += 4;
}

addTitle("Orbit - Resumen de la app (1 pagina)");

addHeading("Que es");
addParagraph(
  "Orbit es una app web SaaS para entrenadores que tambien ofrece una experiencia separada para clientes. El producto centraliza seguimiento de entrenamiento, nutricion, check-ins y alertas en un solo flujo de trabajo."
);

addHeading("Para quien es");
addParagraph(
  "Persona principal: coach/entrenador que administra multiples asesorados (online y presencial) y necesita operar su seguimiento diario. Persona secundaria: cliente final que ejecuta su plan desde un dashboard propio."
);

addHeading("Que hace (features clave)");
addBullets([
  "Autenticacion con Supabase y flujo de invitacion de clientes por email con callback de cuenta.",
  "Onboarding por rol: setup para coach y wizard de onboarding para cliente.",
  "Dashboard del coach con metricas, alertas urgentes, cumplimiento, retencion y milestones semanales.",
  "Gestion de clientes: perfil, check-ins con medidas/fotos, historial y asignacion de planes de entrenamiento y comida.",
  "App del cliente con rutina del dia, check-in, progreso semanal y plan de nutricion.",
  "Analisis de foto de comida con IA (Gemini) para extraer macros e ingredientes con rate limiting.",
  "Notificaciones in-app y push web (suscripciones, preferencias, Edge Function de envio).",
]);

addHeading("Como funciona (arquitectura compacta)");
addBullets([
  "Frontend: Next.js App Router (grupos de rutas para auth, dashboard coach y dashboard cliente en src/app).",
  "Capa de negocio: Server Components + Server Actions que ejecutan consultas y mutaciones.",
  "Datos: Supabase Postgres + Storage + RLS, con esquema versionado en supabase/migrations.",
  "Sesion y autorizacion: middleware global refresca sesion y redirige por estado/rol.",
  "Flujo de notificaciones: createNotification inserta en notifications; webhook DB dispara supabase/functions/push; se envia Web Push a endpoints en push_subscriptions.",
  "Arquitectura de infraestructura (red, colas, observabilidad, topologia cloud): Not found in repo.",
]);

addHeading("Como correrlo (minimo)");
addBullets([
  "Instalar dependencias: npm install",
  "Crear .env.local con claves requeridas vistas en codigo: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.",
  "Si se usa push: agregar NEXT_PUBLIC_VAPID_PUBLIC_KEY/VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY. Si se usa IA de comidas: GEMINI_API_KEY.",
  "Levantar entorno local: npm run dev",
  "Abrir http://localhost:3000",
  "Guia oficial para levantar Supabase local (comandos exactos): Not found in repo.",
]);

if (y > maxY) {
  throw new Error(`El contenido excede la pagina. y=${y}, maxY=${maxY}`);
}

const pages = doc.getNumberOfPages();
if (pages !== 1) {
  throw new Error(`Se esperaban 1 pagina y se generaron ${pages}`);
}

const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
fs.writeFileSync(outputPath, pdfBuffer);

console.log(JSON.stringify({ outputPath, pages, finalY: y, maxY }, null, 2));
